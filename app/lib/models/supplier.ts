export interface Supplier {
  id: string;
  name: string;
  schools?: string[];
  schoolIds?: string[];
  specialty?: string;
  leadTimeDays?: number;
  rating?: number;
  contactEmail?: string;
  phone?: string;
}
