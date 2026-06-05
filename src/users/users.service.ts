import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '@prisma/client';

/** Champs sélectionnables pour les réponses API (sans le passwordHash). */
const USER_PUBLIC_SELECT = {
    id: true,
    email: true,
    fullName: true,
    role: true,
    phoneNumber: true,
    avatarUrl: true,
    createdAt: true,
    updatedAt: true,
} as const;

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createUserDto: CreateUserDto): Promise<User> {
        if (createUserDto.email) {
            const existingUser = await this.prisma.user.findUnique({
                where: { email: createUserDto.email },
            });

            if (existingUser) {
                throw new ConflictException('Email already exists');
            }
        }

        const existingPhone = await this.prisma.user.findUnique({
            where: { phoneNumber: createUserDto.phoneNumber },
        });

        if (existingPhone) {
            throw new ConflictException('Phone number already exists');
        }

        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(createUserDto.password, salt);

        // Remove password from dto and use hash
        const { password, ...userData } = createUserDto;

        return this.prisma.user.create({
            data: {
                ...userData,
                passwordHash,
            },
        });
    }

    /** Retourne tous les utilisateurs sans le mot de passe. */
    async findAll(): Promise<User[]> {
        // @ts-expect-error — Prisma n'exporte pas le type du select partiel
        return this.prisma.user.findMany({ select: USER_PUBLIC_SELECT });
    }

    /** Retourne uniquement les chauffeurs, sans le mot de passe. */
    async findDrivers() {
        return this.prisma.user.findMany({
            where: { role: UserRole.DRIVER },
            select: USER_PUBLIC_SELECT,
        });
    }

    async findOne(id: number): Promise<User> {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return user;
    }

    async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { phoneNumber },
        });
    }

    async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
        await this.findOne(id); // Check existence

        let dataToUpdate: any = { ...updateUserDto };

        if (updateUserDto.password) {
            const salt = await bcrypt.genSalt();
            const passwordHash = await bcrypt.hash(updateUserDto.password, salt);
            delete dataToUpdate.password;
            dataToUpdate.passwordHash = passwordHash;
        }

        return this.prisma.user.update({
            where: { id },
            data: dataToUpdate,
        });
    }

    async remove(id: number): Promise<void> {
        await this.findOne(id); // Check existence
        await this.prisma.user.delete({
            where: { id },
        });
    }
}
