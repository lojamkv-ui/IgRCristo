export type EcclesiasticalOffice = {
  title: string;
  consecrationDate: string;
  notes: string | null;
};

export type LocalOffice = {
  title: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  active?: boolean;
};

export type HistoryEntry = {
  id: number;
  changeType: string;
  summary: string;
  previousData: unknown;
  newData: unknown;
  actor: string;
  changedAt: string;
};

export type MemberListItem = {
  id: number;
  fullName: string;
  photoUrl: string | null;
  status: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  neighborhood: string | null;
  birthDate: string | null;
  kinshipType: string | null;
  kinshipMemberId: number | null;
  kinshipMemberName: string | null;
  kinshipNotes: string | null;
  ecclesiastical: EcclesiasticalOffice[];
  local: LocalOffice[];
  updatedAt: string;
};

export type MemberDetail = MemberListItem & {
  gender: string | null;
  maritalStatus: string | null;
  cpf: string | null;
  address: string | null;
  baptismDate: string | null;
  conversionDate: string | null;
  memberSince: string | null;
  notes: string | null;
  createdAt: string;
  history: HistoryEntry[];
};

export type MemberPayload = {
  fullName: string;
  photoAction: "keep" | "remove" | "replace";
  photo?: string | null;
  birthDate: string | null;
  gender: string | null;
  maritalStatus: string | null;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  baptismDate: string | null;
  conversionDate: string | null;
  memberSince: string | null;
  status: string;
  kinshipType: string | null;
  kinshipMemberId: number | null;
  kinshipNotes: string | null;
  notes: string | null;
  ecclesiasticalOffices: EcclesiasticalOffice[];
  localOffices: LocalOffice[];
  baseUpdatedAt?: string | null;
};

export type Participant = {
  id?: number;
  memberId: number | null;
  name: string;
  photoUrl: string | null;
};

export type ServiceItem = {
  id: number;
  serviceDate: string;
  serviceTime: string;
  title: string;
  theme: string | null;
  leaderId: number | null;
  leaderName: string;
  leaderPhotoUrl: string | null;
  preacherId: number | null;
  preacherName: string;
  preacherPhotoUrl: string | null;
  showPreacherPhoto: boolean;
  notes: string | null;
  singers: Participant[];
  intercessors: Participant[];
  createdAt: string;
  updatedAt: string;
};

export type SingerPayload = {
  id?: number | null;
  memberId: number | null;
  name: string;
  showPhoto: boolean;
  photoAction: "keep" | "clear" | "replace";
  photo?: string | null;
};

export type ServicePayload = {
  serviceDate: string;
  serviceTime: string;
  title: string;
  theme: string | null;
  leaderId: number | null;
  leaderName: string;
  preacherId: number | null;
  preacherName: string;
  showPreacherPhoto: boolean;
  preacherPhotoAction: "keep" | "clear" | "replace";
  preacherPhoto?: string | null;
  notes: string | null;
  singers: SingerPayload[];
  intercessors: { memberId: number | null; name: string }[];
  baseUpdatedAt?: string | null;
};

export type ChurchProfile = {
  name: string;
  shortName: string;
  pastor: string;
  email: string;
  phone: string;
  cnpj: string;
  addressLine: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  addressFull: string;
  updatedAt?: string;
};

export type MemberOption = {
  id: number;
  fullName: string;
  suggestedName: string;
  photoUrl: string | null;
  status: string;
  ecclesiastical: string[];
  local: string[];
};

export type OptionsPayload = {
  members: MemberOption[];
  ecclesiasticalTitles: string[];
  localTitles: string[];
  kinshipTypes: { id: string; label: string }[];
  statuses: { id: string; label: string }[];
  genders: string[];
  maritalStatuses: string[];
  serviceTitles: string[];
  changeTypes: { id: string; label: string }[];
  today: string;
};

export type FlyerCopy = {
  headline: string;
  verseReference: string;
  verseText: string;
  invitation: string;
  hashtags: string[];
};

export type FlyerResponse = {
  source: "openai" | "simulacao";
  notice: string;
  prompt: string;
  copy: FlyerCopy;
  service: ServiceItem;
  church: ChurchProfile;
  variant: number;
  tone?: string;
};

export type DashboardPayload = {
  today: string;
  greetingHour: number;
  stats: {
    activeMembers: number;
    totalMembers: number;
    servicesThisMonth: number;
    activeLocalOffices: number;
    birthdays: number;
  };
  nextService: ServiceItem | null;
  upcoming: ServiceItem[];
  birthdays: {
    id: number;
    fullName: string;
    photoUrl: string | null;
    birthDate: string;
    day: number;
    turning: number;
    isToday: boolean;
  }[];
  recentChanges: {
    id: number;
    memberId: number;
    memberName: string;
    changeType: string;
    summary: string;
    actor: string;
    changedAt: string;
  }[];
};
