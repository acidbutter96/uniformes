'use client';

import { useState } from 'react';
import { StepsHeader } from '@/components/steps/StepsHeader';
import {
  ChildMeasurementsForm,
  type MeasurementsData,
} from '@/components/forms/ChildMeasurementsForm';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

interface SuggestionResult {
  suggestion: string;
  confidence: number;
  message: string;
}

export default function MeasurementsPage() {
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  async function handleSubmit(data: MeasurementsData) {
    setResult(null);
    setApiError(null);

    const response = await fetch('/api/mock/suggest-size', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const message = payload?.error ?? 'Erro ao contactar API.';
      setApiError(message);
      throw new Error(message);
    }

    const payload = (await response.json()) as SuggestionResult;
    setResult(payload);
    setApiError(null);
  }

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-2xl px-md py-2xl">
        <StepsHeader currentStep={3} />

        <section className="grid gap-xl lg:grid-cols-[1.2fr_0.8fr]">
          <ChildMeasurementsForm
            onSubmit={handleSubmit}
            submitLabel="Sugerir tamanho"
            successMessage="Sugestão enviada!"
            errorMessage="Não foi possível gerar uma sugestão."
          />

          <aside className="flex flex-col gap-md">
            <Card emphasis="muted" className="flex flex-col gap-sm">
              <h2 className="text-h3 font-heading">Resultado</h2>
              {result ? (
                <div className="flex flex-col gap-sm">
                  <p className="text-body text-text">{result.message}</p>
                  <p className="text-caption text-text-muted">
                    Confiança estimada: {(result.confidence * 100).toFixed(0)}%
                  </p>
                  <Button variant="primary" fullWidth>
                    Avançar para confirmação
                  </Button>
                </div>
              ) : (
                <p className="text-body text-text-muted">
                  Preencha as medidas e solicite a sugestão para ver o tamanho recomendado.
                </p>
              )}
            </Card>

            {apiError && (
              <Alert tone="danger" heading="Erro ao sugerir tamanho" description={apiError} />
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
