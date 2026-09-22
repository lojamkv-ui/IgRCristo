"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api, compressImage, flash, newKey } from "@/lib/client";
import { statusLabel } from "@/lib/format";
import type { OptionsPayload, ServiceItem, ServicePayload } from "@/lib/types";
import { validateService } from "@/lib/validators";
import { useGuard, useToast } from "./providers";
import { Avatar, Field, Spinner } from "./ui";

type PersonRow = {
  key: string;
  id?: number;
  memberId: string;
  name: string;
  showPhoto: boolean;
  photoAction: "keep" | "clear" | "replace";
  photoData: string | null;
  photoPreview: string | null;
};

type FormState = {
  serviceDate: string;
  serviceTime: string;
  title: string;
  theme: string;
  leaderId: string;
  leaderName: string;
  preacherId: string;
  preacherName: string;
  showPreacherPhoto: boolean;
  preacherPhotoAction: "keep" | "clear" | "replace";
  preacherPhotoData: string | null;
  preacherPreview: string | null;
  notes: string;
  singers: PersonRow[];
  intercessors: PersonRow[];
};

function blankPerson(): PersonRow {
  return { key: newKey(), memberId: "", name: "", showPhoto: true, photoAction: "clear", photoData: null, photoPreview: null };
}

function fromService(service?: ServiceItem): FormState {
  return {
    serviceDate: service?.serviceDate ?? "",
    serviceTime: service?.serviceTime ?? "19:00",
    title: service?.title ?? "",
    theme: service?.theme ?? "",
    leaderId: service?.leaderId ? String(service.leaderId) : "",
    leaderName: service?.leaderName ?? "",
    preacherId: service?.preacherId ? String(service.preacherId) : "",
    preacherName: service?.preacherName ?? "",
    showPreacherPhoto: service?.showPreacherPhoto ?? true,
    preacherPhotoAction: "keep",
    preacherPhotoData: null,
    preacherPreview: service?.preacherPhotoUrl ?? null,
    notes: service?.notes ?? "",
    singers: service?.singers.map((person) => ({
      key: newKey(),
      id: person.id,
      memberId: person.memberId ? String(person.memberId) : "",
      name: person.name,
      showPhoto: Boolean(person.photoUrl),
      photoAction: "keep" as const,
      photoData: null,
      photoPreview: person.photoUrl,
    })) ?? [],
    intercessors: service?.intercessors.map((person) => ({
      key: newKey(),
      id: person.id,
      memberId: person.memberId ? String(person.memberId) : "",
      name: person.name,
      showPhoto: false,
      photoAction: "clear" as const,
      photoData: null,
      photoPreview: null,
    })) ?? [],
  };
}

export function ServiceForm({
  mode,
  initial,
  options,
  onSaved,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: ServiceItem;
  options: OptionsPayload;
  onSaved?: (id: number) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const { push } = useToast();
  const guard = useGuard();
  const [form, setForm] = useState<FormState>(() => fromService(initial));
  const [baseline] = useState(() => JSON.stringify(fromService(initial)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const prefilled = useRef(false);
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
    if (mode !== "create" || prefilled.current) return;
    prefilled.current = true;
    const params = new URLSearchParams(window.location.search);
    const preacher = options.members.find((member) => String(member.id) === params.get("preacher"));
    const singer = options.members.find((member) => String(member.id) === params.get("singer"));
    if (!preacher && !singer) return;
    setForm((current) => ({
      ...current,
      preacherId: preacher ? String(preacher.id) : current.preacherId,
      preacherName: preacher ? preacher.suggestedName : current.preacherName,
      preacherPreview: preacher?.photoUrl ?? current.preacherPreview,
      singers: singer ? [...current.singers, { ...blankPerson(), memberId: String(singer.id), name: singer.suggestedName, photoPreview: singer.photoUrl }] : current.singers,
    }));
  }, [mode, options.members]);

  const choose = (role: "leader" | "preacher", memberId: string) => {
    const member = options.members.find((item) => String(item.id) === memberId);
    setForm((current) => {
      if (role === "leader") {
        return { ...current, leaderId: memberId, leaderName: member ? member.suggestedName : current.leaderName };
      }
      return {
        ...current,
        preacherId: memberId,
        preacherName: member ? member.suggestedName : current.preacherName,
        preacherPreview: member?.photoUrl ?? null,
        preacherPhotoAction: "clear",
        preacherPhotoData: null,
        showPreacherPhoto: true,
      };
    });
  };

  const updatePerson = (list: "singers" | "intercessors", key: string, patch: Partial<PersonRow>) => {
    setForm((current) => ({ ...current, [list]: current[list].map((person) => person.key === key ? { ...person, ...patch } : person) }));
  };

  const onPhoto = async (file: File | undefined, target: "preacher" | PersonRow) => {
    if (!file) return;
    try {
      const data = await compressImage(file);
      if (target === "preacher") {
        setForm((current) => ({ ...current, preacherPhotoAction: "replace", preacherPhotoData: data, preacherPreview: data, showPreacherPhoto: true }));
      } else {
        updatePerson("singers", target.key, { photoAction: "replace", photoData: data, photoPreview: data, showPhoto: true });
      }
    } catch (cause) {
      push(cause instanceof Error ? cause.message : "Não foi possível ler a foto.", "error");
    }
  };

  const submit = async () => {
    const payload: ServicePayload = {
      serviceDate: form.serviceDate,
      serviceTime: form.serviceTime,
      title: form.title,
      theme: form.theme || null,
      leaderId: form.leaderId ? Number(form.leaderId) : null,
      leaderName: form.leaderName,
      preacherId: form.preacherId ? Number(form.preacherId) : null,
      preacherName: form.preacherName,
      showPreacherPhoto: form.showPreacherPhoto,
      preacherPhotoAction: form.preacherPhotoAction,
      preacherPhoto: form.preacherPhotoAction === "replace" ? form.preacherPhotoData : null,
      notes: form.notes || null,
      singers: form.singers.filter((person) => person.name || person.memberId).map((person) => ({
        id: person.id,
        memberId: person.memberId ? Number(person.memberId) : null,
        name: person.name,
        showPhoto: person.showPhoto,
        photoAction: person.photoAction,
        photo: person.photoAction === "replace" ? person.photoData : null,
      })),
      intercessors: form.intercessors.filter((person) => person.name || person.memberId).map((person) => ({
        memberId: person.memberId ? Number(person.memberId) : null,
        name: person.name,
      })),
      baseUpdatedAt: initial?.updatedAt,
    };
    const parsed = validateService(payload);
    if (!parsed.ok) {
      setErrors(parsed.fields);
      setFormError(parsed.error);
      return;
    }
    setSaving(true);
    setFormError("");
    setErrors({});
    try {
      const result = mode === "create"
        ? await api<{ id: number }>("/api/services", { method: "POST", body: JSON.stringify(parsed.value) })
        : await api<{ id: number }>(`/api/services/${initial?.id}`, { method: "PUT", body: JSON.stringify(parsed.value) });
      guard.setDirty(false);
      flash("Culto salvo na agenda.");
      if (onSaved) onSaved(result.id);
      else router.push(`/agenda/${result.id}`);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setErrors(cause.fields ?? {});
        setFormError(cause.message);
      } else setFormError("Não foi possível salvar o culto.");
      push("Não foi possível salvar o culto.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="stack" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      {formError ? <div className="form-alert" role="alert"><strong>{formError}</strong>{Object.keys(errors).length ? <ul>{Object.values(errors).map((message) => <li key={message}>{message}</li>)}</ul> : null}</div> : null}
      <section className="form-section">
        <div>
          <p className="kicker">Agenda</p>
          <h2>Dados do culto</h2>
        </div>
        <div className="form-grid">
          <Field label="Nome do culto" required htmlFor="service-title" error={errors.title}>
            <input id="service-title" className="control" list="service-titles" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </Field>
          <Field label="Tema" htmlFor="service-theme" hint="Opcional. Ajuda o texto do flyer.">
            <input id="service-theme" className="control" value={form.theme} onChange={(event) => setForm({ ...form, theme: event.target.value })} />
          </Field>
          <Field label="Data" required htmlFor="service-date" error={errors.serviceDate}>
            <input id="service-date" className="control" type="date" value={form.serviceDate} onChange={(event) => setForm({ ...form, serviceDate: event.target.value })} />
          </Field>
          <Field label="Hora" required htmlFor="service-time" error={errors.serviceTime}>
            <input id="service-time" className="control" type="time" value={form.serviceTime} onChange={(event) => setForm({ ...form, serviceTime: event.target.value })} />
          </Field>
          <Field className="span-2" label="Observações internas" htmlFor="service-notes" hint="Não entram no flyer, a menos que você copie manualmente.">
            <textarea id="service-notes" className="control" value={form.notes} maxLength={2000} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Field>
        </div>
        <datalist id="service-titles">{options.serviceTitles.map((title) => <option key={title} value={title} />)}</datalist>
      </section>

      <section className="form-section">
        <div>
          <p className="kicker">Quem serve</p>
          <h2>Dirigente e pregador</h2>
        </div>
        <div className="form-grid">
          <Field label="Vincular dirigente" htmlFor="leader-id">
            <select id="leader-id" className="control" value={form.leaderId} onChange={(event) => choose("leader", event.target.value)}>
              <option value="">Digitar nome</option>
              {options.members.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
            </select>
          </Field>
          <Field label="Nome do dirigente" required htmlFor="leader-name" error={errors.leaderName}>
            <input id="leader-name" className="control" value={form.leaderName} onChange={(event) => setForm({ ...form, leaderName: event.target.value })} />
          </Field>
          <Field label="Vincular pregador" htmlFor="preacher-id">
            <select id="preacher-id" className="control" value={form.preacherId} onChange={(event) => choose("preacher", event.target.value)}>
              <option value="">Digitar nome</option>
              {options.members.map((member) => <option key={member.id} value={member.id}>{member.fullName} · {statusLabel(member.status)}</option>)}
            </select>
          </Field>
          <Field label="Nome do pregador" required htmlFor="preacher-name" error={errors.preacherName}>
            <input id="preacher-name" className="control" value={form.preacherName} onChange={(event) => setForm({ ...form, preacherName: event.target.value })} />
          </Field>
        </div>
        <div className="photo-field">
          <Avatar name={form.preacherName || "Pregador"} src={form.showPreacherPhoto ? form.preacherPreview : null} size={72} />
          <div>
            <strong>Foto do pregador neste culto</strong>
            <p className="hint">Se ficar vazia, o flyer usa a foto do cadastro quando houver vínculo.</p>
            <input aria-label="Foto do pregador" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void onPhoto(event.target.files?.[0], "preacher")} />
            <label className="checkline"><input type="checkbox" checked={form.showPreacherPhoto} onChange={(event) => setForm({ ...form, showPreacherPhoto: event.target.checked })} /> Exibir foto no flyer</label>
          </div>
        </div>
        {errors.preacherPhoto ? <p className="field-error">{errors.preacherPhoto}</p> : null}
      </section>

      <PeopleBlock
        title="Cantores"
        hint="Pode haver mais de um. A foto é opcional e aparece no flyer."
        people={form.singers}
        options={options}
        withPhoto
        errors={errors}
        prefix="singer"
        onAdd={() => setForm((current) => ({ ...current, singers: [...current.singers, blankPerson()] }))}
        onRemove={(key) => setForm((current) => ({ ...current, singers: current.singers.filter((person) => person.key !== key) }))}
        onChange={(key, patch) => updatePerson("singers", key, patch)}
        onPhoto={(person, file) => void onPhoto(file, person)}
      />
      <PeopleBlock
        title="Intercessores"
        hint="Nomes de quem intercede. Não precisam de foto."
        people={form.intercessors}
        options={options}
        errors={errors}
        prefix="intercessor"
        onAdd={() => setForm((current) => ({ ...current, intercessors: [...current.intercessors, blankPerson()] }))}
        onRemove={(key) => setForm((current) => ({ ...current, intercessors: current.intercessors.filter((person) => person.key !== key) }))}
        onChange={(key, patch) => updatePerson("intercessors", key, patch)}
      />

      <div className="savebar">
        <p>{dirty ? <span className="dirty-note">Há alterações não salvas.</span> : "O culto fica disponível para edição e para o flyer."}</p>
        <div className="inline-actions">
          {onCancel ? <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button> : null}
          <button className="btn btn-primary" disabled={saving} type="submit">{saving ? <Spinner /> : null}{mode === "create" ? "Salvar culto" : "Salvar alterações"}</button>
        </div>
      </div>
    </form>
  );
}

function PeopleBlock({
  title,
  hint,
  people,
  options,
  withPhoto,
  errors,
  prefix,
  onAdd,
  onRemove,
  onChange,
  onPhoto,
}: {
  title: string;
  hint: string;
  people: PersonRow[];
  options: OptionsPayload;
  withPhoto?: boolean;
  errors: Record<string, string>;
  prefix: string;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onChange: (key: string, patch: Partial<PersonRow>) => void;
  onPhoto?: (person: PersonRow, file: File | undefined) => void;
}) {
  return (
    <section className="form-section">
      <div>
        <p className="kicker">Escala</p>
        <h2>{title}</h2>
        <p className="hint">{hint}</p>
      </div>
      {people.map((person, index) => (
        <div className="repeat-card" key={person.key}>
          <div className="form-grid">
            <Field label="Membro" htmlFor={`${person.key}-member`}>
              <select id={`${person.key}-member`} className="control" value={person.memberId} onChange={(event) => {
                const member = options.members.find((item) => String(item.id) === event.target.value);
                onChange(person.key, { memberId: event.target.value, name: member ? member.suggestedName : person.name, photoPreview: member?.photoUrl ?? person.photoPreview, photoAction: "clear", photoData: null });
              }}>
                <option value="">Digitar nome</option>
                {options.members.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
              </select>
            </Field>
            <Field label="Nome no culto" required htmlFor={`${person.key}-name`} error={errors[`${prefix}-${index}-name`]}>
              <input id={`${person.key}-name`} className="control" value={person.name} onChange={(event) => onChange(person.key, { name: event.target.value })} />
            </Field>
          </div>
          {withPhoto ? (
            <div className="photo-field">
              <Avatar name={person.name || "Cantor"} src={person.showPhoto ? person.photoPreview : null} size={56} />
              <div>
                <input aria-label={`Foto de ${person.name || "cantor"}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onPhoto?.(person, event.target.files?.[0])} />
                <label className="checkline"><input type="checkbox" checked={person.showPhoto} onChange={(event) => onChange(person.key, { showPhoto: event.target.checked })} /> Exibir foto</label>
                {errors[`${prefix}-${index}-photo`] ? <p className="field-error">{errors[`${prefix}-${index}-photo`]}</p> : null}
              </div>
            </div>
          ) : null}
          <button type="button" className="btn btn-small btn-ghost" onClick={() => onRemove(person.key)}>Remover</button>
        </div>
      ))}
      <button type="button" className="btn-dashed" onClick={onAdd}>Adicionar {title.toLowerCase()}</button>
    </section>
  );
}
