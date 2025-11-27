import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-2xl px-md py-2xl">
        <header className="flex items-center justify-between gap-md">
          <div className="flex items-center gap-sm">
            <span className="flex h-12 w-12 items-center justify-center rounded-card bg-primary text-h3 font-heading text-surface shadow-soft">
              U
            </span>
            <div className="flex flex-col">
              <span className="text-h3 font-heading">Uniformes</span>
              <span className="text-caption text-text-muted">Organize, reserve e acompanhe</span>
            </div>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-2xl py-2xl md:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-lg">
            <div className="flex flex-col gap-xs">
              <span className="text-caption font-medium uppercase tracking-wide text-primary">
                Processo simples e rápido
              </span>
              <h1 className="text-h1 font-heading">Reserve o uniforme da sua escola</h1>
              <p className="max-w-xl text-body text-text-muted">
                Cadastre-se, informe as medidas da criança e garanta o uniforme no prazo certo. Tudo
                em uma experiência pensada para famílias e escolas parceiras.
              </p>
            </div>

            <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
              <Button size="lg" type="button">
                Começar
              </Button>
              <span className="text-caption text-text-muted">
                Não se preocupe, você poderá alterar as informações depois.
              </span>
            </div>
          </div>

          <Card className="flex flex-col gap-md">
            <h2 className="text-h3 font-heading">Como funciona</h2>
            <ul className="flex flex-col gap-sm text-body text-text-muted">
              <li className="flex items-start gap-sm">
                <span className="mt-[2px] flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-caption font-semibold text-primary">
                  1
                </span>
                Valide a escola participante do programa.
              </li>
              <li className="flex items-start gap-sm">
                <span className="mt-[2px] flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-caption font-semibold text-primary">
                  2
                </span>
                Escolha o uniforme e confira as opções disponíveis.
              </li>
              <li className="flex items-start gap-sm">
                <span className="mt-[2px] flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-caption font-semibold text-primary">
                  3
                </span>
                Informe as medidas da criança para ajustar os tamanhos.
              </li>
              <li className="flex items-start gap-sm">
                <span className="mt-[2px] flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-caption font-semibold text-primary">
                  4
                </span>
                Confirme o pedido e acompanhe as etapas de entrega.
              </li>
            </ul>
          </Card>
        </section>
      </div>
    </main>
  );
}
