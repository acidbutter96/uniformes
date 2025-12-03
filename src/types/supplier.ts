export type SupplierDTO = {
  id: string;
  name: string;
  cnpj?: string;
  specialty?: string;
  leadTimeDays?: number;
  rating?: number;
  contactEmail?: string;
  phone?: string;
  status: 'active' | 'pending' | 'inactive' | 'suspended';
  schoolIds: string[];
  createdAt: string;
  updatedAt: string;
};
