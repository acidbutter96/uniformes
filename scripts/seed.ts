import 'dotenv/config';

import mongoose, { Types } from 'mongoose';

import dbConnect from '@/src/lib/database';
import ReservationModel from '@/src/lib/models/reservation';
import SchoolModel, { type SchoolStatus } from '@/src/lib/models/school';
import SupplierModel from '@/src/lib/models/supplier';
import UniformModel from '@/src/lib/models/uniform';
import UserModel from '@/src/lib/models/user';
import { hashPassword } from '@/src/services/auth.service';
import type { UniformCategory, UniformGender, UniformItemKind } from '@/src/types/uniform';

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user' | 'supplier';
  provider?: 'credentials' | 'google';
  verified?: boolean;
  resetPassword?: boolean;
  supplierKey?: string;
  cpf?: string;
  address?: {
    cep: string;
    street: string;
    number?: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
  };
}

interface SeedSchool {
  key: string;
  name: string;
  city: string;
  students: number;
  status: SchoolStatus;
}

interface SeedSupplier {
  key: string;
  name: string;
  specialty: string;
  leadTimeDays: number;
  rating: number;
  contactEmail?: string;
  phone?: string;
  schoolKeys: string[];
  status?: 'active' | 'pending' | 'inactive' | 'suspended';
}

interface SeedUniform {
  key: string;
  name: string;
  description?: string;
  supplierKey: string;
  category: UniformCategory;
  gender: UniformGender;
  price: number;
  sizes?: string[];
  items?: {
    kind: UniformItemKind;
    quantity: number;
    sizes: string[];
  }[];
  imageSrc?: string;
  imageAlt?: string;
}

function normalizeSizes(sizes: unknown): string[] {
  if (!Array.isArray(sizes)) return [];
  const normalized = sizes.map(value => String(value).trim()).filter(Boolean);
  return Array.from(new Set(normalized));
}

function deriveLegacySizesFromItems(items: SeedUniform['items'] | undefined, legacy: string[]) {
  if (legacy.length > 0) return legacy;
  const fromItems = items?.flatMap(item => normalizeSizes(item.sizes)) ?? [];
  return Array.from(new Set(fromItems));
}

interface SeedReservation {
  userName: string;
  userEmail: string;
  schoolKey: string;
  uniformKey: string;
  suggestedSize: string;
  measurements: {
    age: number;
    height: number;
    weight: number;
    chest: number;
    waist: number;
    hips: number;
  };
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
    cpf: '11111111111',
    address: {
      cep: '01001-000',
      street: 'Praça da Sé',
      number: '100',
      district: 'Sé',
      city: 'São Paulo',
      state: 'SP',
    },
  },
  {
    name: 'Coordenadora Pedagógica',
    email: 'coordenadora@uniformes.com',
    password: 'User@123',
    role: 'user',
    provider: 'credentials',
    verified: true,
    resetPassword: true,
    cpf: '22222222222',
    address: {
      cep: '30110-012',
      street: 'Avenida Afonso Pena',
      number: '500',
      district: 'Centro',
      city: 'Belo Horizonte',
      state: 'MG',
    },
  },
  {
    name: 'Diretor de Escola',
    email: 'diretor@uniformes.com',
    password: 'User@123',
    role: 'user',
    provider: 'google',
    verified: true,
    resetPassword: false,
    cpf: '33333333333',
    address: {
      cep: '80010-000',
      street: 'Rua XV de Novembro',
      number: '1200',
      district: 'Centro',
      city: 'Curitiba',
      state: 'PR',
    },
  },
  {
    name: 'Fornecedor Demo',
    email: 'fornecedor@uniformes.com',
    password: 'Supplier@123',
    role: 'supplier',
    provider: 'credentials',
    verified: true,
    resetPassword: true,
    supplierKey: 'atelier-uniformes',
    cpf: '44444444444',
    address: {
      cep: '90010-320',
      street: 'Rua dos Andradas',
      number: '50',
      district: 'Centro Histórico',
      city: 'Porto Alegre',
      state: 'RS',
    },
  },
];

const seedSchools: SeedSchool[] = [
  {
    key: 'col-horizonte-azul',
    name: 'Colégio Horizonte Azul',
    city: 'São Paulo',
    students: 820,
    status: 'ativo',
  },
  {
    key: 'esc-municipal-aurora',
    name: 'Escola Municipal Aurora',
    city: 'Belo Horizonte',
    students: 410,
    status: 'pendente',
  },
  {
    key: 'inst-vale-verde',
    name: 'Instituto Vale Verde',
    city: 'Curitiba',
    students: 610,
    status: 'ativo',
  },
  {
    key: 'col-porto-seguro',
    name: 'Colégio Porto Seguro',
    city: 'Porto Alegre',
    students: 530,
    status: 'inativo',
  },
];

const seedSuppliers: SeedSupplier[] = [
  {
    key: 'atelier-uniformes',
    name: 'Ateliê Uniformes',
    specialty: 'Tecidos sustentáveis',
    leadTimeDays: 18,
    rating: 4.6,
    contactEmail: 'contato@atelieruniformes.com',
    phone: '+55 11 98888-0001',
    schoolKeys: ['col-horizonte-azul', 'inst-vale-verde'],
  },
  {
    key: 'costura-brasil',
    name: 'Costura Brasil',
    specialty: 'Sublimação personalizada',
    leadTimeDays: 12,
    rating: 4.3,
    contactEmail: 'pedidos@costurabrasil.com',
    phone: '+55 11 98888-0002',
    schoolKeys: ['esc-municipal-aurora', 'col-porto-seguro'],
  },
];

const seedUniforms: SeedUniform[] = [
  {
    key: 'camiseta-escolar-basica',
    name: 'Camiseta Escolar',
    description: 'Malha leve com gola reforçada e manga curta.',
    supplierKey: 'atelier-uniformes',
    category: 'escolar',
    gender: 'unissex',
    price: 49.9,
    items: [
      {
        kind: 'camiseta',
        quantity: 1,
        sizes: ['PP', 'P', 'M', 'G'],
      },
    ],
    imageSrc:
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Camiseta escolar dobrada',
  },
  {
    key: 'jaqueta-inverno',
    name: 'Jaqueta de Inverno',
    description: 'Jaqueta acolchoada com capuz removível.',
    supplierKey: 'costura-brasil',
    category: 'escolar',
    gender: 'unissex',
    price: 129.9,
    items: [
      {
        kind: 'jaqueta',
        quantity: 1,
        sizes: ['P', 'M', 'G', 'GG'],
      },
    ],
    imageSrc:
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Jaqueta escolar azul pendurada',
  },
  {
    key: 'calca-moletom',
    name: 'Calça Moletom',
    description: 'Tecido macio com elástico na cintura e punhos ajustáveis.',
    supplierKey: 'costura-brasil',
    category: 'escolar',
    gender: 'unissex',
    price: 89.9,
    items: [
      {
        kind: 'calca',
        quantity: 1,
        sizes: ['36', '38', '40', '42', '44'],
      },
    ],
    imageSrc:
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Calça de moletom cinza',
  },
];

const reservationSeeds: SeedReservation[] = [
  {
    userName: 'Mariana Silva',
    userEmail: 'coordenadora@uniformes.com',
    schoolKey: 'col-horizonte-azul',
    uniformKey: 'camiseta-escolar-basica',
    suggestedSize: 'M',
    measurements: {
      age: 10,
      height: 140,
      weight: 38,
      chest: 70,
      waist: 62,
      hips: 72,
    },
  },
  {
    userName: 'João Pereira',
    userEmail: 'diretor@uniformes.com',
    schoolKey: 'esc-municipal-aurora',
    uniformKey: 'jaqueta-inverno',
    suggestedSize: 'M',
    measurements: {
      age: 11,
      height: 150,
      weight: 45,
      chest: 75,
      waist: 66,
      hips: 76,
    },
  },
];

async function upsertUser(user: SeedUser, supplierMap: Map<string, Types.ObjectId>) {
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

    if (user.supplierKey) {
      const supplierId = supplierMap.get(user.supplierKey);
      if (!existing.supplierId || existing.supplierId.toString() !== supplierId?.toString()) {
        existing.supplierId = supplierId ?? null;
        changed = true;
      }
    }

    // Atualiza CPF e endereço
    if (user.cpf && existing.cpf !== user.cpf) {
      existing.cpf = user.cpf;
      changed = true;
    }
    if (user.address) {
      const current = existing.address;
      const target = user.address;
      const addressChanged =
        current?.cep !== target.cep ||
        current?.street !== target.street ||
        current?.number !== target.number ||
        current?.complement !== target.complement ||
        current?.district !== target.district ||
        current?.city !== target.city ||
        current?.state !== target.state;
      if (addressChanged) {
        existing.address = { ...target } as any;
        changed = true;
      }
    }

    if (changed) {
      await existing.save();
      console.log(`Updated user ${user.email}`);
    } else {
      console.log(`Skipped user ${user.email}`);
    }

    return existing._id;
  }

  const hashedPassword = await hashPassword(user.password);
  const supplierId = user.supplierKey ? supplierMap.get(user.supplierKey) : undefined;

  const created = await UserModel.create({
    name: user.name,
    email: user.email,
    password: hashedPassword,
    role: user.role,
    provider: user.provider ?? 'credentials',
    verified: user.verified ?? false,
    supplierId,
    cpf: user.cpf,
    address: user.address,
  });
  console.log(`Created user ${user.email}`);
  return created._id;
}

async function upsertSchool(school: SeedSchool) {
  const updated = await SchoolModel.findOneAndUpdate(
    { name: school.name },
    {
      city: school.city,
      students: school.students,
      status: school.status,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();

  if (!updated) {
    throw new Error(`Failed to upsert school ${school.name}`);
  }

  console.log(`Upserted school ${school.name}`);
  return updated._id;
}

async function upsertSupplier(supplier: SeedSupplier, schoolMap: Map<string, Types.ObjectId>) {
  const linkedSchoolIds = supplier.schoolKeys
    .map(key => schoolMap.get(key))
    .filter((id): id is Types.ObjectId => Boolean(id));

  const updated = await SupplierModel.findOneAndUpdate(
    { name: supplier.name },
    {
      specialty: supplier.specialty,
      leadTimeDays: supplier.leadTimeDays,
      rating: supplier.rating,
      contactEmail: supplier.contactEmail,
      phone: supplier.phone,
      status: supplier.status ?? 'pending',
      schoolIds: linkedSchoolIds,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();

  if (!updated) {
    throw new Error(`Failed to upsert supplier ${supplier.name}`);
  }

  console.log(`Upserted supplier ${supplier.name}`);
  return updated._id;
}

async function upsertUniform(uniform: SeedUniform) {
  const normalizedItems = Array.isArray(uniform.items)
    ? uniform.items
        .map(item => ({
          kind: item.kind,
          quantity: Number.isFinite(item.quantity) ? Math.max(1, Math.floor(item.quantity)) : 1,
          sizes: normalizeSizes(item.sizes),
        }))
        .filter(item => item.sizes.length > 0)
    : [];

  const legacySizes = normalizeSizes(uniform.sizes);
  const derivedSizes = deriveLegacySizesFromItems(normalizedItems, legacySizes);

  const updated = await UniformModel.findOneAndUpdate(
    { name: uniform.name },
    {
      description: uniform.description,
      category: uniform.category,
      gender: uniform.gender,
      price: uniform.price,
      items: normalizedItems,
      sizes: derivedSizes,
      imageSrc: uniform.imageSrc,
      imageAlt: uniform.imageAlt,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();

  if (!updated) {
    throw new Error(`Failed to upsert uniform ${uniform.name}`);
  }

  console.log(`Upserted uniform ${uniform.name}`);
  return updated._id;
}

async function seedReservationRecords(
  reservations: SeedReservation[],
  schoolMap: Map<string, Types.ObjectId>,
  uniformMap: Map<string, Types.ObjectId>,
  userMap: Map<string, Types.ObjectId>,
) {
  for (const reservation of reservations) {
    const schoolId = schoolMap.get(reservation.schoolKey);
    const uniformId = uniformMap.get(reservation.uniformKey);
    const userId = userMap.get(reservation.userEmail);

    if (!schoolId || !uniformId || !userId) {
      console.warn(
        `Skipping reservation ${reservation.userName}: missing school, uniform or user reference`,
      );
      continue;
    }

    const existing = await ReservationModel.findOne({
      userId,
      userName: reservation.userName,
      schoolId,
      uniformId,
    }).exec();

    if (existing) {
      console.log(`Skipping reservation for ${reservation.userName} (already exists)`);
      continue;
    }

    await ReservationModel.create({
      userName: reservation.userName,
      userId,
      schoolId,
      uniformId,
      suggestedSize: reservation.suggestedSize,
      measurements: reservation.measurements,
    });
    console.log(`Created reservation for ${reservation.userName}`);
  }
}

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set.');
  }

  await dbConnect();

  const schoolMap = new Map<string, Types.ObjectId>();
  for (const school of seedSchools) {
    const id = await upsertSchool(school);
    schoolMap.set(school.key, id);
  }

  const supplierMap = new Map<string, Types.ObjectId>();
  for (const supplier of seedSuppliers) {
    const id = await upsertSupplier(supplier, schoolMap);
    supplierMap.set(supplier.key, id);
  }

  // Ensure all suppliers have a valid status set
  await SupplierModel.updateMany(
    { $or: [{ status: { $exists: false } }, { status: null }, { status: '' }] },
    { $set: { status: 'pending' } },
  ).exec();

  const userMap = new Map<string, Types.ObjectId>();
  for (const user of seedUsers) {
    const id = await upsertUser(user, supplierMap);
    userMap.set(user.email, id as Types.ObjectId);
  }

  const uniformMap = new Map<string, Types.ObjectId>();
  for (const uniform of seedUniforms) {
    const id = await upsertUniform(uniform);
    uniformMap.set(uniform.key, id);
  }

  await seedReservationRecords(reservationSeeds, schoolMap, uniformMap, userMap);
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
