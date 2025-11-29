import 'dotenv/config';

import mongoose, { Types } from 'mongoose';

import dbConnect from '@/src/lib/database';
import ReservationModel from '@/src/lib/models/reservation';
import SchoolModel, { type SchoolStatus } from '@/src/lib/models/school';
import SupplierModel from '@/src/lib/models/supplier';
import UniformModel from '@/src/lib/models/uniform';
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
}

interface SeedUniform {
  key: string;
  name: string;
  description?: string;
  supplierKey: string;
  sizes: string[];
  imageSrc?: string;
  imageAlt?: string;
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
    sizes: ['PP', 'P', 'M', 'G'],
    imageSrc:
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Camiseta escolar dobrada',
  },
  {
    key: 'jaqueta-inverno',
    name: 'Jaqueta de Inverno',
    description: 'Jaqueta acolchoada com capuz removível.',
    supplierKey: 'costura-brasil',
    sizes: ['P', 'M', 'G', 'GG'],
    imageSrc:
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Jaqueta escolar azul pendurada',
  },
  {
    key: 'calca-moletom',
    name: 'Calça Moletom',
    description: 'Tecido macio com elástico na cintura e punhos ajustáveis.',
    supplierKey: 'costura-brasil',
    sizes: ['PP', 'P', 'M', 'G', 'GG'],
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
      console.log(`Updated user ${user.email}`);
    } else {
      console.log(`Skipped user ${user.email}`);
    }

    return existing._id;
  }

  const hashedPassword = await hashPassword(user.password);
  const created = await UserModel.create({
    name: user.name,
    email: user.email,
    password: hashedPassword,
    role: user.role,
    provider: user.provider ?? 'credentials',
    verified: user.verified ?? false,
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

async function upsertUniform(uniform: SeedUniform, supplierMap: Map<string, Types.ObjectId>) {
  const supplierId = supplierMap.get(uniform.supplierKey);
  if (!supplierId) {
    throw new Error(`Supplier ${uniform.supplierKey} not found for uniform ${uniform.name}`);
  }

  const updated = await UniformModel.findOneAndUpdate(
    { name: uniform.name },
    {
      description: uniform.description,
      supplierId,
      sizes: uniform.sizes,
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

  const userMap = new Map<string, Types.ObjectId>();
  for (const user of seedUsers) {
    const id = await upsertUser(user);
    userMap.set(user.email, id as Types.ObjectId);
  }

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

  const uniformMap = new Map<string, Types.ObjectId>();
  for (const uniform of seedUniforms) {
    const id = await upsertUniform(uniform, supplierMap);
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
