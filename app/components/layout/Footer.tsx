export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Uniformes. Todos os direitos reservados.</p>
        <div className="flex items-center gap-4">
          <a href="#privacidade" className="hover:text-neutral-700">
            Privacidade
          </a>
          <a href="#suporte" className="hover:text-neutral-700">
            Suporte
          </a>
        </div>
      </div>
    </footer>
  );
}
