"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, compressImage, flash, newKey } from "@/lib/client";
import { api } from "@/lib/client";
import { maskCpf, maskPhone, statusLabel } from "@/lib/format";
import type { MemberDetail, MemberPayload, OptionsPayload } from "@/lib/types";
import { validateMember } from "@/lib/validators";
import { useGuard, useToast } from "./providers";
import { Avatar, Field, Spinner } from "./ui";

type OfficeRow = { key: string; title: string; consecrationDate: string; startDate: string; endDate: string; notes: string };
type FormState = {
  fullName: string;
  photoAction: "keep" | "remove" | "replace";
  photoData: string | null;
  photoPreview: string | null;
  birthDate: string;
  gender: string;
  maritalStatus: string;
  phone: string;
  email: string;
  cpf: string;
  address: string;
  neighborhood: string;
  city: string;
  baptismDate: string;
  conversionDate: string;
  memberSince: string;
  status: string;
  kinshipType: string;
  kinshipMemberId: string;
  kinshipNotes: string;
  notes: string;
  ecclesiastical: OfficeRow[];
  local: OfficeRow[];
};

function emptyOffice(): OfficeRow {
  return { key: newKey(), title: "", consecrationDate: "", startDate: "", endDate: "", notes: "" };
}

function fromMember(member?: MemberDetail): FormState {
  return {
    fullName: member?.fullName ?? "",
    photoAction: "keep",
    photoData: null,
    photoPreview: member?.photoUrl ?? null,
    birthDate: member?.birthDate ?? "",
    gender: member?.gender ?? "",
    maritalStatus: member?.maritalStatus ?? "",
    phone: member?.phone ?? "",
    email: member?.email ?? "",
    cpf: member?.cpf ?? "",
    address: member?.address ?? "",
    neighborhood: member?.neighborhood ?? "",
    city: member?.city ?? "",
    baptismDate: member?.baptismDate ?? "",
    conversionDate: member?.conversionDate ?? "",
    memberSince: member?.memberSince ?? "",
    status: member?.status ?? "ativo",
    kinshipType: member?.kinshipType ?? "",
    kinshipMemberId: member?.kinshipMemberId ? String(member.kinshipMemberId) : "",
    kinshipNotes: member?.kinshipNotes ?? "",
    notes: member?.notes ?? "",
    ecclesiastical: member?.ecclesiastical.length
      ? member.ecclesiastical.map((office) => ({ key: newKey(), title: office.title, consecrationDate: office.consecrationDate, startDate: "", endDate: "", notes: office.notes ?? "" }))
      : [],
    local: member?.local.length
      ? member.local.map((office) => ({ key: newKey(), title: office.title, consecrationDate: "", startDate: office.startDate, endDate: office.endDate ?? "", notes: office.notes ?? "" }))
      : [],
  };
}

function payloadOf(form: FormState, baseUpdatedAt?: string): MemberPayload {
  return {
    fullName: form.fullName,
    photoAction: form.photoAction,
    photo: form.photoAction === "replace" ? form.photoData : null,
    birthDate: form.birthDate || null,
    gender: form.gender || null,
    maritalStatus: form.maritalStatus || null,
    phone: form.phone || null,
    email: form.email || null,
    cpf: form.cpf || null,
    address: form.address || null,
    neighborhood: form.neighborhood || null,
    city: form.city || null,
    baptismDate: form.baptismDate || null,
    conversionDate: form.conversionDate || null,
    memberSince: form.memberSince || null,
    status: form.status,
    kinshipType: form.kinshipType || null,
    kinshipMemberId: form.kinshipMemberId ? Number(form.kinshipMemberId) : null,
    kinshipNotes: form.kinshipNotes || null,
    notes: form.notes || null,
    ecclesiasticalOffices: form.ecclesiastical
      .filter((office) => office.title || office.consecrationDate || office.notes)
      .map((office) => ({ title: office.title, consecrationDate: office.consecrationDate, notes: office.notes || null })),
    localOffices: form.local
      .filter((office) => office.title || office.startDate || office.endDate || office.notes)
      .map((office) => ({ title: office.title, startDate: office.startDate, endDate: office.endDate || null, notes: office.notes || null })),
    baseUpdatedAt,
  };
}

export function MemberForm({
  mode,
  initial,
  options,
  onSaved,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: MemberDetail;
  options: OptionsPayload;
  onSaved?: (id: number) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const { push } = useToast();
  const guard = useGuard();
  const draftKey = mode === "create" ? "renascendo.draft.member" : `renascendo.draft.member.${initial?.id}`;
  const [form, setForm] = useState<FormState>(() => fromMember(initial));
  const [baseline] = useState(() => JSON.stringify(fromMember(initial)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [over, setOver] = useState(false);
  const [draftOffer, setDraftOffer] = useState<string | null>(null);

  const dirty = useMemo(() => JSON.stringify(form) !== baseline, [form, baseline]);
  useEffect(() => {
    guard.setDirty(dirty);
    return () => guard.setDirty(false);
  }, [dirty, guard]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  useEffect(() => {
    const raw = localStorage.getItem(draftKey);
    if (raw && raw !== baseline) setDraftOffer(raw);
  }, [baseline, draftKey]);

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      try {
        const clone = { ...form, photoData: form.photoData && form.photoData.length > 150000 ? null : form.photoData };
        localStorage.setItem(draftKey, JSON.stringify(clone));
      } catch {
        /* rascunho é um extra; o banco continua sendo a fonte principal */
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [dirty, draftKey, form]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = await compressImage(file);
      setForm((current) => ({ ...current, photoAction: "replace", photoData: data, photoPreview: data }));
    } catch (cause) {
      push(cause instanceof Error ? cause.message : "Não foi possível ler a foto.", "error");
    }
  };

  const submit = async () => {
    setFormError("");
    const payload = payloadOf(form, initial?.updatedAt);
    const parsed = validateMember(payload, { selfId: initial?.id });
    if (!parsed.ok) {
      setErrors(parsed.fields);
      setFormError(parsed.error);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (mode === "create") {
        const result = await api<{ id: number }>("/api/members", { method: "POST", body: JSON.stringify(parsed.value) });
        localStorage.removeItem(draftKey);
        guard.setDirty(false);
        flash(`Cadastro de ${parsed.value.fullName} salvo.`);
        if (onSaved) onSaved(result.id);
        else router.push(`/membros/${result.id}`);
      } else if (initial) {
        const result = await api<{ id: number; unchanged?: boolean }>(`/api/members/${initial.id}`, { method: "PUT", body: JSON.stringify(parsed.value) });
        localStorage.removeItem(draftKey);
        guard.setDirty(false);
        if (result.unchanged) push("Nada mudou no cadastro.", "info");
        else push("Cadastro salvo. O histórico foi atualizado.");
        onSaved?.(initial.id);
      }
    } catch (cause) {
      if (cause instanceof ApiError) {
        setErrors(cause.fields ?? {});
        setFormError(cause.message);
      } else setFormError("Não foi possível salvar. Tente de novo.");
      push("Não foi possível salvar o cadastro.", "error");
    } finally {
      setSaving(false);
    }
  };

  const relatives = options.members.filter((member) => member.id !== initial?.id);

  return (
    <form className="stack" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      {draftOffer ? (
        <div className="restore-banner">
          <p>Encontramos um rascunho deste formulário neste aparelho.</p>
          <div className="inline-actions">
            <button type="button" className="btn btn-small btn-primary" onClick={() => {
              try {
                setForm(JSON.parse(draftOffer) as FormState);
                setDraftOffer(null);
              } catch {
                localStorage.removeItem(draftKey);
                setDraftOffer(null);
              }
            }}>Restaurar</button>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => { localStorage.removeItem(draftKey); setDraftOffer(null); }}>Descartar</button>
          </div>
        </div>
      ) : null}
      {formError ? (
        <div className="form-alert" role="alert">
          <strong>{formError}</strong>
          {Object.keys(errors).length ? (
            <ul>{Object.entries(errors).map(([key, message]) => <li key={key}>{message}</li>)}</ul>
          ) : null}
        </div>
      ) : null}

      <section className="form-section">
        <div>
          <p className="kicker">Identificação</p>
          <h2>Quem é esta pessoa</h2>
        </div>
        <div className={`dropzone ${over ? "over" : ""}`} onDragOver={(event) => { event.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(event) => { event.preventDefault(); setOver(false); void onPhoto(event.dataTransfer.files[0]); }}>
          <div className="photo-field">
            <Avatar name={form.fullName || "Novo membro"} src={form.photoPreview} size={84} />
            <div>
              <strong>Foto do membro</strong>
              <p className="hint">JPG ou PNG. A imagem é reduzida neste aparelho antes de enviar.</p>
              <input id="field-photo" aria-label="Foto do membro" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void onPhoto(event.target.files?.[0])} />
              {form.photoPreview ? <button type="button" className="btn btn-small btn-ghost" onClick={() => setForm((current) => ({ ...current, photoAction: "remove", photoData: null, photoPreview: null }))}>Remover foto</button> : null}
            </div>
          </div>
          {errors.photo ? <p className="field-error">{errors.photo}</p> : null}
        </div>
        <div className="form-grid">
          <Field className="span-2" label="Nome completo" required htmlFor="field-fullName" error={errors.fullName}>
            <input id="field-fullName" className="control" value={form.fullName} onChange={(event) => set("fullName", event.target.value)} required minLength={3} maxLength={120} autoComplete="name" />
          </Field>
          <Field label="Status" htmlFor="field-status" error={errors.status}>
            <select id="field-status" className="control" value={form.status} onChange={(event) => set("status", event.target.value)}>
              {options.statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
            </select>
          </Field>
          <Field label="Gênero" htmlFor="field-gender" error={errors.gender}>
            <select id="field-gender" className="control" value={form.gender} onChange={(event) => set("gender", event.target.value)}>
              <option value="">Não informado</option>
              {options.genders.map((gender) => <option key={gender}>{gender}</option>)}
            </select>
          </Field>
          <Field label="Nascimento" htmlFor="field-birthDate" error={errors.birthDate}>
            <input id="field-birthDate" className="control" type="date" value={form.birthDate} onChange={(event) => set("birthDate", event.target.value)} />
          </Field>
          <Field label="Estado civil" htmlFor="field-marital" error={errors.maritalStatus}>
            <select id="field-marital" className="control" value={form.maritalStatus} onChange={(event) => set("maritalStatus", event.target.value)}>
              <option value="">Não informado</option>
              {options.maritalStatuses.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="CPF" htmlFor="field-cpf" error={errors.cpf} hint="Opcional. Usado para evitar cadastro duplicado.">
            <input id="field-cpf" className="control" inputMode="numeric" value={form.cpf} onChange={(event) => set("cpf", maskCpf(event.target.value))} placeholder="000.000.000-00" />
          </Field>
        </div>
      </section>

      <section className="form-section">
        <div>
          <p className="kicker">Contato</p>
          <h2>Como encontrar</h2>
        </div>
        <div className="form-grid">
          <Field label="Telefone" htmlFor="field-phone" error={errors.phone}>
            <input id="field-phone" className="control" inputMode="tel" value={form.phone} onChange={(event) => set("phone", maskPhone(event.target.value))} placeholder="(62) 90000-0000" autoComplete="tel" />
          </Field>
          <Field label="E-mail" htmlFor="field-email" error={errors.email}>
            <input id="field-email" className="control" type="email" value={form.email} onChange={(event) => set("email", event.target.value)} autoComplete="email" />
          </Field>
          <Field className="span-2" label="Endereço" htmlFor="field-address" error={errors.address}>
            <input id="field-address" className="control" value={form.address} onChange={(event) => set("address", event.target.value)} maxLength={180} />
          </Field>
          <Field label="Bairro" htmlFor="field-neighborhood">
            <input id="field-neighborhood" className="control" value={form.neighborhood} onChange={(event) => set("neighborhood", event.target.value)} />
          </Field>
          <Field label="Cidade" htmlFor="field-city">
            <input id="field-city" className="control" value={form.city} onChange={(event) => set("city", event.target.value)} placeholder="Trindade" />
          </Field>
        </div>
      </section>

      <section className="form-section">
        <div>
          <p className="kicker">Vida na igreja</p>
          <h2>Caminhada</h2>
        </div>
        <div className="form-grid">
          <Field label="Conversão" htmlFor="field-conversion" error={errors.conversionDate}>
            <input id="field-conversion" className="control" type="date" value={form.conversionDate} onChange={(event) => set("conversionDate", event.target.value)} />
          </Field>
          <Field label="Batismo" htmlFor="field-baptism" error={errors.baptismDate}>
            <input id="field-baptism" className="control" type="date" value={form.baptismDate} onChange={(event) => set("baptismDate", event.target.value)} />
          </Field>
          <Field label="Membro desde" htmlFor="field-since" error={errors.memberSince}>
            <input id="field-since" className="control" type="date" value={form.memberSince} onChange={(event) => set("memberSince", event.target.value)} />
          </Field>
          <Field className="span-2" label="Observações" htmlFor="field-notes" hint={`${form.notes.length}/2000`}>
            <textarea id="field-notes" className="control" maxLength={2000} value={form.notes} onChange={(event) => set("notes", event.target.value)} />
          </Field>
        </div>
      </section>

      <section className="form-section">
        <div>
          <p className="kicker">Família</p>
          <h2>Parentesco</h2>
          <p className="hint">Use para ligar familiares já cadastrados. O filtro de membros usa este vínculo. Se a pessoa ainda não está no sistema, descreva na observação.</p>
        </div>
        <div className="form-grid">
          <Field label="Tipo de parentesco" htmlFor="field-kinship" error={errors.kinshipType}>
            <select id="field-kinship" className="control" value={form.kinshipType} onChange={(event) => setForm((current) => ({ ...current, kinshipType: event.target.value, kinshipMemberId: event.target.value ? current.kinshipMemberId : "" }))}>
              <option value="">Não informado</option>
              {options.kinshipTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="Pessoa vinculada" htmlFor="field-kinship-member" error={errors.kinshipMemberId}>
            <select id="field-kinship-member" className="control" value={form.kinshipMemberId} onChange={(event) => set("kinshipMemberId", event.target.value)}>
              <option value="">Nenhuma</option>
              {relatives.map((member) => <option key={member.id} value={member.id}>{member.fullName} · {statusLabel(member.status)}</option>)}
            </select>
          </Field>
          <Field className="span-2" label="Observação do parentesco" htmlFor="field-kinship-notes">
            <input id="field-kinship-notes" className="control" value={form.kinshipNotes} maxLength={300} onChange={(event) => set("kinshipNotes", event.target.value)} />
          </Field>
        </div>
      </section>

      <section className="form-section">
        <div>
          <p className="kicker">Ministério</p>
          <h2>Cargos eclesiásticos</h2>
          <p className="hint">Pode haver mais de um. A data de consagração é obrigatória para cada cargo.</p>
        </div>
        {form.ecclesiastical.map((office, index) => (
          <div className="repeat-card" key={office.key}>
            <div className="form-grid">
              <Field label="Cargo" required htmlFor={`ecc-${office.key}`} error={errors[`ecc-${index}-title`]}>
                <input id={`ecc-${office.key}`} className="control" list="ecclesiastical-titles" value={office.title} onChange={(event) => setForm((current) => ({ ...current, ecclesiastical: current.ecclesiastical.map((item) => item.key === office.key ? { ...item, title: event.target.value } : item) }))} />
              </Field>
              <Field label="Data de consagração" required htmlFor={`ecc-date-${office.key}`} error={errors[`ecc-${index}-date`]}>
                <input id={`ecc-date-${office.key}`} className="control" type="date" value={office.consecrationDate} onChange={(event) => setForm((current) => ({ ...current, ecclesiastical: current.ecclesiastical.map((item) => item.key === office.key ? { ...item, consecrationDate: event.target.value } : item) }))} />
              </Field>
              <Field className="span-2" label="Observação" htmlFor={`ecc-notes-${office.key}`}>
                <input id={`ecc-notes-${office.key}`} className="control" value={office.notes} onChange={(event) => setForm((current) => ({ ...current, ecclesiastical: current.ecclesiastical.map((item) => item.key === office.key ? { ...item, notes: event.target.value } : item) }))} />
              </Field>
            </div>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => setForm((current) => ({ ...current, ecclesiastical: current.ecclesiastical.filter((item) => item.key !== office.key) }))}>Remover cargo</button>
          </div>
        ))}
        <button type="button" className="btn-dashed" onClick={() => setForm((current) => ({ ...current, ecclesiastical: [...current.ecclesiastical, emptyOffice()] }))}>Adicionar cargo eclesiástico</button>
        <datalist id="ecclesiastical-titles">{options.ecclesiasticalTitles.map((title) => <option key={title} value={title} />)}</datalist>
      </section>

      <section className="form-section">
        <div>
          <p className="kicker">Serviço local</p>
          <h2>Cargos locais</h2>
          <p className="hint">Informe o início e, se o cargo já terminou, a data final. Em branco, consideramos em exercício.</p>
        </div>
        {form.local.map((office, index) => (
          <div className="repeat-card" key={office.key}>
            <div className="form-grid">
              <Field label="Cargo" required htmlFor={`local-${office.key}`} error={errors[`local-${index}-title`]}>
                <input id={`local-${office.key}`} className="control" list="local-titles" value={office.title} onChange={(event) => setForm((current) => ({ ...current, local: current.local.map((item) => item.key === office.key ? { ...item, title: event.target.value } : item) }))} />
              </Field>
              <Field label="Data inicial" required htmlFor={`local-start-${office.key}`} error={errors[`local-${index}-start`]}>
                <input id={`local-start-${office.key}`} className="control" type="date" value={office.startDate} onChange={(event) => setForm((current) => ({ ...current, local: current.local.map((item) => item.key === office.key ? { ...item, startDate: event.target.value } : item) }))} />
              </Field>
              <Field label="Data final" htmlFor={`local-end-${office.key}`} error={errors[`local-${index}-end`]} hint="Deixe em branco se ainda está em exercício.">
                <input id={`local-end-${office.key}`} className="control" type="date" value={office.endDate} onChange={(event) => setForm((current) => ({ ...current, local: current.local.map((item) => item.key === office.key ? { ...item, endDate: event.target.value } : item) }))} />
              </Field>
              <Field label="Observação" htmlFor={`local-notes-${office.key}`}>
                <input id={`local-notes-${office.key}`} className="control" value={office.notes} onChange={(event) => setForm((current) => ({ ...current, local: current.local.map((item) => item.key === office.key ? { ...item, notes: event.target.value } : item) }))} />
              </Field>
            </div>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => setForm((current) => ({ ...current, local: current.local.filter((item) => item.key !== office.key) }))}>Remover cargo</button>
          </div>
        ))}
        <button type="button" className="btn-dashed" onClick={() => setForm((current) => ({ ...current, local: [...current.local, emptyOffice()] }))}>Adicionar cargo local</button>
        <datalist id="local-titles">{options.localTitles.map((title) => <option key={title} value={title} />)}</datalist>
      </section>

      <div className="savebar">
        <p>{dirty ? <span className="dirty-note">Há alterações não salvas.</span> : "As mudanças entram no histórico com data, hora e o seu nome."}</p>
        <div className="inline-actions">
          {onCancel ? <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button> : null}
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null}{mode === "create" ? "Criar cadastro" : "Salvar alterações"}</button>
        </div>
      </div>
    </form>
  );
}
