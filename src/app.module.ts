import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AlertsModule } from './alerts/alerts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { PaymentsModule } from './payments/payments.module';
import { IncidentsModule } from './incidents/incidents.module';
import { InvitationsModule } from './invitations/invitations.module';
import { MotosModule } from './motos/motos.module';
import { DriverModule } from './driver/driver.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    AdminModule,
    AlertsModule,
    TransactionsModule,
    PaymentsModule,
    IncidentsModule,
    InvitationsModule,
    MotosModule,
    DriverModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
