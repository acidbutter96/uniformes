import 'dotenv/config';

import mongoose from 'mongoose';

import dbConnect from '@/src/lib/database';
import UserModel from '@/src/lib/models/user';
import { hashPassword } from '@/src/services/auth.service';

interface SeedUser {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'user';
    provider?: 'credentials' | 'google';
    verified?: boolean;
    resetPassword?: boolean;
}

const seedUsers: SeedUser[] = [
    {
        name: 'Admin Principal',
        email: 'admin@uniformes.com',
        password: 'Admin@123',
        role: 'admin',
        provider: 'credentials',
        verified: true,
        resetPassword: true,
    },
    {
        name: 'Coordenadora Pedagógica',
        email: 'coordenadora@uniformes.com',
        password: 'User@123',
        role: 'user',
        provider: 'credentials',
        verified: true,
        resetPassword: true,
    },
    {
        name: 'Diretor de Escola',
        email: 'diretor@uniformes.com',
        password: 'User@123',
        role: 'user',
        provider: 'google',
        verified: true,
        resetPassword: false,
    },
];

async function upsertUser(user: SeedUser) {
    const existing = await UserModel.findOne({ email: user.email }).exec();
    if (existing) {
        let changed = false;

        if (existing.role !== user.role) {
            existing.role = user.role;
            changed = true;
        }

        if (user.provider && existing.provider !== user.provider) {
            existing.provider = user.provider;
            changed = true;
        }

        if (typeof user.verified === 'boolean' && existing.verified !== user.verified) {
            existing.verified = user.verified;
            changed = true;
        }

        if (user.resetPassword) {
            existing.password = await hashPassword(user.password);
            changed = true;
        }

        if (changed) {
            await existing.save();
            console.log(`Updated ${user.email}`);
        } else {
            console.log(`Skipped ${user.email} (no changes)`);
        }

        return;
    }

    const hashedPassword = await hashPassword(user.password);
    await UserModel.create({
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        provider: user.provider ?? 'credentials',
        verified: user.verified ?? false,
    });
    console.log(`Created ${user.email}`);
}

async function seed() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is not set.');
    }

    await dbConnect();

    for (const user of seedUsers) {
        await upsertUser(user);
    }
}

seed()
    .then(async () => {
        await mongoose.disconnect();
        console.log('Seed completed successfully.');
    })
    .catch(async error => {
        console.error('Seed failed:', error);
        await mongoose.disconnect();
        process.exitCode = 1;
    });
