'use client';

import { useMemo, useState } from 'react';

import AdminGuard from '@/app/admin/AdminGuard';
import { schools as initialSchools, type SchoolSummary } from '@/app/data/schools';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';

const STATUS_OPTIONS: SchoolSummary['status'][] = ['ativo', 'pendente', 'inativo'];

const statusTone: Record<SchoolSummary['status'], 'success' | 'warning' | 'danger'> = {
  ativo: 'success',
  pendente: 'warning',
  inativo: 'danger',
};

const createEmptyForm = (): Omit<SchoolSummary, 'id'> => ({
  name: '',
  city: '',
  students: 0,
  status: 'ativo',
});

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState<SchoolSummary[]>(() =>
    initialSchools.map(item => ({ ...item })),
  );
  const [formValues, setFormValues] = useState<Omit<SchoolSummary, 'id'>>(createEmptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  const handleChange = (field: keyof Omit<SchoolSummary, 'id'>, value: string) => {
    setFormValues(prev => {
      if (field === 'students') {
        return { ...prev, [field]: Number(value) };
      }

      if (field === 'status') {
        return { ...prev, status: value as SchoolSummary['status'] };
      }

      return { ...prev, [field]: value };
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormValues(createEmptyForm());
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formValues.name.trim() || !formValues.city.trim()) {
      return;
    }

    if (formValues.students <= 0) {
      return;
    }

    if (isEditing && editingId) {
      setSchools(prev =>
        prev.map(item =>
          item.id === editingId
            ? { ...item, ...formValues, students: Number(formValues.students) }
            : item,
        ),
      );
      resetForm();
      return;
    }

    const nextId = `sc-${crypto.randomUUID().slice(0, 6)}`;
    const newSchool: SchoolSummary = {
      id: nextId,
      ...formValues,
      students: Number(formValues.students),
    };

    setSchools(prev => [...prev, newSchool]);
    resetForm();
  };

  const handleEdit = (id: string) => {
    const target = schools.find(item => item.id === id);
    if (!target) return;

    setEditingId(id);
    const { name, city, students, status } = target;
    setFormValues({ name, city, students, status });
  };

  const handleDelete = (id: string) => {
    const target = schools.find(item => item.id === id);
    if (!target) return;

    const confirmed = window.confirm(`Remover ${target.name}? Esta ação é apenas mock.`);
    if (!confirmed) return;

    setSchools(prev => prev.filter(item => item.id !== id));
    if (editingId === id) {
      resetForm();
    }
  };

  return (
    <AdminGuard requiredRole="admin">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900">Escolas</h1>
          <p className="text-sm text-neutral-500">Gerencie cadastros e status de integração.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
            <table className="min-w-full divide-y divide-neutral-100 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Cidade</th>
                  <th className="px-4 py-3">Alunos</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {schools.map(school => (
                  <tr key={school.id} className="hover:bg-brand-50/40">
                    <td className="px-4 py-3 font-medium text-neutral-900">{school.name}</td>
                    <td className="px-4 py-3 text-neutral-600">{school.city}</td>
                    <td className="px-4 py-3 text-neutral-600">{school.students}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[school.status]}>{school.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-xs">
                        <Button variant="secondary" size="sm" onClick={() => handleEdit(school.id)}>
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(school.id)}>
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/70 p-6 shadow-card">
            <h2 className="text-lg font-semibold text-brand-900">
              {isEditing ? 'Editar escola' : 'Cadastrar nova escola'}
            </h2>
            <p className="text-sm text-brand-700">
              As alterações são locais (mock) e ajudam a validar o fluxo antes da API real.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label htmlFor="school-name" className="text-sm font-medium text-neutral-700">
                  Nome da escola
                </label>
                <Input
                  id="school-name"
                  value={formValues.name}
                  onChange={event => handleChange('name', event.target.value)}
                  placeholder="Ex: Colégio União"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="school-city" className="text-sm font-medium text-neutral-700">
                  Cidade
                </label>
                <Input
                  id="school-city"
                  value={formValues.city}
                  onChange={event => handleChange('city', event.target.value)}
                  placeholder="Ex: Florianópolis"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="school-students" className="text-sm font-medium text-neutral-700">
                  Número de alunos
                </label>
                <Input
                  id="school-students"
                  type="number"
                  min={1}
                  value={formValues.students}
                  onChange={event => handleChange('students', event.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="school-status" className="text-sm font-medium text-neutral-700">
                  Status
                </label>
                <select
                  id="school-status"
                  value={formValues.status}
                  onChange={event => handleChange('status', event.target.value)}
                  className="w-full rounded-card border border-border bg-surface px-md py-sm text-body text-text shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-primary/40"
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-sm">
                <Button type="submit" fullWidth>
                  {isEditing ? 'Salvar alterações' : 'Adicionar escola'}
                </Button>
                {isEditing && (
                  <Button type="button" variant="secondary" fullWidth onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </aside>
        </div>
      </div>
    </AdminGuard>
  );
}
