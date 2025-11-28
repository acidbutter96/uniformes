export const SCHOOL_STATUSES = ['ativo', 'pendente', 'inativo'] as const;

export type SchoolStatus = (typeof SCHOOL_STATUSES)[number];

export type SchoolDTO = {
  id: string;
  name: string;
  city: string;
  students: number;
  status: SchoolStatus;
  createdAt: string;
  updatedAt: string;
};
