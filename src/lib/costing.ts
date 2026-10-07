import type { Catalogo } from "../config/catalogo";
import type { CostBreakdown, Lote, LotePreco, QuoteInput, QuoteResult } from "../types";
import { isLoteKg } from "../types";

/** Área de filme por unidade (m²), conforme o formato. O zipper entra à parte. */
export function areaM2PorUnidade(input: QuoteInput): number {
  const w = input.larguraMm / 1000;
  const h = input.alturaMm / 1000;
  const rawD = input.profundidadeMm / 1000;
  const d =
    rawD > 0
      ? rawD
      : input.formato === "Bobina" || input.formato.startsWith("Sachê")
        ? 0
        : Math.min(w, h) * 0.35;

  switch (input.formato) {
    case "Bobina":
      return w * h;
    case "Sachê 2 soldas":
    case "Sachê 3 soldas":
      return 2 * w * h;
    case "Stand-up Pouch":
      return 2 * w * h + w * d;
    case "Stand-up Pouch Insertado":
      return 2 * w * h + 2 * d * h + w * d;
    case "Flat Bottom":
      return 2 * w * h + 2 * d * h + w * d;
    case "4 soldas":
      return 2 * w * h + 2 * d * h;
  }
}

function extraFilmeZipperM2(input: QuoteInput): number {
  const w = input.larguraMm / 1000;
  if (input.zipper === "Normal") return w * 0.015;
  if (input.zipper === "Pocket") return w * 0.025;
  return 0;
}

export function computeBreakdown(catalogo: Catalogo, input: QuoteInput): CostBreakdown {
  const estrutura = catalogo.estruturaById[input.estruturaId];
  if (!estrutura) throw new Error(`Estrutura "${input.estruturaId}" não está no catálogo.`);
  const tinta = catalogo.tintaById[input.tipoImpressao];
  if (!tinta) throw new Error(`Tinta "${input.tipoImpressao}" não está no catálogo.`);

  const gramatura = input.gramatura && input.gramatura > 0 ? input.gramatura : estrutura.gramatura;
  const areaM2 = areaM2PorUnidade(input) + extraFilmeZipperM2(input);
  const pesoUnKg = (areaM2 * gramatura) / 1000;
  const desperdicio = catalogo.fatorDesperdicio;

  const materialUn = pesoUnKg * estrutura.precoKg * desperdicio;
  const impressaoUn = areaM2 * tinta.precoM2 * desperdicio;
  const vernizUn = areaM2 * catalogo.precoVernizM2[input.verniz] * desperdicio;
  const conversaoUn = catalogo.conversaoUn[input.formato];
  const acessoriosUn =
    catalogo.acessorios.zipper[input.zipper] +
    (input.valvula === "Com" ? catalogo.acessorios.valvulaUn : 0) +
    (input.bico === "Com" ? catalogo.acessorios.bicoUn : 0);

  return {
    areaM2,
    gramatura,
    pesoUnKg,
    materialUn,
    impressaoUn,
    vernizUn,
    conversaoUn,
    acessoriosUn,
    setupTotal: catalogo.setupImpressao + catalogo.setupConversao[input.formato],
    desperdicio,
  };
}

/** Fator comercial: markup sobre custo e comissão sobre o preço de venda. */
export function fatorMkupComissao(mkup: number, comissao: number): number {
  const denom = 1 - comissao;
  if (denom <= 0) throw new Error("Comissão inválida: deve ser menor que 100%.");
  return (1 + mkup) / denom;
}

export function fatorPagamento(proposta: PaymentLike): number {
  if (proposta.formaPagamento === "Cartão") return 1 + proposta.taxaCartao;
  return 1 + proposta.taxaPagamentoMes * proposta.prazo;
}

export function fatorImpostos(proposta: TaxLike): number {
  const denom = 1 - proposta.pisCofins - proposta.icms;
  if (denom <= 0) throw new Error("Alíquotas de PIS/COFINS + ICMS inválidas.");
  return (1 / denom) * (1 + proposta.ipi);
}

type PaymentLike = {
  formaPagamento: "Faturado" | "Cartão";
  prazo: number;
  taxaPagamentoMes: number;
  taxaCartao: number;
};

type TaxLike = {
  pisCofins: number;
  icms: number;
  ipi: number;
};

export function custoVariavelUn(b: CostBreakdown): number {
  return b.materialUn + b.impressaoUn + b.vernizUn + b.conversaoUn + b.acessoriosUn;
}

export function priceLote(
  input: QuoteInput,
  proposta: PaymentLike & TaxLike,
  breakdown: CostBreakdown,
  lote: Lote,
): LotePreco {
  const unidades = isLoteKg(lote)
    ? breakdown.pesoUnKg > 0
      ? lote.kg / breakdown.pesoUnKg
      : 0
    : lote.unidades;
  const kg = isLoteKg(lote) ? lote.kg : unidades * breakdown.pesoUnKg;

  const custoTotal = breakdown.setupTotal + custoVariavelUn(breakdown) * unidades;
  const netTotal = custoTotal * fatorMkupComissao(input.mkup, input.comissao) * fatorPagamento(proposta);
  const comImpostosTotal = netTotal * fatorImpostos(proposta);

  return {
    lote,
    unidades,
    kg,
    custoTotal,
    netTotal,
    netUn: unidades > 0 ? netTotal / unidades : 0,
    netKg: kg > 0 ? netTotal / kg : 0,
    comImpostosTotal,
    comImpostosUn: unidades > 0 ? comImpostosTotal / unidades : 0,
    comImpostosKg: kg > 0 ? comImpostosTotal / kg : 0,
  };
}

export function computeQuote(
  catalogo: Catalogo,
  input: QuoteInput,
  proposta: PaymentLike & TaxLike & { lotes: Lote[] },
): QuoteResult {
  const estrutura = catalogo.estruturaById[input.estruturaId];
  if (!estrutura) throw new Error(`Estrutura "${input.estruturaId}" não está no catálogo.`);
  const breakdown = computeBreakdown(catalogo, input);
  const lotes = proposta.lotes.map((lote) => priceLote(input, proposta, breakdown, lote));
  return { breakdown, estrutura, lotes };
}

/** Volume-base da cotação (para o painel de resumo), no modo ativo. */
export function volumeBaseLote(input: QuoteInput): Lote {
  return input.volumeMode === "kg" ? { kg: input.volumeKg } : { unidades: input.volumeUnidades };
}
