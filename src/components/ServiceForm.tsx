"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  IconArrowLeft,
  IconHands,
  IconMic,
  IconMusic,
  IconPlus,
  IconSave,
  IconSparkles,
  IconTrash,
  IconUsers,
  IconX,
} from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/Modal";
import { MiniPhotoPicker, PhotoPicker } from "@/components/ui/PhotoPicker";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage, type ApiError } from "@/lib/api";
import { todayISO } from "@/lib/format";
import { validateService } from "@/lib/validation";
import {
  SERVICE_KINDS,
  SERVICE_STATUS,
  type MemberWithRoles,
  type ServiceDTO,
  type SingerPayload,
} from "@/lib/types";

type Errors = Record<string, string>;

type FormState = {
  title: string;
  kind: string;
  serviceDate: string;
  serviceTime: string;
  leader: string;
  preacherName: string;
  preacherPhoto: string | null;
  preacherMemberId: number | null;
  singers: SingerPayload[];
  intercessors: string[];
  theme: string;
  scripture: string;
  notes: string;
  status: string;
};

function toFormState(service?: ServiceDTO | null): FormState {
  return {
    title: service?.title ?? "Culto de Celebração",
    kind: service?.kind ?? "Culto de Celebração",
    serviceDate: service?.serviceDate ?? todayISO(),
    serviceTime: service?.serviceTime?.slice(0, 5) ?? "19:00",
    leader: service?.leader ?? "",
    preacherName: service?.preacherName ?? "",
    preacherPhoto: service?.preacherPhoto ?? null,
    preacherMemberId: service?.preacherMemberId ?? null,
    singers: (service?.singers ?? []).map((singer) => ({
      name: singer.name,
      photo: singer.photo,
      memberId: singer.memberId ?? null,
    })),
    intercessors: service?.intercessors ?? [],
    theme: service?.theme ?? "",
    scripture: service?.scripture ?? "",
    notes: service?.notes ?? "",
    status: service?.status ?? "agendado",
  };
}

export function ServiceForm({
  mode,
  serviceId,
  service,
  members,
}: {
  mode: "create" | "edit";
  serviceId?: number;
  service?: ServiceDTO | null;
  members: MemberWithRoles[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(() => toFormState(service));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [intercessorDraft, setIntercessorDraft] = useState("");
  const intercessorInput = useRef<HTMLInputElement>(null);

  const memberNames = useMemo(() => members.map((member) => member.name), [members]);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function applyMemberToPreacher(memberId: string) {
    const id = Number(memberId);
    const member = members.find((item) => item.id === id);
    if (!member) {
      update("preacherMemberId", null);
      return;
    }
    setForm((current) => ({
      ...current,
      preacherMemberId: member.id,
      preacherName: member.name,
      preacherPhoto: member.photo ?? current.preacherPhoto,
    }));
    setDirty(true);
    toast("info", "Pregador vinculado", `${member.name} foi carregado com a foto do cadastro.`);
  }

  function addSinger() {
    setForm((current) => ({
      ...current,
      singers: [...current.singers, { name: "", photo: null, memberId: null }],
    }));
    setDirty(true);
  }

  function updateSinger(index: number, patch: Partial<SingerPayload>) {
    setForm((current) => ({
      ...current,
      singers: current.singers.map((singer, i) => (i === index ? { ...singer, ...patch } : singer)),
    }));
    setDirty(true);
    setErrors((current) => {
      const next = { ...current };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`singers.${index}.`)) delete next[key];
      });
      return next;
    });
  }

  function removeSinger(index: number) {
    setForm((current) => ({
      ...current,
      singers: current.singers.filter((_, i) => i !== index),
    }));
    setDirty(true);
  }

  function applyMemberToSinger(index: number, memberId: string) {
    const member = members.find((item) => item.id === Number(memberId));
    if (!member) {
      updateSinger(index, { memberId: null });
      return;
    }
    updateSinger(index, { memberId: member.id, name: member.name, photo: member.photo ?? null });
  }

  function addIntercessor(rawValue?: string) {
    const value = (rawValue ?? intercessorDraft).trim();
    if (value.length < 2) return;
    if (form.intercessors.some((item) => item.toLowerCase() === value.toLowerCase())) {
      toast("warning", "Nome duplicado", `${value} já está na lista de intercessores.`);
      setIntercessorDraft("");
      return;
    }
    setForm((current) => ({ ...current, intercessors: [...current.intercessors, value] }));
    setIntercessorDraft("");
    setDirty(true);
  }

  function onIntercessorKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addIntercessor();
    }
    if (event.key === "Backspace" && intercessorDraft === "" && form.intercessors.length > 0) {
      event.preventDefault();
      setForm((current) => ({ ...current, intercessors: current.intercessors.slice(0, -1) }));
      setDirty(true);
    }
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (saving) return;

    const payload = {
      title: form.title.trim(),
      kind: form.kind.trim() || null,
      serviceDate: form.serviceDate,
      serviceTime: form.serviceTime,
      leader: form.leader.trim(),
      preacherName: form.preacherName.trim() || null,
      preacherPhoto: form.preacherPhoto,
      preacherMemberId: form.preacherMemberId,
      singers: form.singers
        .map((singer) => ({ ...singer, name: singer.name.trim() }))
        .filter((singer) => singer.name.length > 0),
      intercessors: form.intercessors,
      theme: form.theme.trim() || null,
      scripture: form.scripture.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
    };

    const validation = validateService(payload);
    if (!validation.ok) {
      setErrors(validation.errors);
      const firstKey = Object.keys(validation.errors)[0];
      const element = firstKey ? document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`) : null;
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast("error", "Revise os campos", "Há informações obrigatórias pendentes no formulário.");
      return;
    }

    setSaving(true);
    try {
      if (mode === "edit" && serviceId) {
        await api.services.update(serviceId, validation.data);
        setDirty(false);
        toast("success", "Culto atualizado", `${validation.data.title} foi salvo na agenda.`);
        router.push("/agenda");
        router.refresh();
      } else {
        const response = await api.services.create(validation.data);
        setDirty(false);
        toast("success", "Culto agendado", "Você já pode gerar o flyer de divulgação.");
        router.push(`/agenda?destaque=${response.data.id}`);
        router.refresh();
      }
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.errors && Object.keys(apiError.errors).length > 0) setErrors(apiError.errors);
      toast("error", "Não foi possível salvar", errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              icon={<IconSparkles size={18} />}
              title="Informações do culto"
              subtitle="Data, hora e tema aparecem no flyer gerado."
            />
            <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
              <div data-field="title" className="sm:col-span-2">
                <Field label="Título do culto" htmlFor="title" required error={errors.title}>
                  <TextInput
                    id="title"
                    value={form.title}
                    onChange={(event) => update("title", event.target.value)}
                    placeholder="Ex.: Culto de Celebração"
                    invalid={Boolean(errors.title)}
                    maxLength={140}
                  />
                </Field>
              </div>
              <Field label="Tipo de culto" htmlFor="kind">
                <TextInput
                  id="kind"
                  list="service-kinds"
                  value={form.kind}
                  onChange={(event) => update("kind", event.target.value)}
                  placeholder="Ex.: Santa Ceia"
                  maxLength={80}
                />
                <datalist id="service-kinds">
                  {SERVICE_KINDS.map((kind) => (
                    <option key={kind} value={kind} />
                  ))}
                </datalist>
              </Field>
              <Field label="Situação" htmlFor="status">
                <Select id="status" value={form.status} onChange={(event) => update("status", event.target.value)}>
                  {SERVICE_STATUS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <div data-field="serviceDate">
                <Field label="Data" htmlFor="serviceDate" required error={errors.serviceDate}>
                  <TextInput
                    id="serviceDate"
                    type="date"
                    value={form.serviceDate}
                    onChange={(event) => update("serviceDate", event.target.value)}
                    invalid={Boolean(errors.serviceDate)}
                  />
                </Field>
              </div>
              <div data-field="serviceTime">
                <Field label="Hora" htmlFor="serviceTime" required error={errors.serviceTime}>
                  <TextInput
                    id="serviceTime"
                    type="time"
                    value={form.serviceTime}
                    onChange={(event) => update("serviceTime", event.target.value)}
                    invalid={Boolean(errors.serviceTime)}
                  />
                </Field>
              </div>
              <div data-field="theme">
                <Field label="Tema" htmlFor="theme">
                  <TextInput
                    id="theme"
                    value={form.theme}
                    onChange={(event) => update("theme", event.target.value)}
                    placeholder="Ex.: Renascendo para uma nova história"
                    maxLength={200}
                  />
                </Field>
              </div>
              <Field label="Texto bíblico" htmlFor="scripture">
                <TextInput
                  id="scripture"
                  value={form.scripture}
                  onChange={(event) => update("scripture", event.target.value)}
                  placeholder="Ex.: 2 Coríntios 5.17"
                  maxLength={200}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={<IconUsers size={18} />}
              title="Equipe ministerial"
              subtitle="Dirigente, pregador (com foto), cantores (com foto) e intercessores."
            />
            <div className="space-y-5 px-4 py-4 sm:px-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div data-field="leader">
                  <Field label="Dirigente" htmlFor="leader" required error={errors.leader}>
                    <TextInput
                      id="leader"
                      list="member-names"
                      value={form.leader}
                      onChange={(event) => update("leader", event.target.value)}
                      placeholder="Nome do dirigente"
                      invalid={Boolean(errors.leader)}
                      maxLength={140}
                    />
                  </Field>
                </div>
                <Field label="Pregador" htmlFor="preacherName" error={errors.preacherName}>
                  <TextInput
                    id="preacherName"
                    list="member-names"
                    value={form.preacherName}
                    onChange={(event) => {
                      update("preacherName", event.target.value);
                      setForm((current) => ({ ...current, preacherMemberId: null }));
                    }}
                    placeholder="Nome do pregador"
                    maxLength={140}
                  />
                </Field>
              </div>

              <datalist id="member-names">
                {memberNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>

              <div className="grid gap-4 rounded-xl border border-line bg-surface/60 p-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <Field label="Vincular pregador ao cadastro" htmlFor="preacherMemberId">
                  <Select
                    id="preacherMemberId"
                    value={form.preacherMemberId ?? ""}
                    onChange={(event) => applyMemberToPreacher(event.target.value)}
                  >
                    <option value="">Selecionar membro cadastrado…</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                        {member.roles.length > 0 ? ` · ${member.roles[0].title}` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div data-field="preacherPhoto" className="sm:pb-1">
                  <MiniPhotoPicker
                    value={form.preacherPhoto}
                    onChange={(value) => update("preacherPhoto", value)}
                    name={form.preacherName || "Pregador"}
                  />
                </div>
              </div>
              {errors.preacherPhoto ? (
                <p className="text-xs font-medium text-danger">{errors.preacherPhoto}</p>
              ) : null}

              {/* Cantores */}
              <div>
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                    <IconMusic size={16} className="text-brand-600" />
                    Cantores / louvor
                    <Badge tone="neutral">{form.singers.length}</Badge>
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={addSinger}>
                    <IconPlus size={15} />
                    Adicionar cantor
                  </Button>
                </div>

                {form.singers.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-ink-500">
                    Nenhum cantor escalado. Adicione os ministros de louvor (a foto é opcional e usada no flyer).
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {form.singers.map((singer, index) => (
                      <li
                        key={`singer-${index}`}
                        className="flex flex-col gap-3 rounded-xl border border-line bg-surface/60 p-3 sm:flex-row sm:items-center"
                      >
                        <div data-field={`singers.${index}.photo`}>
                          <MiniPhotoPicker
                            value={singer.photo}
                            onChange={(value) => updateSinger(index, { photo: value })}
                            name={singer.name || "Cantor"}
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <TextInput
                            value={singer.name}
                            onChange={(event) => updateSinger(index, { name: event.target.value })}
                            placeholder="Nome do cantor(a)"
                            aria-label={`Nome do cantor ${index + 1}`}
                            list="member-names"
                            invalid={Boolean(errors[`singers.${index}.name`])}
                            maxLength={140}
                          />
                          {errors[`singers.${index}.name`] ? (
                            <p className="text-xs font-medium text-danger">{errors[`singers.${index}.name`]}</p>
                          ) : null}
                          <Select
                            value={singer.memberId ?? ""}
                            onChange={(event) => applyMemberToSinger(index, event.target.value)}
                            aria-label={`Vincular cantor ${index + 1} a um membro`}
                          >
                            <option value="">Vincular a um membro cadastrado…</option>
                            {members.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <button
                          type="button"
                          className="icon-btn self-start text-danger hover:bg-danger-soft sm:self-center"
                          onClick={() => removeSinger(index)}
                          aria-label={`Remover cantor ${index + 1}`}
                        >
                          <IconTrash size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Intercessores */}
              <div>
                <p className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-ink-800">
                  <IconHands size={16} className="text-brand-600" />
                  Intercessores
                  <Badge tone="neutral">{form.intercessors.length}</Badge>
                </p>
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-2.5">
                  {form.intercessors.map((name) => (
                    <span key={name} className="chip border-brand-100 bg-brand-50 text-brand-700">
                      {name}
                      <button
                        type="button"
                        onClick={() => {
                          setForm((current) => ({
                            ...current,
                            intercessors: current.intercessors.filter((item) => item !== name),
                          }));
                          setDirty(true);
                        }}
                        aria-label={`Remover ${name}`}
                        className="text-brand-400 transition hover:text-danger"
                      >
                        <IconX size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={intercessorInput}
                    value={intercessorDraft}
                    onChange={(event) => setIntercessorDraft(event.target.value)}
                    onKeyDown={onIntercessorKeyDown}
                    onBlur={() => addIntercessor()}
                    list="member-names"
                    placeholder={form.intercessors.length === 0 ? "Digite o nome e pressione Enter" : "Adicionar outro…"}
                    className="min-w-[180px] flex-1 bg-transparent px-2 py-1.5 text-sm text-ink-900 outline-none placeholder:text-ink-400"
                    aria-label="Adicionar intercessor"
                  />
                  <Button type="button" size="sm" variant="ghost" onClick={() => addIntercessor()}>
                    <IconPlus size={15} />
                    Add
                  </Button>
                </div>
                <p className="mt-1.5 text-xs text-ink-400">
                  Dica: pressione Enter ou vírgula para adicionar vários nomes rapidamente.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader icon={<IconMic size={18} />} title="Observações" />
            <div className="px-4 py-4 sm:px-5">
              <TextArea
                rows={4}
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder="Avisos, ensaio do louvor, recepção, translado do pregador…"
                maxLength={4000}
              />
            </div>
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-5">
          <Card className="bg-gradient-to-br from-brand-950 to-brand-800 text-brand-100">
            <div className="space-y-3 px-4 py-5 sm:px-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-300">
                Prévia do culto
              </p>
              <p className="font-display text-xl font-extrabold leading-tight text-white">
                {form.title || "Sem título"}
              </p>
              <p className="text-sm text-brand-200">
                {form.kind || "Culto"} · {form.serviceDate.split("-").reverse().join("/")} às {form.serviceTime}
              </p>
              <dl className="space-y-1.5 border-t border-white/15 pt-3 text-[13px]">
                <Row label="Dirigente" value={form.leader} />
                <Row label="Pregador" value={form.preacherName} />
                <Row
                  label="Cantores"
                  value={form.singers.map((singer) => singer.name).filter(Boolean).join(", ")}
                />
                <Row label="Intercessores" value={form.intercessors.join(", ")} />
              </dl>
              <p className="rounded-lg bg-white/10 px-3 py-2 text-[12px] leading-snug text-brand-100">
                Após salvar, use <strong>Gerar flyer</strong> na agenda para montar a arte com fotos e os dados
                oficiais da igreja.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Foto do pregador (ampliada)" subtitle="Usada em destaque no flyer." />
            <div className="px-4 py-4 sm:px-5">
              <PhotoPicker
                value={form.preacherPhoto}
                onChange={(value) => update("preacherPhoto", value)}
                name={form.preacherName || "Pregador"}
                label="Foto"
                size={120}
                outputSize={720}
              />
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-surface/92 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-500">
            {form.singers.length} cantor(es) · {form.intercessors.length} intercessor(es) ·{" "}
            {dirty ? "há alterações não salvas" : "tudo salvo"}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              onClick={() => (dirty ? setConfirmLeave(true) : router.back())}
              disabled={saving}
            >
              <IconArrowLeft size={16} />
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={saving} disabled={saving}>
              {saving ? null : <IconSave size={16} />}
              {saving ? "Salvando…" : mode === "edit" ? "Salvar alterações" : "Agendar culto"}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        title="Descartar alterações?"
        message="As alterações deste culto ainda não foram salvas na agenda."
        confirmLabel="Sair sem salvar"
        cancelLabel="Continuar editando"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          setDirty(false);
          router.push("/agenda");
        }}
      />
    </form>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-brand-300">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-white">{value || "—"}</dd>
    </div>
  );
}
