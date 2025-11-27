import { School } from './models/school';
import { Supplier } from './models/supplier';
import { Uniform } from './models/uniform';
import { Reservation } from './models/reservation';

export const schools: School[] = [
  { id: 'school-aurora', name: 'Escola Aurora do Saber', city: 'São Paulo' },
  { id: 'school-horizonte', name: 'Colégio Horizonte Azul', city: 'Campinas' },
  { id: 'school-viver', name: 'Instituto Viver e Aprender', city: 'Rio de Janeiro' },
];

export const suppliers: Supplier[] = [
  {
    id: 'supplier-atelier',
    name: 'Ateliê Uniformes',
    schools: ['school-aurora', 'school-horizonte'],
  },
  {
    id: 'supplier-costura',
    name: 'Costura Brasil',
    schools: ['school-horizonte', 'school-viver'],
  },
];

export const uniforms: Uniform[] = [
  {
    id: 'uniform-shirt',
    name: 'Camiseta Escolar',
    description: 'Malha leve com gola reforçada e manga curta.',
    supplierId: 'supplier-atelier',
    sizes: ['PP', 'P', 'M', 'G'],
    imageSrc:
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Camiseta escolar dobrada',
  },
  {
    id: 'uniform-coat',
    name: 'Jaqueta de Inverno',
    description: 'Jaqueta acolchoada com capuz removível.',
    supplierId: 'supplier-costura',
    sizes: ['P', 'M', 'G', 'GG'],
    imageSrc:
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Jaqueta escolar azul pendurada',
  },
  {
    id: 'uniform-pants',
    name: 'Calça Moletom',
    description: 'Tecido macio com elástico na cintura e punhos ajustáveis.',
    supplierId: 'supplier-costura',
    sizes: ['PP', 'P', 'M', 'G', 'GG'],
    imageSrc:
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Calça de moletom cinza',
  },
];

export const reservations: Reservation[] = [
  {
    id: 'reservation-001',
    userName: 'Mariana Silva',
    schoolId: schools[0].id,
    uniformId: uniforms[0].id,
    measurements: { height: 140, weight: 38, chest: 70 },
    suggestedSize: 'M',
    createdAt: new Date('2025-09-15T10:20:00Z').toISOString(),
  },
  {
    id: 'reservation-002',
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
