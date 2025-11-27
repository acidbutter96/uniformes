import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken';

import dbConnect from '@/src/lib/database';
import UserModel, { type UserDocument } from '@/src/lib/models/user';

const secret = process.env.JWT_SECRET;

if (!secret) {
    throw new Error('Missing JWT_SECRET environment variable.');
}

const JWT_SECRET: Secret = secret;

type AccessTokenPayload = JwtPayload & Record<string, unknown>;

export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

export function comparePassword(password: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(password, hashed);
}

export function generateAccessToken(
    payload: AccessTokenPayload,
    expiresIn: string | number = '1h',
): string {
    const options: SignOptions = {};
    options.expiresIn = expiresIn as SignOptions['expiresIn'];
    return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyAccessToken<T extends JwtPayload = JwtPayload>(token: string): T {
    return jwt.verify(token, JWT_SECRET) as T;
}

export async function loginWithCredentials(email: string, password: string) {
    await dbConnect();

    const user = await UserModel.findOne({ email }).exec();
    if (!user) {
        throw new Error('Invalid credentials.');
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
        throw new Error('Invalid credentials.');
    }

    const token = generateAccessToken({ sub: user._id.toString(), role: user.role });

    return {
        user: user.toObject(),
        token,
    };
}

export async function registerUser(data: {
    name: string;
    email: string;
    password: string;
    provider?: 'credentials' | 'google';
    role?: 'user' | 'admin';
}) {
    await dbConnect();

    const existing = await UserModel.findOne({ email: data.email }).lean().exec();
    if (existing) {
        throw new Error('Email already registered.');
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await UserModel.create({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        provider: data.provider ?? 'credentials',
        role: data.role ?? 'user',
        verified: data.provider === 'google',
    });

    const token = generateAccessToken({ sub: user._id.toString(), role: user.role });

    return { user: user.toObject(), token };
}

export async function loginWithGoogle(profile: {
    email?: string;
    name?: string;
    sub?: string;
}) {
    if (!profile.email) {
        throw new Error('Google profile missing email.');
    }

    await dbConnect();

    let user = await UserModel.findOne({ email: profile.email }).exec();

    if (!user) {
        const placeholderPassword = profile.sub ? await hashPassword(profile.sub) : await hashPassword('google-auth');
        user = await UserModel.create({
            name: profile.name ?? profile.email.split('@')[0],
            email: profile.email,
            password: placeholderPassword,
            provider: 'google',
            verified: true,
        });
    }

    const token = generateAccessToken({ sub: user._id.toString(), role: user.role });

    return { user: user.toObject(), token };
}
