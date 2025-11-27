import Link from 'next/link';
import { Badge } from '@/app/components/ui/Badge';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/schools', label: 'Escolas' },
  { href: '/admin/suppliers', label: 'Fornecedores' },
  { href: '/admin/uniforms', label: 'Uniformes' },
  { href: '/admin/reservations', label: 'Reservas' },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold tracking-tight text-neutral-900">
            Uniformes
          </Link>
          <Badge tone="accent">Admin</Badge>
        </div>
        <nav className="flex items-center gap-6 text-sm font-medium text-neutral-600">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} className="hover:text-neutral-900">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
