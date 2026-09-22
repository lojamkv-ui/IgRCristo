"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CanvaMark } from "@/components/CanvaPanel";
import { IconCheckCircle, IconCopy, IconExternal, IconRefresh, IconX } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Badge, Button, Card, CardHeader, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage, type CanvaStatus } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

export function CanvaSettingsCard() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<CanvaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.canva.status();
      setStatus(response.data);
    } catch (error) {
      toast("error", "Falha ao verificar o Canva", errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Feedback do retorno do OAuth (?canva=conectado|erro)
  useEffect(() => {
    const result = params.get("canva");
    if (!result) return;
    if (result === "conectado") toast("success", "Canva conectado", "Agora você pode criar designs direto pela agenda.");
    else if (result === "nao-configurado") toast("warning", "Canva não configurado", "Defina CANVA_CLIENT_ID e CANVA_CLIENT_SECRET.");
    else if (result === "erro") toast("error", "Falha ao conectar ao Canva", params.get("motivo") ?? "Tente novamente.");
    router.replace("/configuracoes", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("success", `${label} copiado`);
    } catch {
      toast("error", "Não foi possível copiar");
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      await api.canva.disconnect();
      toast("info", "Canva desconectado");
      setConfirm(false);
      await load();
    } catch (error) {
      toast("error", "Falha ao desconectar", errorMessage(error));
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <Card as="section">
      <div id="canva" className="scroll-mt-24" />
      <CardHeader
        icon={<CanvaMark size={20} />}
        title="Integração com o Canva"
        subtitle="Envie flyers para o Canva como designs editáveis e use modelos da sua biblioteca."
        action={
          <button type="button" className="icon-btn" onClick={() => void load()} aria-label="Atualizar status">
            <IconRefresh size={16} />
          </button>
        }
      />
      <div className="space-y-4 px-4 py-4 sm:px-5">
        {loading && !status ? (
          <Skeleton className="h-16 w-full" />
        ) : status ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={status.configured ? "success" : "warning"}>
                {status.configured ? "Credenciais configuradas" : "Credenciais ausentes"}
              </Badge>
              <Badge tone={status.connected ? "success" : "neutral"} icon={status.connected ? <IconCheckCircle size={12} /> : undefined}>
                {status.connected ? `Conectado: ${status.user?.displayName ?? "usuário"}` : "Não conectado"}
              </Badge>
              {status.user?.since ? (
                <span className="text-[11px] text-ink-400">desde {formatDateTime(status.user.since)}</span>
              ) : null}
            </div>

            {!status.configured ? (
              <ol className="list-decimal space-y-1.5 rounded-xl bg-surface-alt px-4 py-3 pl-8 text-[13px] leading-relaxed text-ink-700">
                <li>
                  Acesse{" "}
                  <a href="https://www.canva.com/developers/apps" target="_blank" rel="noreferrer" className="link">
                    canva.com/developers/apps
                  </a>{" "}
                  e crie um app do tipo <strong>Connect API</strong>.
                </li>
                <li>
                  Em <strong>Scopes</strong>, habilite: {status.scopes.join(", ")}.
                </li>
                <li>
                  Em <strong>Redirect URLs</strong>, adicione a URL abaixo.
                </li>
                <li>
                  Copie o <strong>Client ID</strong> e gere um <strong>Client secret</strong>; defina-os como variáveis{" "}
                  <code>CANVA_CLIENT_ID</code> e <code>CANVA_CLIENT_SECRET</code> no servidor e reinicie.
                </li>
              </ol>
            ) : null}

            <div>
              <p className="label">URL de redirecionamento (cadastre no app do Canva)</p>
              <div className="flex gap-2">
                <code className="min-w-0 flex-1 truncate rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] text-ink-800">
                  {status.redirectUrl}
                </code>
                <Button type="button" variant="outline" size="sm" onClick={() => void copy(status.redirectUrl, "URL")}>
                  <IconCopy size={14} />
                  Copiar
                </Button>
              </div>
            </div>

            <div>
              <p className="label">Escopos necessários</p>
              <div className="flex flex-wrap gap-1.5">
                {status.scopes.map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    className="chip transition hover:border-brand-300 hover:text-brand-700"
                    onClick={() => void copy(scope, "Escopo")}
                    title="Copiar"
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>

            <p className="rounded-xl border border-gold-200 bg-[#fdf8ec] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#7a5a12]">
              <strong>O que funciona em cada plano:</strong> enviar a arte gerada e abrir seus designs funciona em
              qualquer conta. O <strong>preenchimento automático de Brand Templates</strong> exige Canva Enterprise.
              A biblioteca pública de modelos do Canva não é acessível pela API — salve o modelo na sua conta e ele
              aparecerá em “Modelos da minha biblioteca”.
            </p>

            <div className="flex flex-wrap gap-2">
              {status.configured && !status.connected ? (
                <a href="/api/canva/connect?returnTo=/configuracoes" className="btn btn-primary">
                  <CanvaMark size={16} />
                  Conectar ao Canva
                </a>
              ) : null}
              {status.connected ? (
                <>
                  <a href="https://www.canva.com/projects" target="_blank" rel="noreferrer" className="btn btn-outline">
                    <IconExternal size={16} />
                    Abrir meus projetos no Canva
                  </a>
                  <Button type="button" variant="danger" onClick={() => setConfirm(true)}>
                    <IconX size={16} />
                    Desconectar
                  </Button>
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirm}
        title="Desconectar do Canva"
        message="O acesso será revogado. Os designs já criados continuam na sua conta do Canva."
        confirmLabel="Desconectar"
        loading={disconnecting}
        onCancel={() => setConfirm(false)}
        onConfirm={disconnect}
      />
    </Card>
  );
}
