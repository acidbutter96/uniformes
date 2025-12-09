'use client';

import { useEffect, useState } from 'react';

import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';

export default function AdminSettingsPage() {
  const [maxChildren, setMaxChildren] = useState<string>('7');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.maxChildrenPerUser === 'number') {
            setMaxChildren(String(data.maxChildrenPerUser));
          }
        }
      } catch {}
    })();
  }, []);

  const save = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxChildrenPerUser: Number(maxChildren) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Falha ao salvar.');
      }
      setMessage('Configurações salvas com sucesso.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar.';
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl">
        <Card className="rounded-2xl border border-border p-6 shadow-card">
          <h1 className="text-2xl font-semibold text-text mb-4">Configurações</h1>
          {message && (
            <Alert
              tone={message.includes('sucesso') ? 'success' : 'danger'}
              description={message}
              className="mb-4"
            />
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text">Máximo de crianças por usuário</label>
            <Input
              type="number"
              min={1}
              step={1}
              value={maxChildren}
              onChange={e => setMaxChildren(e.target.value)}
            />
          </div>
          <div className="mt-4">
            <Button onClick={save} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
