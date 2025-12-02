import { Suspense } from 'react';
import SupplierRegisterClient from './SupplierRegisterClient';

export const dynamic = 'force-dynamic';

export default function SupplierRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-text-muted">
          Carregando...
        </div>
      }
    >
      <SupplierRegisterClient />
    </Suspense>
  );
}
