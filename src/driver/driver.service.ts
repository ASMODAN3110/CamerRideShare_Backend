import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PaymentStatus, PaymentType, IncidentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OVERDUE_DAYS, DEFAULT_WEEKLY_VERSEMENT } from '../common/utils/dashboard.utils';

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

  async getProgress(userId: number) {
    const moto = await this.prisma.moto.findFirst({
      where: { driverId: userId },
    });

    let proprietePct = 0;
    let resteAPayer = 0;

    if (moto && moto.targetAmount > 0) {
      proprietePct = Math.min(
        100,
        Math.round((moto.financedAmount / moto.targetAmount) * 100),
      );
      resteAPayer = moto.targetAmount - moto.financedAmount;
    }

    const lastPayment = await this.prisma.payment.findFirst({
      where: { driverId: userId },
      orderBy: { createdAt: 'desc' },
    });

    let prochainPaiementJours = 0;
    let estAJour = false;

    if (lastPayment) {
      const now = new Date();
      const lastPaymentDate = new Date(lastPayment.createdAt);
      const diffMs = now.getTime() - lastPaymentDate.getTime();
      const daysSinceLastPayment = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      prochainPaiementJours = Math.max(0, 7 - daysSinceLastPayment);
      estAJour = daysSinceLastPayment <= OVERDUE_DAYS;
    }

    return { proprietePct, resteAPayer, prochainPaiementJours, estAJour };
  }

  async getPayments(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { driverId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where: { driverId: userId } }),
    ]);

    const data = payments.map((p) => ({
      id: String(p.id),
      date: p.createdAt.toISOString(),
      libelle:
        p.amount === DEFAULT_WEEKLY_VERSEMENT ? 'Hebdomadaire' : 'Exceptionnel',
      montant: p.amount,
      mode: 'Orange Money',
      status: p.status === PaymentStatus.VERIFIED ? 'Validé' : 'En attente',
    }));

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getPaymentSummary(userId: number) {
    const [moto, paymentsAgg] = await Promise.all([
      this.prisma.moto.findFirst({ where: { driverId: userId } }),
      this.prisma.payment.aggregate({
        where: { driverId: userId, type: PaymentType.PAYMENT, status: PaymentStatus.VERIFIED },
        _sum: { amount: true },
      }),
    ]);

    const totalPaye = paymentsAgg._sum.amount ?? 0;
    const totalDu = moto?.targetAmount ?? 0;
    const resteAPayer = Math.max(0, totalDu - totalPaye);

    const dernierPaiement = await this.prisma.payment.findFirst({
      where: { driverId: userId, type: PaymentType.PAYMENT },
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalPaye,
      totalDu,
      resteAPayer,
      dernierVersement: dernierPaiement
        ? { montant: dernierPaiement.amount, date: dernierPaiement.createdAt.toISOString() }
        : null,
    };
  }

  async createReport(userId: number, description: string, categorie: string, photoUrl: string | null) {
    const incident = await this.prisma.incident.create({
      data: { driverId: userId, description, type: categorie, photoUrl, status: IncidentStatus.OPEN },
    });
    return { id: incident.id, status: incident.status };
  }

  async deletePayment(userId: number, paymentId: number) {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, driverId: userId } });
    if (!payment) throw new NotFoundException('Paiement introuvable');
    await this.prisma.payment.delete({ where: { id: paymentId } });
    return { success: true };
  }

  async getFaq() {
    return [
      {
        id: 1,
        question: 'Comment payer par MoMo / OM ?',
        answer: 'Rendez-vous dans la section "Paiements" de votre application. Choisissez votre mode de paiement (Orange Money ou MTN Mobile Money) et suivez les instructions. Un versement hebdomadaire de 15 000 FCFA vous sera demandé.',
      },
      {
        id: 2,
        question: 'Que faire en cas de panne mécanique ?',
        answer: "Contactez immédiatement notre service support via le bouton \"Signaler un problème\" dans l'application. Un technicien vous contactera sous 24h. Vous pouvez aussi appeler le +237 000 000 000.",
      },
      {
        id: 3,
        question: 'Quand recevrai-je le titre de propriété ?',
        answer: 'Le titre de propriété vous sera transféré dès que le montant total de la moto sera remboursé. Vous recevrez une notification et les documents par email.',
      },
      {
        id: 4,
        question: 'Puis-je changer mon mot de passe ?',
        answer: 'Oui, allez dans Paramètres depuis le menu latéral, puis cliquez sur "Modifier le mot de passe". Entrez votre mot de passe actuel puis le nouveau.',
      },
    ];
  }

  async getSupportConfig() {
    return { whatsapp: '237000000000', phone: '+237000000000' };
  }

  // ─── 3. Paramètres (notifications + langue) ─────────────────────────────────

  async getSettings(userId: number) {
    let settings = await this.prisma.driverSettings.findUnique({ where: { driverId: userId } });
    if (!settings) {
      settings = await this.prisma.driverSettings.create({
        data: { driverId: userId },
      });
    }
    return {
      smsAlerts: settings.smsAlerts,
      pushNotifications: settings.pushNotifications,
      paymentReminders: settings.paymentReminders,
      language: settings.language as 'fr' | 'en',
    };
  }

  async updateSettings(userId: number, data: {
    smsAlerts?: boolean;
    pushNotifications?: boolean;
    paymentReminders?: boolean;
    language?: 'fr' | 'en';
  }) {
    await this.prisma.driverSettings.upsert({
      where: { driverId: userId },
      update: data,
      create: { driverId: userId, ...data },
    });
    return { success: true };
  }

  // ─── 4. Modification du profil ──────────────────────────────────────────────

  async updateProfile(userId: number, data: { fullName?: string; email?: string; phoneNumber?: string }) {
    if (data.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    }
    if (data.phoneNumber) {
      const existing = await this.prisma.user.findUnique({ where: { phoneNumber: data.phoneNumber } });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, fullName: true, email: true, phoneNumber: true },
    });

    return user;
  }

  // ─── 5. Changement de mot de passe ─────────────────────────────────────────

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Mot de passe actuel incorrect');

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }

  // ─── 6. Activation 2FA (mock) ──────────────────────────────────────────────

  async enable2FA(userId: number, phoneNumber: string) {
    // Pour le moment, on simule l'envoi d'un code par SMS
    // Dans une version future, intégrer un vrai service SMS (Twilio, etc.)
    return { success: true, message: 'Code envoyé par SMS' };
  }
}
