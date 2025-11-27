export interface SupplierSummary {
  id: string;
  name: string;
  specialty: string;
  leadTimeDays: number;
  rating: number;
}

export const suppliers: SupplierSummary[] = [
  {
    id: 'sp-01',
    name: 'Tecido Brasil',
    specialty: 'Tecidos sustentáveis',
    leadTimeDays: 18,
    rating: 4.6,
  },
  {
    id: 'sp-02',
    name: 'Estampa Criativa',
    specialty: 'Sublimação personalizada',
    leadTimeDays: 12,
    rating: 4.3,
  },
  {
    id: 'sp-03',
    name: 'Confecções Sul',
    specialty: 'Uniformes esportivos',
    leadTimeDays: 22,
    rating: 4.8,
  },
];
