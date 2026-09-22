"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  IconAlert,
  IconArrowLeft,
  IconCalendar,
  IconCheck,
  IconPlus,
  IconSave,
  IconStar,
  IconTrash,
  IconUsers,
} from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/Modal";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
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
import { maskPhone } from "@/lib/format";
import { validateMember } from "@/lib/validation";
import {
  ECCLESIASTICAL_ROLES,
  GENDERS,
  KINSHIPS,
  LOCAL_ROLES,
  MEMBER_STATUS,
  type MemberWithRoles,
  type RolePayload,
} from "@/lib/types";

type Errors = Record<string, string>;

const EMPTY_ROLE = (kind: RolePayload["kind"]): RolePayload => ({
  id: null,
  kind,
  title: "",
  consecrationDate: null,
  startDate: null,
  endDate: null,
});

function toFormState(member?: MemberWithRoles | null) {
  return {
    name: member?.name ?? "",
    photo: member?.photo ?? null,
    birthDate: member?.birthDate ?? "",
    gender: member?.gender ?? "",
    email: member?.email ?? "",
    phone: member?.phone ?? "",
    address: member?.address ?? "",
    city: member?.city ?? "",
    kinship: member?.kinship ?? "",
    familyName: member?.familyName ?? "",
    baptismDate: member?.baptismDate ?? "",
    memberSince: member?.memberSince ?? "",
    status: member?.status ?? "ativo",
    notes: member?.notes ?? "",
    roles: (member?.roles ?? []).map<RolePayload>((role) => ({
      id: role.id,
      kind: role.kind === "eclesiastico" ? "eclesiastico" : "local",
      title: role.title,
      consecrationDate: role.consecrationDate ?? "",
      startDate: role.startDate ?? "",
      endDate: role.endDate ?? "",
    })),
  };
}

type FormState = ReturnType<typeof toFormState>;

export function MemberForm({
  mode,
  memberId,
  member,
}: {
  mode: "create" | "edit";
  memberId?: number;
  member?: MemberWithRoles | null;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(() => toFormState(member));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draft, setDraft] = useState<FormState | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const firstRender = useRef(true);

  const draftKey = useMemo(
    () => `rec-member:${mode}:${memberId ?? "novo"}`,
    [mode, memberId],
  );

  /* --------------------------- rascunho local --------------------------- */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { savedAt: string; state: FormState };
      if (parsed?.state) {
        setDraft(parsed.state);
        setDraftSavedAt(new Date(parsed.savedAt));
      }
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(
          draftKey,
          JSON.stringify({ savedAt: new Date().toISOString(), state: form }),
        );
        setDraftSavedAt(new Date());
      } catch {
        // armazenamento cheio/indisponível: ignora silenciosamente
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [form, dirty, draftKey]);

  /* --------------------- aviso ao fechar a aba ------------------------- */
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    firstRender.current = false;
  }, []);

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

  const ecclesiastical = form.roles.filter((role) => role.kind === "eclesiastico");
  const local = form.roles.filter((role) => role.kind === "local");

  function addRole(kind: RolePayload["kind"]) {
    setForm((current) => ({ ...current, roles: [...current.roles, EMPTY_ROLE(kind)] }));
    setDirty(true);
  }

  function updateRole(index: number, patch: Partial<RolePayload>) {
    setForm((current) => ({
      ...current,
      roles: current.roles.map((role, i) => (i === index ? { ...role, ...patch } : role)),
    }));
    setDirty(true);
    setErrors((current) => {
      const next = { ...current };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`roles.${index}.`)) delete next[key];
      });
      return next;
    });
  }

  function removeRole(index: number) {
    setForm((current) => ({ ...current, roles: current.roles.filter((_, i) => i !== index) }));
    setDirty(true);
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (saving) return;

    const payload = {
      ...form,
      photo: form.photo || null,
      birthDate: form.birthDate || null,
      gender: form.gender || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      city: form.city || null,
      kinship: form.kinship || null,
      familyName: form.familyName || null,
      baptismDate: form.baptismDate || null,
      memberSince: form.memberSince || null,
      notes: form.notes || null,
      roles: form.roles
        .filter((role) => role.title.trim().length > 0 || role.kind)
        .map((role) => ({
          ...role,
          title: role.title.trim(),
          consecrationDate: role.consecrationDate || null,
          startDate: role.startDate || null,
          endDate: role.endDate || null,
        })),
    };

    const validation = validateMember(payload);
    if (!validation.ok) {
      setErrors(validation.errors);
      const firstKey = Object.keys(validation.errors)[0];
      const element = firstKey
        ? document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`)
        : null;
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.focus?.({ preventScroll: true });
      toast(
        "error",
        "Revise os campos destacados",
        `${Object.keys(validation.errors).length} pendência(s) encontrada(s) no formulário.`,
      );
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      if (mode === "edit" && memberId) {
        const response = await api.members.update(memberId, validation.data);
        window.localStorage.removeItem(draftKey);
        setDirty(false);
        toast("success", "Cadastro atualizado", `${response.data.name} foi salvo com histórico de alterações.`);
        router.push(`/membros/${memberId}`);
        router.refresh();
      } else {
        const response = await api.members.create(validation.data);
        window.localStorage.removeItem(draftKey);
        setDirty(false);
        toast("success", "Membro cadastrado", `${response.data.name} foi adicionado à igreja.`);
        router.push(`/membros/${response.data.id}`);
        router.refresh();
      }
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.errors && Object.keys(apiError.errors).length > 0) {
        setErrors(apiError.errors);
      }
      toast("error", "Não foi possível salvar", errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function restoreDraft() {
    if (!draft) return;
    setForm(draft);
    setDirty(true);
    setDraft(null);
    toast("info", "Rascunho restaurado", "Os dados não enviados foram recuperados.");
  }

  function discardDraft() {
    window.localStorage.removeItem(draftKey);
    setDraft(null);
    toast("info", "Rascunho descartado");
  }

  const totalRoles = form.roles.length;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Rascunho recuperável */}
      {draft ? (
        <div className="animate-fade-in flex flex-col gap-3 rounded-xl border border-gold-300 bg-[#fdf8ec] px-4 py-3 sm:flex-row sm:items-center">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold-200 text-[#8a6412]">
            <IconAlert size={18} />
          </span>
          <p className="flex-1 text-sm leading-snug text-ink-700">
            Encontramos um <strong>rascunho não enviado</strong>
            {draftSavedAt ? ` de ${draftSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}.
            Deseja restaurá-lo?
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={discardDraft}>
              Descartar
            </Button>
            <Button type="button" size="sm" variant="primary" onClick={restoreDraft}>
              <IconCheck size={15} />
              Restaurar
            </Button>
          </div>
        </div>
      ) : null}

      {errors._form ? (
        <p className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {errors._form}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {/* ------------------------- identificação ------------------------ */}
          <Card>
            <CardHeader
              icon={<IconUsers size={18} />}
              title="Identificação"
              subtitle="Dados pessoais do membro. Campos com * são obrigatórios."
              action={<Badge tone={form.status === "ativo" ? "success" : "neutral"}>{form.status || "ativo"}</Badge>}
            />
            <div className="space-y-5 px-4 py-4 sm:px-5">
              <PhotoPicker
                value={form.photo}
                onChange={(value) => update("photo", value)}
                name={form.name || "novo membro"}
                label="Foto do membro"
                error={errors.photo}
              />

              <div data-field="name">
                <Field label="Nome completo" htmlFor="name" required error={errors.name}>
                  <TextInput
                    id="name"
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="Ex.: Maria Aparecida Souza"
                    autoComplete="name"
                    invalid={Boolean(errors.name)}
                    maxLength={140}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sexo" htmlFor="gender">
                  <Select id="gender" value={form.gender} onChange={(event) => update("gender", event.target.value)}>
                    <option value="">Não informado</option>
                    {GENDERS.map((gender) => (
                      <option key={gender} value={gender}>
                        {gender}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div data-field="birthDate">
                  <Field label="Data de nascimento" htmlFor="birthDate" error={errors.birthDate}>
                    <TextInput
                      id="birthDate"
                      type="date"
                      value={form.birthDate}
                      onChange={(event) => update("birthDate", event.target.value)}
                      invalid={Boolean(errors.birthDate)}
                    />
                  </Field>
                </div>
                <Field label="Situação" htmlFor="status">
                  <Select
                    id="status"
                    value={form.status}
                    onChange={(event) => update("status", event.target.value)}
                  >
                    {MEMBER_STATUS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div data-field="kinship">
                  <Field
                    label="Parentesco"
                    htmlFor="kinship"
                    hint="Vínculo familiar dentro da igreja."
                  >
                    <TextInput
                      id="kinship"
                      list="kinship-options"
                      value={form.kinship}
                      onChange={(event) => update("kinship", event.target.value)}
                      placeholder="Ex.: Cônjuge, Filho(a), Irmã(ã)"
                      maxLength={80}
                    />
                    <datalist id="kinship-options">
                      {KINSHIPS.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </Field>
                </div>
                <Field
                  label="Família / responsável pelo vínculo"
                  htmlFor="familyName"
                  className="sm:col-span-2"
                >
                  <TextInput
                    id="familyName"
                    value={form.familyName}
                    onChange={(event) => update("familyName", event.target.value)}
                    placeholder="Ex.: Família Souza"
                    maxLength={140}
                  />
                </Field>
              </div>
            </div>
          </Card>

          {/* --------------------------- contato --------------------------- */}
          <Card>
            <CardHeader title="Contato e endereço" subtitle="Usados em comunicados, visitas e no flyer dos cultos." />
            <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
              <div data-field="phone">
                <Field label="Telefone / WhatsApp" htmlFor="phone" error={errors.phone}>
                  <TextInput
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={form.phone ? maskPhone(form.phone) : ""}
                    onChange={(event) => update("phone", event.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="(62) 99999-9999"
                    invalid={Boolean(errors.phone)}
                  />
                </Field>
              </div>
              <div data-field="email">
                <Field label="E-mail" htmlFor="email" error={errors.email}>
                  <TextInput
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    placeholder="nome@email.com"
                    autoComplete="email"
                    invalid={Boolean(errors.email)}
                  />
                </Field>
              </div>
              <Field label="Endereço" htmlFor="address" className="sm:col-span-2">
                <TextInput
                  id="address"
                  value={form.address}
                  onChange={(event) => update("address", event.target.value)}
                  placeholder="Rua, número, quadra/lote, bairro"
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
            </div>
          </Card>

          {/* ------------------------- cargos ------------------------------- */}
          <Card>
            <CardHeader
              icon={<IconStar size={18} />}
              title="Cargos eclesiásticos"
              subtitle="Um membro pode ter vários cargos. Cada um exige a data de consagração."
              action={
                <Button type="button" size="sm" variant="outline" onClick={() => addRole("eclesiastico")}>
                  <IconPlus size={15} />
                  Adicionar
                </Button>
              }
            />
            <div className="space-y-3 px-4 py-4 sm:px-5">
              {ecclesiastical.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-surface/70 px-4 py-5 text-center text-sm text-ink-500">
                  Nenhum cargo eclesiástico cadastrado. Clique em <strong>Adicionar</strong> para incluir
                  (Pastor, Diácono, Presbítero, Evangelista…).
                </p>
              ) : null}

              {form.roles.map((role, index) =>
                role.kind === "eclesiastico" ? (
                  <div
                    key={`ecc-${index}`}
                    className="rounded-xl border border-line bg-surface/60 p-3.5 sm:p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <Badge tone="gold">Cargo eclesiástico #{ecclesiastical.indexOf(role) + 1}</Badge>
                      <button
                        type="button"
                        className="icon-btn text-danger hover:bg-danger-soft"
                        onClick={() => removeRole(index)}
                        aria-label={`Remover cargo eclesiástico ${role.title || index + 1}`}
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div data-field={`roles.${index}.title`}>
                        <Field label="Cargo" htmlFor={`ecc-title-${index}`} required error={errors[`roles.${index}.title`]}>
                          <TextInput
                            id={`ecc-title-${index}`}
                            list="ecclesiastical-options"
                            value={role.title}
                            onChange={(event) => updateRole(index, { title: event.target.value })}
                            placeholder="Ex.: Diácono"
                            invalid={Boolean(errors[`roles.${index}.title`])}
                            maxLength={120}
                          />
                        </Field>
                      </div>
                      <div data-field={`roles.${index}.consecrationDate`}>
                        <Field
                          label="Data de consagração"
                          htmlFor={`ecc-date-${index}`}
                          required
                          error={errors[`roles.${index}.consecrationDate`]}
                        >
                          <TextInput
                            id={`ecc-date-${index}`}
                            type="date"
                            value={role.consecrationDate ?? ""}
                            onChange={(event) => updateRole(index, { consecrationDate: event.target.value })}
                            invalid={Boolean(errors[`roles.${index}.consecrationDate`])}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                ) : null,
              )}

              <datalist id="ecclesiastical-options">
                {ECCLESIASTICAL_ROLES.map((role) => (
                  <option key={role} value={role} />
                ))}
              </datalist>
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={<IconCalendar size={18} />}
              title="Cargos locais"
              subtitle="Funções exercidas na congregação, com período de atuação (data inicial e final)."
              action={
                <Button type="button" size="sm" variant="outline" onClick={() => addRole("local")}>
                  <IconPlus size={15} />
                  Adicionar
                </Button>
              }
            />
            <div className="space-y-3 px-4 py-4 sm:px-5">
              {local.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-surface/70 px-4 py-5 text-center text-sm text-ink-500">
                  Nenhum cargo local cadastrado (Tesoureiro, Professor de EBD, Líder de Célula…).
                </p>
              ) : null}

              {form.roles.map((role, index) =>
                role.kind === "local" ? (
                  <div
                    key={`loc-${index}`}
                    className="rounded-xl border border-line bg-surface/60 p-3.5 sm:p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <Badge tone="brand">Cargo local #{local.indexOf(role) + 1}</Badge>
                      <button
                        type="button"
                        className="icon-btn text-danger hover:bg-danger-soft"
                        onClick={() => removeRole(index)}
                        aria-label={`Remover cargo local ${role.title || index + 1}`}
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div data-field={`roles.${index}.title`} className="sm:col-span-3">
                        <Field label="Cargo / função" htmlFor={`loc-title-${index}`} required error={errors[`roles.${index}.title`]}>
                          <TextInput
                            id={`loc-title-${index}`}
                            list="local-options"
                            value={role.title}
                            onChange={(event) => updateRole(index, { title: event.target.value })}
                            placeholder="Ex.: Dirigente de Célula"
                            invalid={Boolean(errors[`roles.${index}.title`])}
                            maxLength={120}
                          />
                        </Field>
                      </div>
                      <div data-field={`roles.${index}.startDate`}>
                        <Field label="Data inicial" htmlFor={`loc-start-${index}`} required error={errors[`roles.${index}.startDate`]}>
                          <TextInput
                            id={`loc-start-${index}`}
                            type="date"
                            value={role.startDate ?? ""}
                            onChange={(event) => updateRole(index, { startDate: event.target.value })}
                            invalid={Boolean(errors[`roles.${index}.startDate`])}
                          />
                        </Field>
                      </div>
                      <div data-field={`roles.${index}.endDate`} className="sm:col-span-2">
                        <Field
                          label="Data final"
                          htmlFor={`loc-end-${index}`}
                          hint="Deixe em branco se o cargo estiver ativo."
                          error={errors[`roles.${index}.endDate`]}
                        >
                          <TextInput
                            id={`loc-end-${index}`}
                            type="date"
                            value={role.endDate ?? ""}
                            onChange={(event) => updateRole(index, { endDate: event.target.value })}
                            invalid={Boolean(errors[`roles.${index}.endDate`])}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                ) : null,
              )}

              <datalist id="local-options">
                {LOCAL_ROLES.map((role) => (
                  <option key={role} value={role} />
                ))}
              </datalist>
            </div>
          </Card>
        </div>

        {/* --------------------------- coluna lateral ------------------------ */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Vida na igreja" />
            <div className="space-y-4 px-4 py-4 sm:px-5">
              <div data-field="memberSince">
                <Field label="Membro desde" htmlFor="memberSince" error={errors.memberSince}>
                  <TextInput
                    id="memberSince"
                    type="date"
                    value={form.memberSince}
                    onChange={(event) => update("memberSince", event.target.value)}
                    invalid={Boolean(errors.memberSince)}
                  />
                </Field>
              </div>
              <div data-field="baptismDate">
                <Field label="Data de batismo" htmlFor="baptismDate" error={errors.baptismDate}>
                  <TextInput
                    id="baptismDate"
                    type="date"
                    value={form.baptismDate}
                    onChange={(event) => update("baptismDate", event.target.value)}
                    invalid={Boolean(errors.baptismDate)}
                  />
                </Field>
              </div>
              <Field label="Observações pastorais" htmlFor="notes" hint="Informações visíveis apenas para a liderança.">
                <TextArea
                  id="notes"
                  rows={5}
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  placeholder="Ex.: participa do ministério de louvor, disponível para visitas aos sábados."
                  maxLength={4000}
                />
              </Field>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-brand-50 to-white">
            <div className="space-y-3 px-4 py-4 sm:px-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
                Resumo do cadastro
              </p>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Nome</dt>
                  <dd className="truncate font-semibold text-ink-900">{form.name || "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Cargos eclesiásticos</dt>
                  <dd className="font-semibold text-ink-900">{ecclesiastical.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Cargos locais</dt>
                  <dd className="font-semibold text-ink-900">{local.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Foto</dt>
                  <dd className="font-semibold text-ink-900">{form.photo ? "Enviada" : "Pendente"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">Contato</dt>
                  <dd className="font-semibold text-ink-900">{form.phone ? maskPhone(form.phone) : "—"}</dd>
                </div>
              </dl>
              {draftSavedAt ? (
                <p className="flex items-center gap-1.5 border-t border-line pt-3 text-xs text-ink-500">
                  <IconSave size={13} />
                  Rascunho salvo às{" "}
                  {draftSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      {/* ----------------------------- ações ------------------------------ */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-line bg-surface/92 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-500 sm:text-[13px]">
            {totalRoles > 0
              ? `${totalRoles} cargo(s) vinculado(s) · `
              : ""}
            {dirty ? "há alterações não salvas" : "tudo salvo"}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (dirty) {
                  setConfirmLeave(true);
                  return;
                }
                router.back();
              }}
              disabled={saving}
            >
              <IconArrowLeft size={16} />
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={saving} disabled={saving}>
              {saving ? "Salvando…" : <IconSave size={16} />}
              {saving ? "" : mode === "edit" ? "Salvar alterações" : "Cadastrar membro"}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        title="Descartar alterações?"
        message="Você tem alterações não salvas neste cadastro. Se sair agora, elas serão mantidas como rascunho neste navegador, mas não irão para o banco da igreja."
        confirmLabel="Sair sem salvar"
        cancelLabel="Continuar editando"
        tone="danger"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          setDirty(false);
          router.push("/membros");
        }}
      />

      <p className="text-center text-xs text-ink-400">
        Prefere ver a lista?{" "}
        <Link href="/membros" className="link">
          Voltar para membros
        </Link>
      </p>
    </form>
  );
}
