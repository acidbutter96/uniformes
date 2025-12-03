export const UNIFORM_CATEGORIES = ['escolar', 'esportivo', 'acessorios'] as const;
export type UniformCategory = (typeof UNIFORM_CATEGORIES)[number];

export const UNIFORM_GENDERS = ['masculino', 'feminino', 'unissex'] as const;
export type UniformGender = (typeof UNIFORM_GENDERS)[number];

export type UniformDTO = {
  id: string;
  name: string;
  description?: string;
  category: UniformCategory;
  gender: UniformGender;
  sizes: string[];
  price: number;
  imageSrc?: string;
  imageAlt?: string;
  createdAt: string;
  updatedAt: string;
};
