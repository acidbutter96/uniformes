export type SupplierDTO = {
  id: string;
  name: string;
  cnpj?: string;
  specialty?: string;
  leadTimeDays?: number;
  rating?: number;
  contactEmail?: string;
  phone?: string;
  schoolIds: string[];
  createdAt: string;
  updatedAt: string;
};
