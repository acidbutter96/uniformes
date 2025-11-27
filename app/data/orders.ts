export interface OrderSummary {
  id: string;
  schoolId: string;
  supplierId: string;
  status: 'em-producao' | 'enviado' | 'aguardando';
  value: number;
  updatedAt: string;
}

export const orders: OrderSummary[] = [
  {
    id: 'ord-2025-001',
    schoolId: 'sc-01',
    supplierId: 'sp-01',
    status: 'em-producao',
    value: 45200,
    updatedAt: '2025-11-12T15:30:00-03:00',
  },
  {
    id: 'ord-2025-002',
    schoolId: 'sc-02',
    supplierId: 'sp-03',
    status: 'aguardando',
    value: 21800,
    updatedAt: '2025-11-18T10:15:00-03:00',
  },
  {
    id: 'ord-2025-003',
    schoolId: 'sc-03',
    supplierId: 'sp-02',
    status: 'enviado',
    value: 38950,
    updatedAt: '2025-11-05T09:00:00-03:00',
  },
];
