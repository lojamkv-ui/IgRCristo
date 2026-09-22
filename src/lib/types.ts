import type { HistoryEntry, Member, MemberRole, Service, Settings } from "@/db/schema";

export type RoleKind = "eclesiastico" | "local";

export type RolePayload = {
  id?: number | null;
  kind: RoleKind;
  title: string;
  consecrationDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type MemberWithRoles = Member & { roles: MemberRole[] };
export type HistoryDTO = HistoryEntry;
export type ServiceDTO = Service;
export type SettingsDTO = Settings;

export type SingerPayload = { name: string; photo: string | null; memberId?: number | null };

export type MemberPayload = {
  name: string;
  photo?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  kinship?: string | null;
  familyName?: string | null;
  baptismDate?: string | null;
  memberSince?: string | null;
  status?: string;
  notes?: string | null;
  roles: RolePayload[];
};

export type ServicePayload = {
  title: string;
  kind?: string | null;
  serviceDate: string;
  serviceTime: string;
  leader: string;
  preacherName?: string | null;
  preacherPhoto?: string | null;
  preacherMemberId?: number | null;
  singers?: SingerPayload[];
  intercessors?: string[];
  theme?: string | null;
  scripture?: string | null;
  notes?: string | null;
  status?: string;
};

export type MemberFilters = {
  q?: string;
  ecclesiastical?: string;
  local?: string;
  kinship?: string;
  status?: string;
  sort?: "name" | "recent" | "created";
};

/** Listas de apoio usadas nos selects (também servem de sugestão em datalist). */
export const ECCLESIASTICAL_ROLES = [
  "Apóstolo",
  "Bispo",
  "Pastor",
  "Pastora",
  "Presbítero",
  "Diácono",
  "Diaconisa",
  "Evangelista",
  "Missionário",
  "Missionária",
  "Mestre",
  "Profeta",
  "Obreiro",
  "Cooperador",
] as const;

export const LOCAL_ROLES = [
  "Dirigente de Célula",
  "Professor(a) de EBD",
  "Tesoureiro(a)",
  "Secretário(a)",
  "Regente de Coral",
  "Músico(a)",
  "Vocalista",
  "Recepcionista",
  "Zelador(a)",
  "Líder de Jovens",
  "Líder de Senhoras",
  "Líder de Homens",
  "Intercessor(a)",
  "Ministério Infantil",
  "Mídia e Transmissão",
] as const;

export const KINSHIPS = [
  "Cônjuge",
  "Filho(a)",
  "Pai",
  "Mãe",
  "Irmão(ã)",
  "Avô(ó)",
  "Neto(a)",
  "Sobrinho(a)",
  "Tio(a)",
  "Primo(a)",
  "Padrasto / Madrasta",
  "Enteado(a)",
  "Cunhado(a)",
  "Genro",
  "Nora",
  "Noivo(a)",
  "Namorado(a)",
  "Amigo(a)",
  "Sem parentesco",
] as const;

export const GENDERS = ["Masculino", "Feminino", "Prefere não informar"] as const;

export const MEMBER_STATUS = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "visitante", label: "Visitante" },
  { value: "afastado", label: "Afastado" },
] as const;

export const SERVICE_KINDS = [
  "Culto de Celebração",
  "Santa Ceia",
  "Culto de Doutrina",
  "Culto de Oração",
  "Vigília",
  "Escola Bíblica Dominical",
  "Culto de Jovens",
  "Culto de Senhoras",
  "Culto de Homens",
  "Culto de Missões",
  "Batismo",
  "Casamento",
] as const;

export const SERVICE_STATUS = [
  { value: "agendado", label: "Agendado" },
  { value: "realizado", label: "Realizado" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const HISTORY_TYPES = [
  { value: "criado", label: "Cadastro criado" },
  { value: "atualizado", label: "Dados atualizados" },
  { value: "foto", label: "Foto" },
  { value: "cargo_adicionado", label: "Cargo adicionado" },
  { value: "cargo_atualizado", label: "Cargo atualizado" },
  { value: "cargo_removido", label: "Cargo removido" },
  { value: "restaurado", label: "Restauração / importação" },
] as const;

export const ROLE_LABEL: Record<string, string> = {
  name: "Nome",
  photo: "Foto",
  birthDate: "Data de nascimento",
  gender: "Sexo",
  email: "E-mail",
  phone: "Telefone",
  address: "Endereço",
  city: "Cidade",
  kinship: "Parentesco",
  familyName: "Família",
  baptismDate: "Data de batismo",
  memberSince: "Membro desde",
  status: "Situação",
  notes: "Observações",
};

export const SERVICE_LABEL: Record<string, string> = {
  title: "Título",
  kind: "Tipo de culto",
  serviceDate: "Data",
  serviceTime: "Hora",
  leader: "Dirigente",
  preacherName: "Pregador",
  preacherPhoto: "Foto do pregador",
  singers: "Cantores",
  intercessors: "Intercessores",
  theme: "Tema",
  scripture: "Texto bíblico",
  notes: "Observações",
  status: "Situação",
};
