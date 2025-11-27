import { uniforms } from '@/app/data/uniforms';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { formatCurrency } from '@/app/lib/format';

const categoryLabel: Record<string, string> = {
  escolar: 'Uniforme escolar',
  esportivo: 'Uniforme esportivo',
  acessorios: 'Acessórios',
};

export default function AdminUniformsPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Catálogo de uniformes</h1>
          <p className="text-sm text-neutral-500">
            Gerencie itens, tamanhos disponíveis e precificação.
          </p>
        </div>
        <Button>Cadastrar item</Button>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {uniforms.map(uniform => (
          <article
            key={uniform.id}
            className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-card"
          >
            <header className="flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-neutral-900">{uniform.name}</h2>
                <p className="text-sm text-neutral-500">{categoryLabel[uniform.category]}</p>
              </div>
              <Badge tone="accent">{uniform.gender}</Badge>
            </header>
            <div className="text-sm text-neutral-500">
              <p>Tamanhos: {uniform.sizes.join(', ')}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-neutral-900">
                {formatCurrency(uniform.price)}
              </p>
              <Button variant="ghost" className="text-sm text-brand-600">
                Editar
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
