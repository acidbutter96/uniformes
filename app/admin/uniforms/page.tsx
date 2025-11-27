'use client';

import { useMemo, useState } from 'react';

import AdminGuard from '@/app/admin/AdminGuard';
import { uniforms as initialUniforms, type UniformSummary } from '@/app/data/uniforms';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { formatCurrency } from '@/app/lib/format';
import { Input } from '@/app/components/ui/Input';

const CATEGORY_LABEL: Record<UniformSummary['category'], string> = {
    escolar: 'Uniforme escolar',
    esportivo: 'Uniforme esportivo',
    acessorios: 'Acessórios',
};

const CATEGORY_OPTIONS: UniformSummary['category'][] = ['escolar', 'esportivo', 'acessorios'];
const GENDER_OPTIONS: UniformSummary['gender'][] = ['masculino', 'feminino', 'unissex'];

type UniformForm = {
    name: string;
    category: UniformSummary['category'];
    gender: UniformSummary['gender'];
    sizesText: string;
    price: number;
};

const createEmptyForm = (): UniformForm => ({
    name: '',
    category: 'escolar',
    gender: 'unissex',
    sizesText: '',
    price: 0,
});

export default function AdminUniformsPage() {
    const [uniforms, setUniforms] = useState<UniformSummary[]>(() =>
        initialUniforms.map(item => ({ ...item })),
    );
    const [formValues, setFormValues] = useState<UniformForm>(createEmptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);

    const isEditing = useMemo(() => editingId !== null, [editingId]);

    const handleChange = (field: keyof UniformForm, value: string) => {
        setFormValues(prev => {
            if (field === 'price') {
                return { ...prev, price: Number(value) };
            }

            if (field === 'category') {
                return { ...prev, category: value as UniformSummary['category'] };
            }

            if (field === 'gender') {
                return { ...prev, gender: value as UniformSummary['gender'] };
            }

            return { ...prev, [field]: value };
        });
    };

    const resetForm = () => {
        setEditingId(null);
        setFormValues(createEmptyForm());
    };

    const parseSizes = (raw: string): string[] =>
        raw
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!formValues.name.trim()) {
            return;
        }

        const sizes = parseSizes(formValues.sizesText);
        if (sizes.length === 0) {
            return;
        }

        if (formValues.price <= 0) {
            return;
        }

        if (isEditing && editingId) {
            setUniforms(prev =>
                prev.map(item =>
                    item.id === editingId
                        ? { ...item, ...formValues, sizes, price: Number(formValues.price) }
                        : item,
                ),
            );
            resetForm();
            return;
        }

        const newUniform: UniformSummary = {
            id: `uni-${crypto.randomUUID().slice(0, 6)}`,
            name: formValues.name,
            category: formValues.category,
            gender: formValues.gender,
            sizes,
            price: Number(formValues.price),
        };

        setUniforms(prev => [...prev, newUniform]);
        resetForm();
    };

    const handleEdit = (id: string) => {
        const target = uniforms.find(item => item.id === id);
        if (!target) return;

        setEditingId(id);
        setFormValues({
            name: target.name,
            category: target.category,
            gender: target.gender,
            price: target.price,
            sizesText: target.sizes.join(', '),
        });
    };

    const handleDelete = (id: string) => {
        const target = uniforms.find(item => item.id === id);
        if (!target) return;

        const confirmed = window.confirm(`Remover ${target.name}? Remoção mock para validação.`);
        if (!confirmed) return;

        setUniforms(prev => prev.filter(item => item.id !== id));
        if (editingId === id) {
            resetForm();
        }
    };

    return (
        <AdminGuard>
            <div className="space-y-6">
                <header className="space-y-2">
                    <h1 className="text-2xl font-semibold text-neutral-900">Catálogo de uniformes</h1>
                    <p className="text-sm text-neutral-500">
                        Gerencie itens, tamanhos disponíveis e precificação.
                    </p>
                </header>

                <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
                        <table className="min-w-full divide-y divide-neutral-100 text-sm">
                            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                <tr>
                                    <th className="px-4 py-3">Nome</th>
                                    <th className="px-4 py-3">Categoria</th>
                                    <th className="px-4 py-3">Gênero</th>
                                    <th className="px-4 py-3">Tamanhos</th>
                                    <th className="px-4 py-3">Preço</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 bg-white">
                                {uniforms.map(uniform => (
                                    <tr key={uniform.id} className="hover:bg-brand-50/40">
                                        <td className="px-4 py-3 font-medium text-neutral-900">{uniform.name}</td>
                                        <td className="px-4 py-3 text-neutral-600">
                                            <Badge tone="accent">{CATEGORY_LABEL[uniform.category]}</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-neutral-600">{uniform.gender}</td>
                                        <td className="px-4 py-3 text-neutral-600">{uniform.sizes.join(', ')}</td>
                                        <td className="px-4 py-3 text-neutral-600">{formatCurrency(uniform.price)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-xs">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleEdit(uniform.id)}
                                                >
                                                    Editar
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(uniform.id)}>
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
                            {isEditing ? 'Editar uniforme' : 'Cadastrar novo uniforme'}
                        </h2>
                        <p className="text-sm text-brand-700">
                            Preencha os dados para simular ajustes no catálogo sem persistência real.
                        </p>

                        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                            <div className="space-y-1">
                                <label htmlFor="uniform-name" className="text-sm font-medium text-neutral-700">
                                    Nome
                                </label>
                                <Input
                                    id="uniform-name"
                                    value={formValues.name}
                                    onChange={event => handleChange('name', event.target.value)}
                                    placeholder="Ex: Blusa manga longa"
                                    required
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <label
                                        htmlFor="uniform-category"
                                        className="text-sm font-medium text-neutral-700"
                                    >
                                        Categoria
                                    </label>
                                    <select
                                        id="uniform-category"
                                        value={formValues.category}
                                        onChange={event => handleChange('category', event.target.value)}
                                        className="w-full rounded-card border border-border bg-surface px-md py-sm text-body text-text shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-primary/40"
                                    >
                                        {CATEGORY_OPTIONS.map(option => (
                                            <option key={option} value={option}>
                                                {CATEGORY_LABEL[option]}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor="uniform-gender" className="text-sm font-medium text-neutral-700">
                                        Gênero
                                    </label>
                                    <select
                                        id="uniform-gender"
                                        value={formValues.gender}
                                        onChange={event => handleChange('gender', event.target.value)}
                                        className="w-full rounded-card border border-border bg-surface px-md py-sm text-body text-text shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-primary/40"
                                    >
                                        {GENDER_OPTIONS.map(option => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="uniform-sizes" className="text-sm font-medium text-neutral-700">
                                    Tamanhos (separados por vírgula)
                                </label>
                                <Input
                                    id="uniform-sizes"
                                    value={formValues.sizesText}
                                    onChange={event => handleChange('sizesText', event.target.value)}
                                    placeholder="Ex: PP, P, M, G, GG"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="uniform-price" className="text-sm font-medium text-neutral-700">
                                    Preço
                                </label>
                                <Input
                                    id="uniform-price"
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={formValues.price}
                                    onChange={event => handleChange('price', event.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-sm">
                                <Button type="submit" fullWidth>
                                    {isEditing ? 'Salvar alterações' : 'Adicionar uniforme'}
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
