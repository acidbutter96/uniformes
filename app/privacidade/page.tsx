import { SectionTitle } from '@/app/components/ui/SectionTitle';

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 md:px-8 lg:px-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <SectionTitle title="Política de Privacidade" />

        <p className="text-muted-foreground">
          Valorizamos a sua privacidade. Esta página descreve como coletamos, utilizamos e
          protegemos seus dados pessoais durante o uso da plataforma de gestão de uniformes
          escolares.
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">1. Coleta de dados</h2>
          <p className="text-muted-foreground">
            Coletamos apenas as informações necessárias para o funcionamento do sistema, como dados
            de contato, informações de responsáveis, estudantes, escolas e reservas de uniformes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">2. Uso das informações</h2>
          <p className="text-muted-foreground">
            Utilizamos os dados exclusivamente para gerenciamento de pedidos, comunicação com
            responsáveis e escolas, e melhoria dos nossos serviços, nunca para fins comerciais não
            relacionados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">3. Compartilhamento de dados</h2>
          <p className="text-muted-foreground">
            Os dados podem ser compartilhados apenas com escolas, fornecedores e órgãos responsáveis
            diretamente envolvidos no processo de fornecimento de uniformes, sempre seguindo as
            normas aplicáveis de proteção de dados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">4. Segurança</h2>
          <p className="text-muted-foreground">
            Adotamos medidas técnicas e organizacionais para proteger suas informações contra acesso
            não autorizado, alteração, divulgação ou destruição.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">5. Seus direitos</h2>
          <p className="text-muted-foreground">
            Você pode solicitar a atualização, correção ou exclusão dos seus dados, bem como
            esclarecimentos sobre o seu uso, entrando em contato pelos canais de suporte indicados
            na plataforma.
          </p>
        </section>
      </div>
    </main>
  );
}
