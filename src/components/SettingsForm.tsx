"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  IconChurch,
  IconDatabase,
  IconDownload,
  IconImage,
  IconSave,
  IconShield,
  IconUpload,
} from "@/components/icons";
import { Suspense } from "react";
import { CanvaSettingsCard } from "@/components/CanvaSettingsCard";
import { ConfirmDialog } from "@/components/ui/Modal";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Select,
  TextInput,
} from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage, type ApiError } from "@/lib/api";
import { maskCEP, maskCNPJ, maskPhone, onlyDigits } from "@/lib/format";
import type { SettingsDTO } from "@/lib/types";
import { FLYER_THEMES, themeGradient } from "@/lib/flyer-themes";


export function SettingsForm({ settings }: { settings: SettingsDTO }) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    churchName: settings.churchName ?? "",
    president: settings.president ?? "",
    email: settings.email ?? "",
    phone: settings.phone ?? "",
    cnpj: settings.cnpj ?? "",
    address: settings.address ?? "",
    city: settings.city ?? "",
    cep: settings.cep ?? "",
    website: settings.website ?? "",
    instagram: settings.instagram ?? "",
    flyerPalette: settings.flyerPalette ?? "royal",
    logo: settings.logo ?? null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ payload: unknown; name: string } | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      await api.settings.update(form);
      toast("success", "Configurações salvas", "Os dados institucionais foram atualizados e já valem para os flyers.");
      router.refresh();
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.errors) setErrors(apiError.errors);
      toast("error", "Não foi possível salvar", errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function exportBackup() {
    setExporting(true);
    try {
      const response = await api.backup.export();
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-igreja-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast(
        "success",
        "Backup exportado",
        `${response.counts.members} membro(s), ${response.counts.roles} cargo(s) e ${response.counts.services} culto(s).`,
      );
    } catch (error) {
      toast("error", "Falha ao exportar", errorMessage(error));
    } finally {
      setExporting(false);
    }
  }

  async function onImportFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (file.size > 40 * 1024 * 1024) {
      toast("error", "Arquivo muito grande", "Envie um backup de até 40 MB.");
      return;
    }
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as unknown;
      setPendingImport({ payload, name: file.name });
    } catch {
      toast("error", "Arquivo inválido", "Selecione um JSON exportado por este sistema.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function runImport() {
    if (!pendingImport) return;
    setImporting(true);
    try {
      const response = await api.backup.import("replace", pendingImport.payload);
      toast(
        "success",
        "Backup restaurado",
        `${response.data.imported.members ?? 0} membro(s) e ${response.data.imported.services ?? 0} culto(s) importados.`,
      );
      setPendingImport(null);
      router.refresh();
    } catch (error) {
      toast("error", "Falha ao importar", errorMessage(error));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Card>
          <CardHeader
            icon={<IconChurch size={18} />}
            title="Dados institucionais"
            subtitle="Essas informações aparecem no rodapé de todos os flyers e documentos gerados."
          />
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
            <Field label="Nome da igreja" htmlFor="churchName" required error={errors.churchName} className="sm:col-span-2">
              <TextInput
                id="churchName"
                value={form.churchName}
                onChange={(event) => update("churchName", event.target.value)}
                invalid={Boolean(errors.churchName)}
                maxLength={160}
              />
            </Field>
            <Field label="Pastor presidente" htmlFor="president" className="sm:col-span-2">
              <TextInput
                id="president"
                value={form.president}
                onChange={(event) => update("president", event.target.value)}
                placeholder="Pr. Presidente Wellington Felicio Vieira"
                maxLength={160}
              />
            </Field>
            <Field label="E-mail" htmlFor="email" error={errors.email}>
              <TextInput
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                invalid={Boolean(errors.email)}
                maxLength={160}
              />
            </Field>
            <Field label="Telefone / WhatsApp" htmlFor="phone" error={errors.phone}>
              <TextInput
                id="phone"
                type="tel"
                inputMode="tel"
                value={form.phone ? maskPhone(form.phone) : ""}
                onChange={(event) => update("phone", event.target.value.replace(/\D/g, "").slice(0, 11))}
                invalid={Boolean(errors.phone)}
              />
            </Field>
            <Field label="CNPJ" htmlFor="cnpj" error={errors.cnpj}>
              <TextInput
                id="cnpj"
                inputMode="numeric"
                value={form.cnpj ? maskCNPJ(form.cnpj) : ""}
                onChange={(event) => update("cnpj", onlyDigits(event.target.value).slice(0, 14))}
                invalid={Boolean(errors.cnpj)}
                placeholder="00.000.000/0000-00"
              />
            </Field>
            <Field label="CEP" htmlFor="cep" error={errors.cep}>
              <TextInput
                id="cep"
                inputMode="numeric"
                value={form.cep ? maskCEP(form.cep) : ""}
                onChange={(event) => update("cep", onlyDigits(event.target.value).slice(0, 8))}
                invalid={Boolean(errors.cep)}
                placeholder="00000-000"
              />
            </Field>
            <Field label="Endereço" htmlFor="address" className="sm:col-span-2">
              <TextInput
                id="address"
                value={form.address}
                onChange={(event) => update("address", event.target.value)}
                placeholder="R Nicanor Albernaz, QD. 02 LT. 01 - Setor Cristina"
                maxLength={300}
              />
            </Field>
            <Field label="Cidade / UF" htmlFor="city">
              <TextInput
                id="city"
                value={form.city}
                onChange={(event) => update("city", event.target.value)}
                placeholder="Trindade - GO"
                maxLength={120}
              />
            </Field>
            <Field label="Instagram / site" htmlFor="instagram">
              <TextInput
                id="instagram"
                value={form.instagram}
                onChange={(event) => update("instagram", event.target.value)}
                placeholder="@renascendoemcristo"
                maxLength={120}
              />
            </Field>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-ink-500">
              Salve antes de gerar novos flyers para que as informações atualizadas sejam usadas.
            </p>
            <Button type="button" variant="primary" loading={saving} onClick={() => void save()}>
              {saving ? null : <IconSave size={16} />}
              {saving ? "Salvando…" : "Salvar configurações"}
            </Button>
          </div>
        </Card>

        <Suspense fallback={null}>
          <CanvaSettingsCard />
        </Suspense>

        <Card>
          <CardHeader
            icon={<IconDatabase size={18} />}
            title="Backup e restauração"
            subtitle="Previna perda de dados: exporte um arquivo com todos os cadastros, cargos, histórico e agenda."
          />
          <div className="space-y-4 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" loading={exporting} onClick={() => void exportBackup()}>
                {exporting ? null : <IconDownload size={16} />}
                Exportar backup (JSON)
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => void onImportFile(event.target.files)}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <IconUpload size={16} />
                Importar backup
              </Button>
            </div>
            <p className="rounded-xl bg-surface-alt px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-600">
              A importação <strong>substitui</strong> os dados atuais pelos dados do arquivo. Exporte um
              backup antes de restaurar, principalmente em computadores compartilhados.
            </p>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader icon={<IconImage size={18} />} title="Identidade do flyer" />
          <div className="space-y-4 px-4 py-4 sm:px-5">
            <Field label="Tema padrão do flyer" htmlFor="flyerPalette" hint="Pode ser trocado a cada flyer na hora de gerar.">
              <Select
                id="flyerPalette"
                value={form.flyerPalette}
                onChange={(event) => update("flyerPalette", event.target.value)}
              >
                {FLYER_THEMES.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.label} — {theme.description}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-6 gap-1.5" aria-hidden="true">
              {FLYER_THEMES.map((theme) => (
                <span
                  key={theme.id}
                  className={`h-8 rounded-lg ring-2 transition ${
                    theme.id === form.flyerPalette ? "ring-brand-500" : "ring-transparent"
                  }`}
                  style={{ background: themeGradient(theme) }}
                  title={theme.label}
                />
              ))}
            </div>
            <PhotoPicker
              value={form.logo}
              onChange={(value) => update("logo", value)}
              name={form.churchName}
              label="Logo da igreja"
              shape="square"
              size={92}
              outputSize={420}
              hint="Opcional — exibida no cabeçalho do flyer."
            />
            <Button type="button" variant="primary" loading={saving} onClick={() => void save()} full>
              <IconSave size={16} />
              Salvar identidade
            </Button>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-brand-50 to-white">
          <div className="space-y-3 px-4 py-4 sm:px-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
              <IconShield size={14} />
              Como seus dados são protegidos
            </p>
            <ul className="space-y-2 text-[13px] leading-relaxed text-ink-600">
              <li className="flex gap-2">
                <Badge tone="success">1</Badge>
                Cadastros, cargos e histórico ficam no banco PostgreSQL da igreja — nada se perde ao limpar o
                navegador.
              </li>
              <li className="flex gap-2">
                <Badge tone="success">2</Badge>
                Cada alteração registra data, hora, tipo e os valores anteriores/novos.
              </li>
              <li className="flex gap-2">
                <Badge tone="success">3</Badge>
                Rascunhos de formulários são guardados localmente para evitar perda por queda de conexão.
              </li>
            </ul>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(pendingImport)}
        title="Restaurar backup"
        loading={importing}
        confirmLabel="Substituir dados"
        message={
          <>
            O arquivo <strong>{pendingImport?.name}</strong> vai substituir todos os membros, cargos,
            histórico e cultos atuais.
            <br />
            Recomendamos exportar um backup antes de continuar.
          </>
        }
        onCancel={() => setPendingImport(null)}
        onConfirm={runImport}
      />
    </div>
  );
}
