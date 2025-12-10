import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken';

import dbConnect from '@/src/lib/database';
import UserModel, { type UserAddress } from '@/src/lib/models/user';
import SchoolModel from '@/src/lib/models/school';
import { Types } from 'mongoose';
import AppSettingsModel from '@/src/lib/models/appSettings';

const JWT_SECRET: Secret | undefined = process.env.JWT_SECRET;

type AccessTokenPayload = JwtPayload & Record<string, unknown>;

type RegisterAddressInput = {
  cep: string;
  street: string;
  number?: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
};

export interface RegisterUserPayload {
  name: string;
  email: string;
  password: string;
  cpf: string;
  birthDate: string;
  address: RegisterAddressInput;
  provider?: 'credentials' | 'google';
  role?: 'user' | 'admin';
  children?: Array<{ name: string; age: number; schoolId: string }>;
  // optional single student payload, mapped to children
  student?: { name: string; age: number; schoolId: string };
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeCpf(cpf: string): string {
  return normalizeDigits(cpf);
}

export function isValidCpf(cpf: string): boolean {
  const digits = normalizeCpf(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const calcCheckDigit = (slice: number): number => {
    const sum = digits
      .slice(0, slice)
      .split('')
      .reduce((acc, digit, index) => acc + parseInt(digit, 10) * (slice + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const check1 = calcCheckDigit(9);
  const check2 = calcCheckDigit(10);

  return check1 === Number(digits[9]) && check2 === Number(digits[10]);
}

function normalizeCep(cep: string): string {
  return normalizeDigits(cep);
}

function sanitizeAddress(address: RegisterAddressInput): UserAddress {
  const cep = normalizeCep(address.cep);
  if (cep.length !== 8) {
    throw new Error('CEP inválido.');
  }

  const street = address.street?.trim();
  const district = address.district?.trim();
  const city = address.city?.trim();
  const state = address.state?.trim().toUpperCase();

  if (!street || !district || !city || !state) {
    throw new Error('Endereço incompleto.');
  }

  return {
    cep,
    street,
    district,
    city,
    state,
    number: address.number?.trim() || undefined,
    complement: address.complement?.trim() || undefined,
  };
}

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
  if (!JWT_SECRET) {
    throw new Error('Missing JWT_SECRET environment variable.');
  }
  const options: SignOptions = {};
  options.expiresIn = expiresIn as SignOptions['expiresIn'];
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyAccessToken<T extends JwtPayload = JwtPayload>(token: string): T {
  if (!JWT_SECRET) {
    throw new Error('Missing JWT_SECRET environment variable.');
  }
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

export async function registerUser(data: RegisterUserPayload) {
  await dbConnect();

  const existing = await UserModel.findOne({ email: data.email }).lean().exec();
  if (existing) {
    throw new Error('Email already registered.');
  }

  if (!isValidCpf(data.cpf)) {
    throw new Error('CPF inválido.');
  }

  const normalizedCpf = normalizeCpf(data.cpf);

  const existingCpf = await UserModel.findOne({ cpf: normalizedCpf }).lean().exec();
  if (existingCpf) {
    throw new Error('CPF já cadastrado.');
  }

  const parsedBirthDate = new Date(data.birthDate);
  if (Number.isNaN(parsedBirthDate.getTime())) {
    throw new Error('Data de nascimento inválida.');
  }
  const today = new Date();
  if (parsedBirthDate > today) {
    throw new Error('Data de nascimento no futuro não é permitida.');
  }

  const sanitizedAddress = sanitizeAddress(data.address);

  // Validate children array or single student (optional) with max limit and school existence
  let children: Array<{ name: string; age: number; schoolId: string }> = [];
  // if single student provided, normalize to children array
  if (!Array.isArray(data.children) || data.children.length === 0) {
    if (data.student && data.student.name && data.student.schoolId) {
      children = [
        {
          name: data.student.name,
          age: Number(data.student.age),
          schoolId: data.student.schoolId,
        },
      ];
    }
  }
  if (Array.isArray(data.children) && data.children.length > 0) {
    const settings = (await AppSettingsModel.findOne().lean().exec()) ?? { maxChildrenPerUser: 7 };
    const maxChildren = Number(settings.maxChildrenPerUser) || 7;

    const totalChildren = data.children.length + (children.length ?? 0);
    if (totalChildren > maxChildren) {
      throw new Error(`Número de crianças excede o limite de ${maxChildren}.`);
    }

    // Basic shape validation and school existence check
    for (const child of data.children) {
      const name = child?.name?.trim();
      const age = Number(child?.age);
      const schoolId = child?.schoolId?.toString();
      if (!name) {
        throw new Error('Nome da criança é obrigatório.');
      }
      if (!Number.isFinite(age) || age < 0 || !Number.isInteger(age)) {
        throw new Error('Idade da criança inválida.');
      }
      if (!schoolId) {
        throw new Error('Escola da criança é obrigatória.');
      }
      const schoolExists = await SchoolModel.exists({ _id: schoolId });
      if (!schoolExists) {
        throw new Error('Escola selecionada não está cadastrada.');
      }
    }
    children = [
      ...(children ?? []),
      ...data.children.map(c => ({
      name: c.name.trim(),
      age: Number(c.age),
      schoolId: c.schoolId,
      })),
    ];
  }

  const hashedPassword = await hashPassword(data.password);

  const user = await UserModel.create({
    name: data.name,
    email: data.email,
    password: hashedPassword,
    provider: data.provider ?? 'credentials',
    role: data.role ?? 'user',
    verified: data.provider === 'google',
    cpf: normalizedCpf,
    birthDate: parsedBirthDate,
    address: sanitizedAddress,
    children: children.map(c => ({
      name: c.name,
      age: c.age,
      schoolId: new Types.ObjectId(c.schoolId),
    })),
  });

  const token = generateAccessToken({ sub: user._id.toString(), role: user.role });

  return { user: user.toObject(), token };
}

export async function loginWithGoogle(profile: { email?: string; name?: string; sub?: string }) {
  if (!profile.email) {
    throw new Error('Google profile missing email.');
  }

  await dbConnect();

  let user = await UserModel.findOne({ email: profile.email }).exec();

  if (!user) {
    const placeholderPassword = profile.sub
      ? await hashPassword(profile.sub)
      : await hashPassword('google-auth');
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
