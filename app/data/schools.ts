export interface SchoolSummary {
  id: string;
  name: string;
  city: string;
  students: number;
  status: 'ativo' | 'pendente' | 'inativo';
}

export const schools: SchoolSummary[] = [
  {
    id: 'sc-01',
    name: 'Colégio Horizonte Azul',
    city: 'São Paulo',
    students: 820,
    status: 'ativo',
  },
  {
    id: 'sc-02',
    name: 'Escola Municipal Aurora',
    city: 'Belo Horizonte',
    students: 410,
    status: 'pendente',
  },
  { id: 'sc-03', name: 'Instituto Vale Verde', city: 'Curitiba', students: 610, status: 'ativo' },
  {
    id: 'sc-04',
    name: 'Colégio Porto Seguro',
    city: 'Porto Alegre',
    students: 530,
    status: 'inativo',
  },
];
