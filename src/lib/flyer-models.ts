/**
 * Biblioteca de modelos (layouts) do flyer.
 * Cada modelo é uma forma diferente de compor o cartaz no canvas.
 * Combina com qualquer tema visual e com qualquer formato (feed/story).
 */

export type FlyerModelId = "sede" | "editorial" | "faixa" | "minimal" | "galeria" | "selo";

export type FlyerModel = {
  id: FlyerModelId;
  label: string;
  note: string;
};

export const FLYER_MODELS: FlyerModel[] = [
  {
    id: "sede",
    label: "Clássico",
    note: "Coluna centralizada, brasão no alto, dia do culto em número grande e fotos na base.",
  },
  {
    id: "editorial",
    label: "Editorial",
    note: "Texto alinhado à esquerda com filete lateral, como uma página de jornal da igreja.",
  },
  {
    id: "faixa",
    label: "Faixa Dupla",
    note: "Faixas horizontais: a de cima com o nome da sede, a do meio com a data do culto.",
  },
  {
    id: "minimal",
    label: "Minimal",
    note: "Tipografia pequena, muito respiro e versículo solto, sem cartão nem ornamento.",
  },
  {
    id: "galeria",
    label: "Galeria",
    note: "Fotos no topo, uma ao lado da outra, com nome e função. Bom para escala cheia.",
  },
  {
    id: "selo",
    label: "Selo",
    note: "Selo circular com o dia do culto e traços radiantes. Solene, para ceia e vigília.",
  },
];

export const DEFAULT_FLYER_MODEL: FlyerModel = FLYER_MODELS[0] as FlyerModel;

export function isFlyerModelId(value: string): boolean {
  return FLYER_MODELS.some((model) => model.id === value);
}

export function getFlyerModel(value: string | null | undefined): FlyerModel {
  if (!value) return DEFAULT_FLYER_MODEL;
  return FLYER_MODELS.find((model) => model.id === value) ?? DEFAULT_FLYER_MODEL;
}

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Sugere um layout a partir do nome do culto. A secretaria pode trocar depois. */
export function suggestFlyerModelId(title: string, subject?: string | null): FlyerModelId {
  const haystack = fold(`${title} ${subject ?? ""}`);
  const has = (...words: string[]) => words.some((word) => haystack.includes(word));
  if (has("joven", "mocidade", "adolescente", "infantil", "crianca")) return "galeria";
  if (has("ceia", "vigilia", "oracao", "intercess")) return "selo";
  if (has("familia", "familias", "casal", "casais", "mulher", "homem", "festa", "aniversario")) return "faixa";
  if (has("missao", "missoes", "conferencia", "campanha", "avivamento")) return "editorial";
  if (has("doutrina", "ensino", "estudo", "escola dominical")) return "minimal";
  return "sede";
}
