import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'Uniformes',
    template: '%s | Uniformes',
  },
  description: 'Painel de gestão de uniformes escolares.',
  metadataBase: new URL('http://localhost:3000'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className={`${inter.variable}`}>
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
