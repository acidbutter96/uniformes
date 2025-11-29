export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Uniforma. Todos os direitos reservados.</p>
        <div className="flex items-center gap-4">
          <a href="#privacidade" className="transition-colors hover:text-text">
            Privacidade
          </a>
          <a href="#suporte" className="transition-colors hover:text-text">
            Suporte
          </a>
        </div>
      </div>
    </footer>
  );
}
