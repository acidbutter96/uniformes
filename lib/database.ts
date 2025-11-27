import { School } from './models/school';
import { Supplier } from './models/supplier';
import { Uniform } from './models/uniform';
import { Order } from './models/order';

export const schools: School[] = [
  { id: 'school-aurora', name: 'Escola Aurora do Saber', city: 'São Paulo' },
  { id: 'school-horizonte', name: 'Colégio Horizonte Azul', city: 'Campinas' },
  { id: 'school-viver', name: 'Instituto Viver e Aprender', city: 'Rio de Janeiro' },
];

export const suppliers: Supplier[] = [
  { id: 'supplier-atelier', name: 'Ateliê Uniformes', schools: [0, 1] },
  { id: 'supplier-costura', name: 'Costura Brasil', schools: [1, 2] },
];

export const uniforms: Uniform[] = [
  {
    id: 'uniform-shirt',
    name: 'Camiseta Escolar',
    description: 'Malha leve com gola reforçada e manga curta.',
    sizes: ['PP', 'P', 'M', 'G'],
  },
  {
    id: 'uniform-coat',
    name: 'Jaqueta de Inverno',
    description: 'Jaqueta acolchoada com capuz removível.',
    sizes: ['P', 'M', 'G', 'GG'],
  },
  {
    id: 'uniform-pants',
    name: 'Calça Moletom',
    description: 'Tecido macio com elástico na cintura e punhos ajustáveis.',
    sizes: ['PP', 'P', 'M', 'G', 'GG'],
  },
];

export const orders: Order[] = [
  {
    id: 'order-001',
    userName: 'Mariana Silva',
    schoolId: schools[0].id,
    uniformId: uniforms[0].id,
    measurements: { height: 140, weight: 38, chest: 70 },
    suggestedSize: 'M',
    createdAt: new Date('2025-09-15T10:20:00Z').toISOString(),
  },
  {
    id: 'order-002',
    userName: 'João Pereira',
    schoolId: schools[1].id,
    uniformId: uniforms[1].id,
    measurements: { height: 150, weight: 45, chest: 75 },
    suggestedSize: 'M',
    createdAt: new Date('2025-09-18T14:45:00Z').toISOString(),
  },
];

export function getById<T extends { id: string }>(collection: T[], id: string): T | undefined {
  return collection.find(item => item.id === id);
}
