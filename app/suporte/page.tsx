import { SectionTitle } from '@/app/components/ui/SectionTitle';

export default function SuportePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 md:px-8 lg:px-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <SectionTitle title="Suporte" />

        <p className="text-muted-foreground">
          Precisa de ajuda com o sistema de gestão de uniformes? Veja abaixo como entrar em
          contato e encontrar respostas para as principais dúvidas.
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Contato</h2>
          <p className="text-muted-foreground">
            Entre em contato com a equipe de suporte pelos canais definidos pela sua secretaria
            de educação ou administração responsável pelo programa de uniformes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Dúvidas frequentes</h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Como faço o pré-cadastro e registro no sistema.</li>
            <li>Como reservar uniformes para um ou mais estudantes.</li>
            <li>O que fazer em caso de erro de acesso ou senha.</li>
            <li>Como atualizar dados cadastrais ou medidas da criança.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Sugestões e melhorias</h2>
          <p className="text-muted-foreground">
            Caso tenha sugestões para melhorar a experiência de uso da plataforma, encaminhe-as
            pelos canais de atendimento indicados. Isso nos ajuda a oferecer um serviço cada vez
            melhor para famílias, escolas e gestores.
          </p>
        </section>
      </div>
    </main>
  );
}
