"use client";

import { useEffect, useState } from "react";
import { ApiError, api, useFetch, usePageTitle } from "@/lib/client";
import { CHURCH_DEFAULTS } from "@/lib/constants";
import { copyText, mapsUrl, whatsappUrl } from "@/lib/format";
import type { ChurchProfile } from "@/lib/types";
import { validateChurch } from "@/lib/validators";
import { useToast } from "@/components/providers";
import { ErrorState, Skeleton } from "@/components/ui";

export default function ChurchPage() {
  usePageTitle("Igreja");
  const { push } = useToast();
  const { data, error, loading, reload } = useFetch<{ church: ChurchProfile }>("/api/church");
  const [form, setForm] = useState<ChurchProfile>(CHURCH_DEFAULTS);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.church) setForm(data.church);
  }, [data]);

  const save = async () => {
    const parsed = validateChurch(form);
    if (!parsed.ok) {
      setErrors(parsed.fields);
      push(parsed.error, "error");
      return;
    }
    setSaving(true);
    try {
      const result = await api<{ church: ChurchProfile }>("/api/church", { method: "PUT", body: JSON.stringify(parsed.value) });
      setForm(result.church);
      setEditing(false);
      setErrors({});
      push("Dados da igreja atualizados. Os próximos flyers já usam esta versão.");
    } catch (cause) {
      if (cause instanceof ApiError) setErrors(cause.fields ?? {});
      push(cause instanceof Error ? cause.message : "Não foi possível salvar.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data && loading) return <Skeleton rows={2} />;
  const church = data?.church ?? form;

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">Sede</p>
          <h1>{church.name}</h1>
          <p className="lede">Estes dados oficiais entram em todo flyer: pastor, contato, CNPJ e endereço.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing((value) => !value)}>{editing ? "Fechar edição" : "Editar dados"}</button>
      </header>
      <div className="church-grid">
        <section className="official">
          <img src="/brand/emblem.png" alt="" width="84" height="84" style={{ borderRadius: "50%", objectFit: "cover" }} />
          <p className="kicker">Trindade · Goiás</p>
          <h2>{church.pastor}</h2>
          <p>{church.addressFull}</p>
          <p>{church.phone}</p>
          <p>{church.email}</p>
          <p>CNPJ {church.cnpj}</p>
          <div className="inline-actions">
            <a className="btn btn-gold" href={whatsappUrl(church.phone)} target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="btn btn-ghost hero-link" href={mapsUrl(church.addressFull)} target="_blank" rel="noreferrer">Mapa</a>
            <button type="button" className="btn btn-ghost hero-link" onClick={async () => { if (await copyText(church.addressFull)) push("Endereço copiado."); }}>Copiar endereço</button>
          </div>
        </section>
        {editing ? (
          <form className="form-section" onSubmit={(event) => { event.preventDefault(); void save(); }}>
            {([
              ["name", "Nome da igreja"],
              ["shortName", "Nome curto"],
              ["pastor", "Pastor presidente"],
              ["email", "E-mail"],
              ["phone", "Telefone"],
              ["cnpj", "CNPJ"],
              ["addressLine", "Logradouro"],
              ["neighborhood", "Bairro"],
              ["city", "Cidade"],
              ["state", "UF"],
              ["cep", "CEP"],
            ] as const).map(([key, label]) => (
              <label key={key} className="field">{label}
                <input className="control" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
                {errors[key] ? <span className="field-error">{errors[key]}</span> : null}
              </label>
            ))}
            <label className="field">Endereço completo do flyer
              <textarea className="control" value={form.addressFull} onChange={(event) => setForm({ ...form, addressFull: event.target.value })} />
              {errors.addressFull ? <span className="field-error">{errors.addressFull}</span> : null}
              <span className="hint">Esta linha é impressa exatamente assim no cartaz.</span>
            </label>
            <button className="btn btn-primary" disabled={saving} type="submit">{saving ? "Salvando…" : "Salvar dados da igreja"}</button>
          </form>
        ) : (
          <section className="card stack">
            <h2>Como a secretaria usa</h2>
            <p>Cadastre a pessoa com foto, cargos e parentesco. Cada alteração fica registrada com data, hora, tipo e o que mudou.</p>
            <p>Na agenda, monte o culto com dirigente, pregador, cantores e intercessores. O botão Gerar flyer monta o prompt, compõe o texto e desenha o cartaz com as fotos disponíveis.</p>
            <p className="muted">Se a variável OPENAI_API_KEY estiver no servidor, o texto criativo passa pelo ChatGPT. Sem a chave, um compositor local escolhe o versículo pelo tema — os dados oficiais nunca são inventados.</p>
          </section>
        )}
      </div>
    </div>
  );
}
