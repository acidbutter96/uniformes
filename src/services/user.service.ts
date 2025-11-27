import dbConnect from '@/src/lib/database';
import UserModel, { type UserDocument } from '@/src/lib/models/user';

export async function findByEmail(email: string) {
    await dbConnect();
    return UserModel.findOne({ email }).exec();
}

export async function createUser(data: {
    name: string;
    email: string;
    password: string;
    role?: 'user' | 'admin';
    provider?: 'credentials' | 'google';
    verified?: boolean;
}) {
    await dbConnect();
    return UserModel.create({
        ...data,
        role: data.role ?? 'user',
        provider: data.provider ?? 'credentials',
        verified: data.verified ?? false,
    });
}

export async function updateUser(id: string, updates: Partial<UserDocument>) {
    await dbConnect();
    return UserModel.findByIdAndUpdate(id, updates, { new: true }).exec();
}

export async function getAll() {
    await dbConnect();
    return UserModel.find().sort({ createdAt: -1 }).lean().exec();
}

export async function getById(id: string) {
    await dbConnect();
    return UserModel.findById(id).exec();
}

export async function promoteToAdmin(id: string) {
    await dbConnect();
    return UserModel.findByIdAndUpdate(id, { role: 'admin' }, { new: true }).exec();
}
