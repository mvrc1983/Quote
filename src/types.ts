export const FORMATOS = [
  "Bobina",
  "Flat Bottom",
  "Sachê 2 soldas",
  "Sachê 3 soldas",
  "Stand-up Pouch",
  "Stand-up Pouch Insertado",
  "4 soldas",
  "Rótulo",
  "Sleeve",
  "Cartonado",
] as const;
export type Formato = (typeof FORMATOS)[number];

/** Aplicação do formato. A compatibilidade com o processo de impressão usa esta chave. */
export const APLICACOES = ["flexivel", "rotulo", "sleeve", "cartonado"] as const;
export type Aplicacao = (typeof APLICACOES)[number];

export const APLICACAO_LABEL: Record<Aplicacao, string> = {
  flexivel: "embalagem flexível",
  rotulo: "rótulo autoadesivo",
  sleeve: "sleeve",
  cartonado: "cartonado",
};

export function aplicacaoDoFormato(formato: Formato): Aplicacao {
  if (formato === "Rótulo") return "rotulo";
  if (formato === "Sleeve") return "sleeve";
  if (formato === "Cartonado") return "cartonado";
  return "flexivel";
}

export const FAMILIAS_PROCESSO = ["flexo", "roto", "digital", "offset"] as const;
export type FamiliaProcesso = (typeof FAMILIAS_PROCESSO)[number];

export const TECNOLOGIAS_DIGITAL = ["nenhuma", "eletrofotografica", "inkjet"] as const;
export type TecnologiaDigital = (typeof TECNOLOGIAS_DIGITAL)[number];

export const MODOS_FERRAMENTAL = ["diluido", "aparte"] as const;
export type ModoFerramental = (typeof MODOS_FERRAMENTAL)[number];

export const PASSAGENS = ["linha", "separada"] as const;
export type Passagem = (typeof PASSAGENS)[number];

export const ALIMENTACOES = ["bobina", "folha"] as const;
export type Alimentacao = (typeof ALIMENTACOES)[number];

/** Um grupo de cores/unidades. Híbridos em linha somam vários grupos. */
export type GrupoImpressao = {
  processoId: string;
  numCores: number;
  numBranco: number;
  numEspeciais: number;
};

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
  /** Grupos de impressão. Um grupo é um processo; híbrido em linha leva mais de um. */
  grupos: GrupoImpressao[];
  /** linha = uma passada, velocidades e custos de máquina combinados. separada = cada grupo roda sozinho. */
  passagem: Passagem;
  /** Repetição ao longo da banda (mm). Zero usa a altura mais o vão do processo. Ignorado na folha. */
  passoMm: number;
  pistas: number;
  ferramentalModo: ModoFerramental;
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

export type CostBreakdown = {
  areaM2: number;
  gramatura: number;
  pesoUnKg: number;
  materialUn: number;
  impressaoUn: number;
  vernizUn: number;
  conversaoUn: number;
  acessoriosUn: number;
  maquinaUn: number;
  /** Setup de máquina, acerto e conversão. Inclui ferramental quando o modo é diluído. */
  setupTotal: number;
  /** Custo de clichê, chapa ou cilindro do pedido, antes do comercial. */
  ferramental: number;
  ferramentalNoLote: boolean;
  desperdicio: number;
  passoMm: number;
  pistas: number;
  larguraWebMm: number;
  larguraUtilMm: number;
  cabeNaMaquina: boolean;
  numCores: number;
  alimentacao: Alimentacao;
  poses: number;
  folhaLarguraMm: number;
  folhaAlturaMm: number;
  custoFolhaPapel: number;
  custoFolhaMaquina: number;
  folhasAcerto: number;
  avisos: string[];
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
  processoNome: string;
  /** Preço de venda do ferramental quando cobrado à parte. Zero se estiver diluído no lote. */
  ferramentalAParte: number;
  lotes: LotePreco[];
};
