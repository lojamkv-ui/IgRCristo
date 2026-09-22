import {
  GENDERS,
  KINSHIP_TYPES,
  MARITAL_STATUSES,
  STATUSES,
} from "./constants";
import { formatCnpj, formatCpf, formatPhone, isIsoDate, isValidCpf, saoPauloToday } from "./format";
import type { ChurchProfile, MemberPayload, ServicePayload } from "./types";

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; fields: FieldErrors };

function asRecord(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

export function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const text = value.replace(/\u0000/g, "").trim();
  if (!text) return null;
  return text.slice(0, max);
}

function optionalDate(value: unknown, field: string, fields: FieldErrors, label: string) {
  const text = cleanText(value, 10);
  if (!text) return null;
  if (!isIsoDate(text)) {
    fields[field] = `${label} precisa ser uma data válida.`;
    return null;
  }
  return text;
}

function assertPhoto(value: string | null | undefined, field: string, fields: FieldErrors) {
  if (!value) return;
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(value);
  if (!match) {
    fields[field] = "A foto precisa ser uma imagem JPG, PNG ou WebP.";
    return;
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(match[1] ?? "")) {
    fields[field] = "Use JPG, PNG ou WebP.";
  }
  if (value.length > 450_000) {
    fields[field] = "A foto ficou grande demais. Escolha uma imagem menor.";
  }
}

function integerOrNull(value: unknown) {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number <= 0) return null;
  return number;
}

export function validateMember(body: unknown, options?: { selfId?: number }): ValidationResult<MemberPayload> {
  const record = asRecord(body);
  if (!record) return { ok: false, error: "Envie os dados do cadastro.", fields: {} };

  const fields: FieldErrors = {};
  const today = saoPauloToday();
  const fullName = cleanText(record.fullName, 120);
  if (!fullName || fullName.length < 3) fields.fullName = "Informe o nome completo, com pelo menos 3 letras.";

  const birthDate = optionalDate(record.birthDate, "birthDate", fields, "A data de nascimento");
  if (birthDate && birthDate > today) fields.birthDate = "A data de nascimento não pode ser futura.";
  if (birthDate && birthDate < "1900-01-01") fields.birthDate = "Confira o ano de nascimento.";

  const gender = cleanText(record.gender, 40);
  if (gender && !GENDERS.includes(gender as (typeof GENDERS)[number])) fields.gender = "Selecione um gênero da lista.";

  const maritalStatus = cleanText(record.maritalStatus, 40);
  if (maritalStatus && !MARITAL_STATUSES.includes(maritalStatus as (typeof MARITAL_STATUSES)[number])) {
    fields.maritalStatus = "Selecione um estado civil da lista.";
  }

  const phoneRaw = cleanText(record.phone, 20);
  let phone: string | null = null;
  if (phoneRaw) {
    const digits = phoneRaw.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) fields.phone = "Informe um telefone com DDD.";
    else phone = formatPhone(digits);
  }

  const email = cleanText(record.email, 160);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = "Informe um e-mail válido ou deixe em branco.";

  const cpfRaw = cleanText(record.cpf, 18);
  let cpf: string | null = null;
  if (cpfRaw) {
    const digits = cpfRaw.replace(/\D/g, "");
    if (!isValidCpf(digits)) fields.cpf = "CPF inválido. Confira os números ou deixe em branco.";
    else cpf = digits;
  }

  const status = cleanText(record.status, 30) ?? "ativo";
  if (!STATUSES.some((item) => item.id === status)) fields.status = "Selecione um status válido.";

  const kinshipTypeRaw = cleanText(record.kinshipType, 40);
  const kinshipType = kinshipTypeRaw && KINSHIP_TYPES.some((item) => item.id === kinshipTypeRaw) ? kinshipTypeRaw : null;
  if (kinshipTypeRaw && !kinshipType) fields.kinshipType = "Selecione um tipo de parentesco.";
  const kinshipMemberId = integerOrNull(record.kinshipMemberId);
  if (record.kinshipMemberId && !kinshipMemberId) fields.kinshipMemberId = "Selecione um membro válido.";
  if (kinshipMemberId && options?.selfId && kinshipMemberId === options.selfId) {
    fields.kinshipMemberId = "Uma pessoa não pode ser parente de si mesma.";
  }
  if (kinshipMemberId && !kinshipType) fields.kinshipType = "Escolha o tipo de parentesco.";

  const photoAction = record.photoAction === "remove" || record.photoAction === "replace" ? record.photoAction : "keep";
  const photo = photoAction === "replace" ? cleanText(record.photo, 500_000) : null;
  if (photoAction === "replace") assertPhoto(photo, "photo", fields);

  const baptismDate = optionalDate(record.baptismDate, "baptismDate", fields, "A data de batismo");
  const conversionDate = optionalDate(record.conversionDate, "conversionDate", fields, "A data de conversão");
  const memberSince = optionalDate(record.memberSince, "memberSince", fields, "A data de membresia");
  if (baptismDate && baptismDate > today) fields.baptismDate = "A data de batismo não pode ser futura.";
  if (conversionDate && conversionDate > today) fields.conversionDate = "A data de conversão não pode ser futura.";
  if (memberSince && memberSince > today) fields.memberSince = "A data de membresia não pode ser futura.";

  const ecclesiasticalOffices = readEcclesiastical(record.ecclesiasticalOffices, fields);
  const localOffices = readLocal(record.localOffices, fields, today);

  if (Object.keys(fields).length) {
    return { ok: false, error: "Revise os campos destacados antes de salvar.", fields };
  }

  return {
    ok: true,
    value: {
      fullName: fullName ?? "",
      photoAction,
      photo,
      birthDate,
      gender,
      maritalStatus,
      phone,
      email,
      cpf,
      address: cleanText(record.address, 180),
      neighborhood: cleanText(record.neighborhood, 80),
      city: cleanText(record.city, 80),
      baptismDate,
      conversionDate,
      memberSince,
      status,
      kinshipType,
      kinshipMemberId: kinshipType ? kinshipMemberId : null,
      kinshipNotes: kinshipType ? cleanText(record.kinshipNotes, 300) : null,
      notes: cleanText(record.notes, 2000),
      ecclesiasticalOffices,
      localOffices,
      baseUpdatedAt: cleanText(record.baseUpdatedAt, 40),
    },
  };
}

function readEcclesiastical(value: unknown, fields: FieldErrors) {
  if (!Array.isArray(value)) return [];
  const offices: MemberPayload["ecclesiasticalOffices"] = [];
  value.forEach((item, index) => {
    const record = asRecord(item);
    if (!record) return;
    const title = cleanText(record.title, 80);
    const date = cleanText(record.consecrationDate, 10);
    const notes = cleanText(record.notes, 300);
    if (!title && !date && !notes) return;
    if (!title) fields[`ecc-${index}-title`] = "Informe o cargo eclesiástico ou remova a linha.";
    if (!date || !isIsoDate(date)) fields[`ecc-${index}-date`] = "Cada cargo eclesiástico precisa da data de consagração.";
    if (title && date && isIsoDate(date)) offices.push({ title, consecrationDate: date, notes });
  });
  if (offices.length > 12) fields.ecclesiasticalOffices = "Limite de 12 cargos eclesiásticos por pessoa.";
  return offices;
}

function readLocal(value: unknown, fields: FieldErrors, today: string) {
  if (!Array.isArray(value)) return [];
  const offices: MemberPayload["localOffices"] = [];
  value.forEach((item, index) => {
    const record = asRecord(item);
    if (!record) return;
    const title = cleanText(record.title, 80);
    const startDate = cleanText(record.startDate, 10);
    const endDate = cleanText(record.endDate, 10);
    const notes = cleanText(record.notes, 300);
    if (!title && !startDate && !endDate && !notes) return;
    if (!title) fields[`local-${index}-title`] = "Informe o cargo local ou remova a linha.";
    if (!startDate || !isIsoDate(startDate)) fields[`local-${index}-start`] = "Informe a data inicial do cargo local.";
    if (endDate && !isIsoDate(endDate)) fields[`local-${index}-end`] = "A data final do cargo local é inválida.";
    if (startDate && endDate && isIsoDate(startDate) && isIsoDate(endDate) && endDate < startDate) {
      fields[`local-${index}-end`] = "A data final não pode ser anterior à data inicial.";
    }
    if (title && startDate && isIsoDate(startDate) && (!endDate || isIsoDate(endDate))) {
      offices.push({
        title,
        startDate,
        endDate: endDate && isIsoDate(endDate) ? endDate : null,
        notes,
        active: !endDate || endDate >= today,
      });
    }
  });
  if (offices.length > 12) fields.localOffices = "Limite de 12 cargos locais por pessoa.";
  return offices;
}

export function validateService(body: unknown): ValidationResult<ServicePayload> {
  const record = asRecord(body);
  if (!record) return { ok: false, error: "Envie os dados do culto.", fields: {} };
  const fields: FieldErrors = {};
  const serviceDate = cleanText(record.serviceDate, 10);
  if (!serviceDate || !isIsoDate(serviceDate)) fields.serviceDate = "Informe a data do culto.";
  else if (serviceDate < "2000-01-01" || serviceDate > "2100-12-31") fields.serviceDate = "Confira o ano do culto.";

  const serviceTimeRaw = cleanText(record.serviceTime, 8);
  const serviceTime = serviceTimeRaw ? serviceTimeRaw.slice(0, 5) : null;
  if (!serviceTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(serviceTime)) fields.serviceTime = "Informe um horário válido.";

  const title = cleanText(record.title, 80);
  if (!title) fields.title = "Informe o nome do culto.";
  const leaderName = cleanText(record.leaderName, 120);
  if (!leaderName) fields.leaderName = "Informe quem dirige o culto.";
  const preacherName = cleanText(record.preacherName, 120);
  if (!preacherName) fields.preacherName = "Informe quem prega.";

  const preacherPhotoAction =
    record.preacherPhotoAction === "keep" || record.preacherPhotoAction === "replace" ? record.preacherPhotoAction : "clear";
  const preacherPhoto = preacherPhotoAction === "replace" ? cleanText(record.preacherPhoto, 500_000) : null;
  if (preacherPhotoAction === "replace") assertPhoto(preacherPhoto, "preacherPhoto", fields);

  const singers = readPeople(record.singers, "singer", fields, true);
  const intercessors = readPeople(record.intercessors, "intercessor", fields, false);

  if (Object.keys(fields).length || !serviceDate || !serviceTime || !title || !leaderName || !preacherName) {
    return { ok: false, error: "Revise os campos destacados antes de salvar.", fields };
  }

  return {
    ok: true,
    value: {
      serviceDate,
      serviceTime,
      title,
      theme: cleanText(record.theme, 140),
      leaderId: integerOrNull(record.leaderId),
      leaderName,
      preacherId: integerOrNull(record.preacherId),
      preacherName,
      showPreacherPhoto: record.showPreacherPhoto !== false,
      preacherPhotoAction,
      preacherPhoto,
      notes: cleanText(record.notes, 2000),
      singers,
      intercessors: intercessors.map((person) => ({ memberId: person.memberId, name: person.name })),
      baseUpdatedAt: cleanText(record.baseUpdatedAt, 40),
    },
  };
}

function readPeople(value: unknown, prefix: string, fields: FieldErrors, withPhoto: boolean) {
  if (!Array.isArray(value)) return [];
  const people: ServicePayload["singers"] = [];
  value.forEach((item, index) => {
    const record = asRecord(item);
    if (!record) return;
    const name = cleanText(record.name, 120);
    const memberId = integerOrNull(record.memberId);
    if (!name && !memberId) return;
    if (!name) fields[`${prefix}-${index}-name`] = "Informe o nome ou remova a linha.";
    const photoAction = record.photoAction === "keep" || record.photoAction === "replace" ? record.photoAction : "clear";
    const photo = withPhoto && photoAction === "replace" ? cleanText(record.photo, 500_000) : null;
    if (withPhoto && photoAction === "replace") assertPhoto(photo, `${prefix}-${index}-photo`, fields);
    if (name) {
      people.push({
        id: integerOrNull(record.id),
        memberId,
        name,
        showPhoto: record.showPhoto !== false,
        photoAction,
        photo,
      });
    }
  });
  const limit = prefix === "singer" ? 8 : 10;
  if (people.length > limit) fields[prefix] = `Limite de ${limit} pessoas neste campo.`;
  return people;
}

export function validateChurch(body: unknown): ValidationResult<ChurchProfile> {
  const record = asRecord(body);
  if (!record) return { ok: false, error: "Envie os dados da igreja.", fields: {} };
  const fields: FieldErrors = {};
  const required = (key: keyof ChurchProfile, label: string, max: number) => {
    const text = cleanText(record[key], max);
    if (!text) fields[key] = `Informe ${label}.`;
    return text ?? "";
  };
  const email = required("email", "o e-mail", 160);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = "E-mail inválido.";
  const phoneRaw = required("phone", "o telefone", 20);
  const phoneDigits = phoneRaw.replace(/\D/g, "");
  if (phoneRaw && phoneDigits.length < 10) fields.phone = "Telefone inválido.";
  const cnpjRaw = required("cnpj", "o CNPJ", 20);
  const cnpjDigits = cnpjRaw.replace(/\D/g, "");
  if (cnpjRaw && cnpjDigits.length !== 14) fields.cnpj = "CNPJ precisa ter 14 números.";
  const state = required("state", "o estado", 2).toUpperCase();
  if (state && !/^[A-Z]{2}$/.test(state)) fields.state = "Use a sigla do estado, como GO.";
  const cep = required("cep", "o CEP", 16);
  if (cep && cep.replace(/\D/g, "").length < 8) fields.cep = "CEP incompleto.";

  if (Object.keys(fields).length) return { ok: false, error: "Revise os dados da igreja.", fields };

  return {
    ok: true,
    value: {
      name: required("name", "o nome da igreja", 120),
      shortName: required("shortName", "o nome curto", 40),
      pastor: required("pastor", "o pastor presidente", 120),
      email,
      phone: formatPhone(phoneDigits),
      cnpj: formatCnpj(cnpjDigits),
      addressLine: required("addressLine", "o logradouro", 160),
      neighborhood: required("neighborhood", "o bairro", 80),
      city: required("city", "a cidade", 80),
      state,
      cep,
      addressFull: required("addressFull", "o endereço completo do flyer", 240),
    },
  };
}

export function formatCpfDisplay(cpf: string | null) {
  return cpf ? formatCpf(cpf) : null;
}
