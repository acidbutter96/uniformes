'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { StepsHeader } from '@/app/components/steps/StepsHeader';
import { MeasurementsForm, type MeasurementsData } from '@/app/components/forms/MeasurementsForm';
import { Card } from '@/app/components/ui/Card';
import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import type { Uniform } from '@/app/lib/models/uniform';
import type { School } from '@/app/lib/models/school';
import {
  loadOrderFlowState,
  saveOrderFlowState,
  type MeasurementsMap,
  type SuggestionData,
} from '@/app/lib/storage/order-flow';

interface SuggestionResult {
  suggestion: string;
  confidence: number;
  message: string;
}

export default function MeasurementsPage() {
  const router = useRouter();
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [measurementValues, setMeasurementValues] = useState<MeasurementsMap | null>(null);
  const [uniform, setUniform] = useState<Uniform | null>(null);
  const [school, setSchool] = useState<School | null>(null);

  useEffect(() => {
    const state = loadOrderFlowState();

    if (!state.schoolId) {
      router.replace('/escola');
      return;
    }

    if (!state.uniformId) {
      router.replace('/uniformes');
      return;
    }

    if (state.suggestion) {
      setResult(state.suggestion);
    }

    if (state.measurements) {
      setMeasurementValues(state.measurements);
    }

    const fetchDetails = async () => {
      try {
        const [uniformsResponse, schoolsResponse] = await Promise.all([
          fetch('/api/uniforms'),
          fetch('/api/schools'),
        ]);

        if (!uniformsResponse.ok || !schoolsResponse.ok) {
          throw new Error('Não foi possível carregar os dados necessários.');
        }

        const uniformsPayload = (await uniformsResponse.json()) as { data: Uniform[] };
        const schoolsPayload = (await schoolsResponse.json()) as { data: School[] };

        const matchedUniform = uniformsPayload.data?.find(item => item.id === state.uniformId);
        const matchedSchool = schoolsPayload.data?.find(item => item.id === state.schoolId);

        if (matchedUniform) {
          setUniform(matchedUniform);
        }

        if (matchedSchool) {
          setSchool(matchedSchool);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchDetails();
  }, [router]);

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

    const measurementsMap: MeasurementsMap = {
      age: Number(data.age),
      height: Number(data.height),
      weight: Number(data.weight),
      chest: Number(data.chest),
      waist: Number(data.waist),
      hips: Number(data.hips),
    };

    const suggestionData: SuggestionData = {
      suggestion: payload.suggestion,
      confidence: payload.confidence,
      message: payload.message,
    };

    saveOrderFlowState({ measurements: measurementsMap, suggestion: suggestionData });
    setMeasurementValues(measurementsMap);
    setApiError(null);
  }

  const handleAdvance = () => {
    if (!result) return;
    router.push('/sugestao');
  };

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-2xl px-md py-2xl">
        <StepsHeader currentStep={4} />

        <section className="grid gap-xl lg:grid-cols-[1.2fr_0.8fr]">
          <MeasurementsForm
            onSubmit={handleSubmit}
            submitLabel="Sugerir tamanho"
            successMessage="Sugestão enviada!"
            errorMessage="Não foi possível gerar uma sugestão."
            defaultValues={measurementValues ?? undefined}
          />

          <aside className="flex flex-col gap-md">
            <Card emphasis="muted" className="flex flex-col gap-sm">
              <h2 className="text-h3 font-heading">Seleção atual</h2>
              {uniform && school ? (
                <dl className="flex flex-col gap-xs text-body text-text">
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Escola</dt>
                    <dd className="font-medium">{school.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Cidade</dt>
                    <dd className="font-medium">{school.city}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Uniforme</dt>
                    <dd className="font-medium">{uniform.name}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-body text-text-muted">
                  Carregando informações da escola e uniforme selecionados.
                </p>
              )}
            </Card>

            <Card emphasis="muted" className="flex flex-col gap-sm">
              <h2 className="text-h3 font-heading">Resultado</h2>
              {result ? (
                <div className="flex flex-col gap-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="text-caption text-text-muted">Tamanho sugerido</span>
                    <span className="text-h4 font-heading text-text">{result.suggestion}</span>
                  </div>
                  <p className="text-body text-text">{result.message}</p>
                  <p className="text-caption text-text-muted">
                    Confiança estimada: {(result.confidence * 100).toFixed(0)}%
                  </p>
                  <Button variant="primary" fullWidth onClick={handleAdvance}>
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
