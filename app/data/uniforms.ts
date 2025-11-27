export interface UniformSummary {
  id: string;
  name: string;
  category: 'escolar' | 'esportivo' | 'acessorios';
  gender: 'masculino' | 'feminino' | 'unissex';
  sizes: string[];
  price: number;
}

export const uniforms: UniformSummary[] = [
  {
    id: 'uni-001',
    name: 'Camiseta Oficial',
    category: 'escolar',
    gender: 'unissex',
    sizes: ['PP', 'P', 'M', 'G', 'GG'],
    price: 69.9,
  },
  {
    id: 'uni-002',
    name: 'Jaqueta Inverno',
    category: 'esportivo',
    gender: 'unissex',
    sizes: ['P', 'M', 'G', 'GG'],
    price: 189.5,
  },
  {
    id: 'uni-003',
    name: 'Calça Tradicional',
    category: 'escolar',
    gender: 'masculino',
    sizes: ['PP', 'P', 'M', 'G'],
    price: 119.0,
  },
];
