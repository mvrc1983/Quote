export const FORMATOS = [
  "Bobina",
  "Flat Bottom",
  "Sachê 2 soldas",
  "Sachê 3 soldas",
  "Stand-up Pouch",
  "Stand-up Pouch Insertado",
  "4 soldas",
] as const;
export type Formato = (typeof FORMATOS)[number];

export const ZIPPERS = ["Sem", "Normal", "Pocket"] as const;
export type Zipper = (typeof ZIPPERS)[number];

export const SIM_NAO = ["Sem", "Com"] as const;
export type SimNao = (typeof SIM_NAO)[number];

export const VERNIZES = ["Sem", "Brilho", "Verniz Fosco", "Verniz Paper"] as const;
export type Verniz = (typeof VERNIZES)[number];

export const VOLUME_MODES = ["unidades", "kg"] as const;
export type VolumeMode = (typeof VOLUME_MODES)[number];

export const FORMAS_PAGAMENTO = ["Faturado", "Cartão"] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export type QuoteInput = {
  formato: Formato;
  zipper: Zipper;
  valvula: SimNao;
  bico: SimNao;
  /** Id de uma estrutura do catálogo da empresa. */
  estruturaId: string;
  verniz: Verniz;
  /** Id de uma tinta do catálogo da empresa. */
  tipoImpressao: string;
  /** Override opcional (g/m²). Se omitido, usa a gramatura da estrutura. */
  gramatura?: number;
  larguraMm: number;
  alturaMm: number;
  profundidadeMm: number;
  volumeMode: VolumeMode;
  volumeUnidades: number;
  volumeKg: number;
  mkup: number;
  comissao: number;
};

export type LoteUnidades = { unidades: number };
export type LoteKg = { kg: number };
export type Lote = LoteUnidades | LoteKg;

export function isLoteUnidades(lote: Lote): lote is LoteUnidades {
  return "unidades" in lote;
}

export function isLoteKg(lote: Lote): lote is LoteKg {
  return "kg" in lote;
}

export type PropostaInput = {
  cliente: string;
  contato: string;
  data: string;
  espec: string;
  localEntrega: string;
  estado: string;
  frete: string;
  leadTime: string;
  validade: string;
  observacoes: string;
  lotes: Lote[];
  formaPagamento: FormaPagamento;
  prazo: number;
  taxaPagamentoMes: number;
  taxaCartao: number;
  pisCofins: number;
  icms: number;
  ipi: number;
};

export type Estrutura = {
  id: string;
  nome: string;
  gramatura: number;
  precoKg: number;
};

export type Tinta = {
  id: string;
  nome: string;
  precoM2: number;
};

export type CostBreakdown = {
  areaM2: number;
  gramatura: number;
  pesoUnKg: number;
  materialUn: number;
  impressaoUn: number;
  vernizUn: number;
  conversaoUn: number;
  acessoriosUn: number;
  setupTotal: number;
  desperdicio: number;
};

export type LotePreco = {
  lote: Lote;
  unidades: number;
  kg: number;
  custoTotal: number;
  netTotal: number;
  netUn: number;
  netKg: number;
  comImpostosTotal: number;
  comImpostosUn: number;
  comImpostosKg: number;
};

export type QuoteResult = {
  breakdown: CostBreakdown;
  estrutura: Estrutura;
  lotes: LotePreco[];
};
