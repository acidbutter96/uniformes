'use client';

import { useMemo, useState } from 'react';

import AdminGuard from '@/app/admin/AdminGuard';
import { suppliers as initialSuppliers, type SupplierSummary } from '@/app/data/suppliers';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';

const createEmptyForm = (): Omit<SupplierSummary, 'id'> => ({
    name: '',
    specialty: '',
    leadTimeDays: 15,
    rating: 4,
});

export default function AdminSuppliersPage() {
    const [suppliers, setSuppliers] = useState<SupplierSummary[]>(() =>
        initialSuppliers.map(item => ({ ...item })),
    );
    const [formValues, setFormValues] = useState<Omit<SupplierSummary, 'id'>>(createEmptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);

    const isEditing = useMemo(() => editingId !== null, [editingId]);

    const handleChange = (field: keyof Omit<SupplierSummary, 'id'>, value: string) => {
        setFormValues(prev => {
            if (field === 'leadTimeDays' || field === 'rating') {
                return { ...prev, [field]: Number(value) };
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

        if (!formValues.name.trim() || !formValues.specialty.trim()) {
            return;
        }

        if (formValues.leadTimeDays <= 0 || formValues.rating < 0) {
            return;
        }

        if (isEditing && editingId) {
            setSuppliers(prev =>
                prev.map(item => (item.id === editingId ? { ...item, ...formValues } : item)),
            );
            resetForm();
            return;
        }

        const newSupplier: SupplierSummary = {
            id: `sp-${crypto.randomUUID().slice(0, 6)}`,
            ...formValues,
        };

        setSuppliers(prev => [...prev, newSupplier]);
        resetForm();
    };

    const handleEdit = (id: string) => {
        const target = suppliers.find(item => item.id === id);
        if (!target) return;

        setEditingId(id);
        const { name, specialty, leadTimeDays, rating } = target;
        setFormValues({ name, specialty, leadTimeDays, rating });
    };

    const handleDelete = (id: string) => {
        const target = suppliers.find(item => item.id === id);
        if (!target) return;

        const confirmed = window.confirm(`Remover ${target.name}? A exclusão é apenas mock.`);
        if (!confirmed) return;

        setSuppliers(prev => prev.filter(item => item.id !== id));
        if (editingId === id) {
            resetForm();
        }
    };

    return (
        <AdminGuard>
            <div className="space-y-6">
                <header className="space-y-2">
                    <h1 className="text-2xl font-semibold text-neutral-900">Fornecedores</h1>
                    <p className="text-sm text-neutral-500">
                        Gerencie os parceiros responsáveis pela produção e logística.
                    </p>
                </header>

                <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
                        <table className="min-w-full divide-y divide-neutral-100 text-sm">
                            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                <tr>
                                    <th className="px-4 py-3">Nome</th>
                                    <th className="px-4 py-3">Especialidade</th>
                                    <th className="px-4 py-3">Lead time (dias)</th>
                                    <th className="px-4 py-3">Avaliação</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 bg-white">
                                {suppliers.map(supplier => (
                                    <tr key={supplier.id} className="hover:bg-brand-50/40">
                                        <td className="px-4 py-3 font-medium text-neutral-900">{supplier.name}</td>
                                        <td className="px-4 py-3 text-neutral-600">{supplier.specialty}</td>
                                        <td className="px-4 py-3 text-neutral-600">{supplier.leadTimeDays}</td>
                                        <td className="px-4 py-3 text-neutral-600">{supplier.rating.toFixed(1)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-xs">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleEdit(supplier.id)}
                                                >
                                                    Editar
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(supplier.id)}>
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
                            {isEditing ? 'Editar fornecedor' : 'Cadastrar novo fornecedor'}
                        </h2>
                        <p className="text-sm text-brand-700">
                            Utilize o formulário para simular cadastros antes da integração com o backend.
                        </p>

                        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                            <div className="space-y-1">
                                <label htmlFor="supplier-name" className="text-sm font-medium text-neutral-700">
                                    Nome
                                </label>
                                <Input
                                    id="supplier-name"
                                    value={formValues.name}
                                    onChange={event => handleChange('name', event.target.value)}
                                    placeholder="Ex: Tecelagem Brasil"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label
                                    htmlFor="supplier-specialty"
                                    className="text-sm font-medium text-neutral-700"
                                >
                                    Especialidade
                                </label>
                                <Input
                                    id="supplier-specialty"
                                    value={formValues.specialty}
                                    onChange={event => handleChange('specialty', event.target.value)}
                                    placeholder="Ex: Malharia premium"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="supplier-leadtime" className="text-sm font-medium text-neutral-700">
                                    Lead time (dias)
                                </label>
                                <Input
                                    id="supplier-leadtime"
                                    type="number"
                                    min={1}
                                    value={formValues.leadTimeDays}
                                    onChange={event => handleChange('leadTimeDays', event.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="supplier-rating" className="text-sm font-medium text-neutral-700">
                                    Avaliação
                                </label>
                                <Input
                                    id="supplier-rating"
                                    type="number"
                                    step={0.1}
                                    min={0}
                                    max={5}
                                    value={formValues.rating}
                                    onChange={event => handleChange('rating', event.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-sm">
                                <Button type="submit" fullWidth>
                                    {isEditing ? 'Salvar alterações' : 'Adicionar fornecedor'}
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
