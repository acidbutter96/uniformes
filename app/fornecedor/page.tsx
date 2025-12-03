"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { StepsHeader } from "@/app/components/steps/StepsHeader";
import { Alert } from "@/app/components/ui/Alert";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { cn } from "@/app/lib/utils";
import { loadOrderFlowState, saveOrderFlowState, clearOrderFlowState } from "@/app/lib/storage/order-flow";
import useAuth from "@/src/hooks/useAuth";
import type { ReservationDTO } from "@/src/types/reservation";

interface SupplierDTO {
  id: string;
  name: string;
  city?: string;
  address?: string;
}

export default function SupplierSelectStep() {
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();

  const [orderState, setOrderState] = useState(loadOrderFlowState());
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(orderState.supplierId ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userCity = (user?.address?.city as string | undefined)?.trim() || "";

  useEffect(() => {
    // enforce previous steps
    if (!orderState.schoolId) {
      router.replace("/escola");
      return;
    }
    if (!orderState.uniformId) {
      router.replace("/uniformes");
      return;
    }
    if (!orderState.measurements || !orderState.suggestion || !(orderState.selectedSize ?? orderState.suggestion.suggestion)) {
      router.replace("/medidas");
      return;
    }
  }, [orderState, router]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSuppliers() {
      try {
        const response = await fetch("/api/suppliers", { signal: controller.signal });
        if (!response.ok) throw new Error("Não foi possível carregar fornecedores.");
        const payload = (await response.json()) as { data: SupplierDTO[] };
        setSuppliers(payload.data ?? []);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("Failed to load suppliers", err);
          setError("Falha ao carregar fornecedores.");
        }
      }
    }
    loadSuppliers();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?returnTo=${encodeURIComponent("/fornecedor")}`);
      return;
    }
  }, [loading, user, router]);

  const sortedSuppliers = useMemo(() => {
    const sameCity = suppliers.filter(s => (s.city ?? "").toLowerCase() === userCity.toLowerCase());
    const others = suppliers.filter(s => (s.city ?? "").toLowerCase() !== userCity.toLowerCase());
    return [...sameCity, ...others];
  }, [suppliers, userCity]);

  const finalSize = orderState.selectedSize ?? orderState.suggestion?.suggestion ?? null;

  const handleConfirm = async () => {
    if (!finalSize) {
      setError("Selecione um tamanho anteriormente.");
      router.replace("/sugestao");
      return;
    }
    if (!selectedSupplierId) {
      setError("Selecione um fornecedor para continuar.");
      return;
    }
    if (!accessToken) {
      router.replace(`/login?returnTo=${encodeURIComponent("/fornecedor")}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    saveOrderFlowState({ supplierId: selectedSupplierId });
    setOrderState(current => ({ ...current, supplierId: selectedSupplierId! }));

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userName: typeof user?.name === "string" ? user.name : (orderState.userName ?? "Responsável"),
          schoolId: orderState.schoolId,
          uniformId: orderState.uniformId,
          supplierId: selectedSupplierId,
          measurements: orderState.measurements,
          suggestedSize: finalSize,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.error ?? "Não foi possível registrar a reserva.";
        throw new Error(message);
      }

      const payload = (await response.json()) as { data: ReservationDTO };

      clearOrderFlowState();
      saveOrderFlowState({ orderId: payload.data.id, orderCreatedAt: payload.data.createdAt });
      router.push("/reservas");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao registrar a reserva.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-2xl px-md py-2xl">
        <StepsHeader currentStep={5} />

        <section className="grid gap-xl lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="flex flex-col gap-lg">
            <header className="flex flex-col gap-sm">
              <span className="text-caption font-medium uppercase tracking-wide text-primary">Etapa 5 de 5</span>
              <h1 className="text-h2 font-heading">Escolha o fornecedor preferido</h1>
              <p className="text-body text-text-muted">Selecionaremos fornecedores da sua cidade primeiro; você pode escolher outro se preferir.</p>
            </header>

            {error && <Alert tone="danger" description={error} />}

            <ul className="flex flex-col gap-sm">
              {sortedSuppliers.map(supplier => {
                const selected = supplier.id === selectedSupplierId;
                return (
                  <li key={supplier.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedSupplierId(supplier.id)}
                      className={cn(
                        "flex w-full flex-col gap-xxs rounded-card border px-md py-sm text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-text hover:border-primary/40"
                      )}
                    >
                      <span className="text-body font-semibold">{supplier.name}</span>
                      <span className="text-caption text-text-muted">{supplier.address ?? "Endereço não informado"}</span>
                      <span className="text-caption text-text-muted">{supplier.city ?? "Cidade não informada"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between">
              <span className="text-caption text-text-muted">Você poderá acompanhar em Minhas Reservas.</span>
              <Button size="lg" onClick={handleConfirm} disabled={isSubmitting || !selectedSupplierId}>
                {isSubmitting ? "Confirmando..." : "Confirmar fornecedor e reservar"}
              </Button>
            </div>
          </Card>

          <aside className="flex flex-col gap-md">
            <Card emphasis="muted" className="flex flex-col gap-sm">
              <h2 className="text-h3 font-heading">Resumo</h2>
              <dl className="flex flex-col gap-xs text-body text-text">
                <div className="flex justify-between">
                  <dt className="text-text-muted">Cidade do usuário</dt>
                  <dd className="font-medium">{userCity || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Fornecedor escolhido</dt>
                  <dd className="font-medium">{sortedSuppliers.find(s => s.id === selectedSupplierId)?.name ?? "—"}</dd>
                </div>
              </dl>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  );
}
