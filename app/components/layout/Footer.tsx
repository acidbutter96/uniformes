import Image from 'next/image';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium text-center md:text-left flex items-center">
          <span>&copy; {year} Uniforma. Todos os direitos reservados. | Desenvolvido por</span>
          <a
            className="inline-flex items-center ml-1 hover:text-text transition-colors"
            href="https://devbutter.tech/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="DevButter site"
          >
            <Image
              src="/images/logos/devbutter.svg"
              alt="DevButter"
              width={18}
              height={18}
              className="h-[18px] w-[18px] object-contain"
            />
            <span className="sr-only">DevButter</span>
          </a>
        </p>
        <div className="flex items-center gap-4">
          <a href="/privacidade" className="transition-colors hover:text-text">
            Privacidade
          </a>
          <a href="/suporte" className="transition-colors hover:text-text">
            Suporte
          </a>
        </div>
      </div>
    </footer>
  );
}
