import type { Catalogo, Processo } from "../config/catalogo";
import type { CostBreakdown, GrupoImpressao, Lote, LotePreco, QuoteInput, QuoteResult } from "../types";
import { aplicacaoDoFormato, isLoteKg } from "../types";
import {
  calcularImposicao,
  calcularPoses,
  custoFerramental,
  custoTintaPorM2,
  type ImposicaoFolha,
} from "./impressao";

/** Área do produto por unidade (m²), conforme o formato. O zipper entra à parte. */
export function areaM2PorUnidade(input: QuoteInput, seamMm = 0): number {
  const w = input.larguraMm / 1000;
  const h = input.alturaMm / 1000;
  const rawD = input.profundidadeMm / 1000;
  const semFole =
    input.formato === "Bobina" ||
    input.formato.startsWith("Sachê") ||
    input.formato === "Rótulo" ||
    input.formato === "Sleeve" ||
    input.formato === "Cartonado";
  const d = rawD > 0 ? rawD : semFole ? 0 : Math.min(w, h) * 0.35;

  switch (input.formato) {
    case "Bobina":
    case "Rótulo":
    case "Cartonado":
      return w * h;
    case "Sleeve":
      return ((2 * input.larguraMm + seamMm) / 1000) * h;
    case "Sachê 2 soldas":
    case "Sachê 3 soldas":
      return 2 * w * h;
    case "Stand-up Pouch":
      return 2 * w * h + w * d;
    case "Stand-up Pouch Insertado":
    case "Flat Bottom":
      return 2 * w * h + 2 * d * h + w * d;
    case "4 soldas":
      return 2 * w * h + 2 * d * h;
  }
}

function extraFilmeZipperM2(input: QuoteInput): number {
  if (aplicacaoDoFormato(input.formato) !== "flexivel") return 0;
  const w = input.larguraMm / 1000;
  if (input.zipper === "Normal") return w * 0.015;
  if (input.zipper === "Pocket") return w * 0.025;
  return 0;
}

function exigirProcessos(catalogo: Catalogo, input: QuoteInput): Processo[] {
  if (input.grupos.length === 0) throw new Error("Informe ao menos um processo de impressão.");
  return input.grupos.map((grupo) => {
    const processo = catalogo.processoById[grupo.processoId];
    if (!processo) throw new Error(`Processo "${grupo.processoId}" não está no catálogo.`);
    return processo;
  });
}

type ParteGrupo = {
  processo: Processo;
  grupo: GrupoImpressao;
  tintaM2: number;
  ferramental: number;
  horasSetup: number;
  metrosAcerto: number;
  folhasAcerto: number;
};

function partesDe(processos: Processo[], grupos: GrupoImpressao[], areaFerramentaM2: number, passoMm: number): ParteGrupo[] {
  return processos.map((processo, index) => {
    const grupo = grupos[index];
    return {
      processo,
      grupo,
      tintaM2: custoTintaPorM2(processo, grupo),
      ferramental: custoFerramental(processo, grupo, areaFerramentaM2, passoMm),
      horasSetup: processo.setupHorasBase + processo.setupHorasPorCor * grupo.numCores,
      metrosAcerto: processo.metrosAcertoBase + processo.metrosAcertoPorCor * grupo.numCores,
      folhasAcerto: processo.folhasAcertoBase + processo.folhasAcertoPorCor * grupo.numCores,
    };
  });
}

export function computeBreakdown(catalogo: Catalogo, input: QuoteInput): CostBreakdown {
  const estrutura = catalogo.estruturaById[input.estruturaId];
  if (!estrutura) throw new Error(`Estrutura "${input.estruturaId}" não está no catálogo.`);
  const processos = exigirProcessos(catalogo, input);
  const formato = catalogo.formatoById[input.formato];
  const gramatura = input.gramatura && input.gramatura > 0 ? input.gramatura : estrutura.gramatura;
  const desperdicio = catalogo.fatorDesperdicio;
  const avisos: string[] = [];

  const alimentacoes = new Set(processos.map((processo) => processo.alimentacao));
  if (alimentacoes.size > 1) {
    throw new Error("Híbrido não mistura máquina a folha e máquina a bobina.");
  }
  const alimentacao = processos[0].alimentacao;
  const linha = input.passagem !== "separada";

  const areaCorpo = areaM2PorUnidade(input, formato.seamMm);
  const areaTinta = input.formato === "Rótulo" ? (input.larguraMm / 1000) * (input.alturaMm / 1000) : areaCorpo;
  const conversaoUn = catalogo.conversaoUn[input.formato];
  const acessoriosUn =
    catalogo.acessorios.zipper[input.zipper] +
    (input.valvula === "Com" ? catalogo.acessorios.valvulaUn : 0) +
    (input.bico === "Com" ? catalogo.acessorios.bicoUn : 0);
  const vernizBase = areaTinta * catalogo.precoVernizM2[input.verniz] * desperdicio;
  const numCores = input.grupos.reduce((sum, grupo) => sum + grupo.numCores, 0);

  if (alimentacao === "folha") {
    return breakdownFolha(catalogo, input, {
      estruturaPreco: estrutura.precoKg,
      gramatura,
      desperdicio,
      processos,
      formatoSetup: catalogo.setupConversao[input.formato],
      areaCorpo,
      areaTinta,
      conversaoUn,
      acessoriosUn,
      vernizBase,
      numCores,
      linha,
      avisos,
    });
  }

  return breakdownBobina(catalogo, input, {
    estruturaPreco: estrutura.precoKg,
    gramatura,
    desperdicio,
    processos,
    formato,
    areaCorpo,
    areaTinta,
    conversaoUn,
    acessoriosUn,
    vernizBase,
    numCores,
    linha,
    avisos,
  });
}

type Comum = {
  estruturaPreco: number;
  gramatura: number;
  desperdicio: number;
  processos: Processo[];
  areaCorpo: number;
  areaTinta: number;
  conversaoUn: number;
  acessoriosUn: number;
  vernizBase: number;
  numCores: number;
  linha: boolean;
  avisos: string[];
};

function breakdownBobina(catalogo: Catalogo, input: QuoteInput, ctx: Comum & { formato: Catalogo["formatoById"][QuoteInput["formato"]] }): CostBreakdown {
  const referencia = ctx.processos[0];
  const imposicao = calcularImposicao(input, referencia, ctx.formato);
  for (const processo of ctx.processos) {
    if (imposicao.larguraWebMm > processo.larguraUtilMm + 1e-6) {
      ctx.avisos.push(
        `A banda de ${imposicao.larguraWebMm} mm passa da largura útil de ${processo.larguraUtilMm} mm (${processo.nome}).`,
      );
    }
  }

  const areaFerramenta = (imposicao.passoMm / 1000) * (imposicao.larguraWebMm / 1000);
  const partes = partesDe(ctx.processos, input.grupos, areaFerramenta, imposicao.passoMm);
  const webM = imposicao.larguraWebMm / 1000;
  const substratoPorUn =
    input.formato === "Rótulo" || input.formato === "Sleeve"
      ? imposicao.metrosPorUn * webM
      : ctx.areaCorpo + extraFilmeZipperM2(input);

  const tintaM2 = partes.reduce((sum, parte) => sum + parte.tintaM2, 0);
  const impressaoUn = tintaM2 * ctx.areaTinta * ctx.desperdicio;
  const velocidades = partes.map((parte) => parte.processo.velocidadeMMin);
  const horas = partes.map((parte) => parte.processo.custoHora);
  const maquinaUn = ctx.linha
    ? (imposicao.metrosPorUn / Math.min(...velocidades)) * (horas.reduce((a, b) => a + b, 0) / 60)
    : partes.reduce(
        (sum, parte) => sum + (imposicao.metrosPorUn / parte.processo.velocidadeMMin) * (parte.processo.custoHora / 60),
        0,
      );

  const metrosLista = partes.map((parte) => parte.metrosAcerto);
  const metrosSubstrato = ctx.linha ? Math.max(...metrosLista) : metrosLista.reduce((a, b) => a + b, 0);
  const substratoAcerto = metrosSubstrato * webM * (ctx.gramatura / 1000) * ctx.estruturaPreco;
  const tintaAcerto = partes.reduce((sum, parte) => sum + parte.metrosAcerto * webM * parte.tintaM2, 0);
  const setupTempo = partes.reduce((sum, parte) => sum + parte.horasSetup * parte.processo.custoHora, 0);
  const ferramental = partes.reduce((sum, parte) => sum + parte.ferramental, 0);
  const pesoUnKg = (substratoPorUn * ctx.gramatura) / 1000;

  return fechar(input, ctx, {
    areaM2: substratoPorUn,
    pesoUnKg,
    materialUn: pesoUnKg * ctx.estruturaPreco * ctx.desperdicio,
    impressaoUn,
    maquinaUn,
    setupTotal:
      setupTempo +
      substratoAcerto +
      tintaAcerto +
      catalogo.setupConversao[input.formato] +
      (input.ferramentalModo === "diluido" ? ferramental : 0),
    ferramental,
    passoMm: imposicao.passoMm,
    pistas: imposicao.pistas,
    larguraWebMm: imposicao.larguraWebMm,
    larguraUtilMm: Math.min(...ctx.processos.map((processo) => processo.larguraUtilMm)),
    cabeNaMaquina: ctx.avisos.length === 0,
    alimentacao: "bobina",
    poses: 0,
    folhaLarguraMm: 0,
    folhaAlturaMm: 0,
    custoFolhaPapel: 0,
    custoFolhaMaquina: 0,
    folhasAcerto: 0,
  });
}

function breakdownFolha(
  catalogo: Catalogo,
  input: QuoteInput,
  ctx: Comum & { formatoSetup: number; estruturaPreco: number },
): CostBreakdown {
  const linhaMesmoFormato =
    ctx.linha &&
    ctx.processos.every(
      (processo) =>
        processo.folhaLarguraMaxMm === ctx.processos[0].folhaLarguraMaxMm &&
        processo.folhaAlturaMaxMm === ctx.processos[0].folhaAlturaMaxMm,
    );
  const emLinha = linhaMesmoFormato;
  if (ctx.linha && !emLinha) {
    ctx.avisos.push("Formatos de folha diferentes: as passagens foram somadas em separado.");
  }

  if (!emLinha && ctx.processos.length > 1) {
    return somarFolhasSeparadas(catalogo, input, ctx);
  }

  const prensa = ctx.processos[0];
  const poses = calcularPoses(input.larguraMm, input.alturaMm, prensa);
  if (!poses.cabe) {
    ctx.avisos.push(
      `O cartucho ${input.larguraMm}×${input.alturaMm} mm não cabe na folha ${poses.folhaLarguraMm}×${poses.folhaAlturaMm} mm (${prensa.nome}).`,
    );
  }
  const folhasPorHora = Math.min(...ctx.processos.map((processo) => processo.folhasPorHora));
  const custoHora = ctx.processos.reduce((sum, processo) => sum + processo.custoHora, 0);
  const folhaM2 = (poses.folhaLarguraMm / 1000) * (poses.folhaAlturaMm / 1000);
  const custoFolhaPapel = folhaM2 * (ctx.gramatura / 1000) * ctx.estruturaPreco;
  const custoFolhaMaquina = folhasPorHora > 0 ? custoHora / folhasPorHora : 0;
  const partes = partesDe(ctx.processos, input.grupos, folhaM2, 0);
  const posesUteis = poses.poses > 0 ? poses.poses : 0;
  const tintaM2 = partes.reduce((sum, parte) => sum + parte.tintaM2, 0);
  const impressaoUn = tintaM2 * ctx.areaTinta * ctx.desperdicio;
  const areaMaterial = posesUteis > 0 ? folhaM2 / posesUteis : ctx.areaCorpo;
  const pesoUnKg = (areaMaterial * ctx.gramatura) / 1000;
  const folhasAcerto = Math.max(...partes.map((parte) => parte.folhasAcerto));
  const tintaAcerto = partes.reduce(
    (sum, parte) => sum + parte.folhasAcerto * parte.tintaM2 * ctx.areaTinta * Math.max(posesUteis, 1),
    0,
  );
  const setupTempo = partes.reduce((sum, parte) => sum + parte.horasSetup * parte.processo.custoHora, 0);
  const ferramental = partes.reduce((sum, parte) => sum + parte.ferramental, 0);
  const papelAcerto = folhasAcerto * custoFolhaPapel;
  const maqAcerto = folhasAcerto * custoFolhaMaquina;

  return fechar(input, ctx, {
    areaM2: areaMaterial,
    pesoUnKg,
    materialUn: posesUteis > 0 ? custoFolhaPapel * ctx.desperdicio / posesUteis : 0,
    impressaoUn,
    maquinaUn: posesUteis > 0 ? custoFolhaMaquina / posesUteis : 0,
    setupTotal:
      setupTempo +
      papelAcerto +
      maqAcerto +
      tintaAcerto +
      ctx.formatoSetup +
      (input.ferramentalModo === "diluido" ? ferramental : 0),
    ferramental,
    passoMm: 0,
    pistas: posesUteis,
    larguraWebMm: 0,
    larguraUtilMm: poses.utilLarguraMm,
    cabeNaMaquina: poses.cabe && ctx.avisos.length === 0,
    alimentacao: "folha",
    poses: posesUteis,
    folhaLarguraMm: poses.folhaLarguraMm,
    folhaAlturaMm: poses.folhaAlturaMm,
    custoFolhaPapel,
    custoFolhaMaquina,
    folhasAcerto,
  });
}

/** Passagens em máquinas de folha diferentes: cada uma impõe e o pedido soma os custos. */
function somarFolhasSeparadas(catalogo: Catalogo, input: QuoteInput, ctx: Comum & { formatoSetup: number }): CostBreakdown {
  const individuais = ctx.processos.map((_, index) =>
    computeBreakdown(catalogo, {
      ...input,
      grupos: [input.grupos[index]],
      passagem: "linha",
      ferramentalModo: "diluido",
    }),
  );
  const primeiro = individuais[0];
  const ferramental = individuais.reduce((sum, item) => sum + item.ferramental, 0);
  const setupSemFerramental = individuais.reduce((sum, item) => sum + (item.setupTotal - item.ferramental), 0);
  return {
    ...primeiro,
    impressaoUn: individuais.reduce((sum, item) => sum + item.impressaoUn, 0),
    materialUn: individuais.reduce((sum, item) => sum + item.materialUn, 0),
    maquinaUn: individuais.reduce((sum, item) => sum + item.maquinaUn, 0),
    setupTotal: setupSemFerramental + (input.ferramentalModo === "diluido" ? ferramental : 0) - ctx.formatoSetup * (individuais.length - 1),
    ferramental,
    ferramentalNoLote: input.ferramentalModo === "diluido",
    poses: 0,
    cabeNaMaquina: individuais.every((item) => item.cabeNaMaquina),
    numCores: ctx.numCores,
    avisos: ctx.avisos,
    alimentacao: "folha",
  };
}

function fechar(
  input: QuoteInput,
  ctx: Comum,
  parcial: Omit<CostBreakdown, "gramatura" | "vernizUn" | "conversaoUn" | "acessoriosUn" | "desperdicio" | "ferramentalNoLote" | "numCores" | "avisos">,
): CostBreakdown {
  return {
    ...parcial,
    gramatura: ctx.gramatura,
    vernizUn: ctx.vernizBase,
    conversaoUn: ctx.conversaoUn,
    acessoriosUn: ctx.acessoriosUn,
    desperdicio: ctx.desperdicio,
    ferramentalNoLote: input.ferramentalModo === "diluido",
    numCores: ctx.numCores,
    avisos: ctx.avisos,
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
  return b.materialUn + b.impressaoUn + b.vernizUn + b.conversaoUn + b.acessoriosUn + b.maquinaUn;
}

/** Custo industrial do pedido. Em folha, o número de folhas arredonda para cima. */
export function custoDoPedido(breakdown: CostBreakdown, unidades: number): number {
  const outros =
    (breakdown.impressaoUn + breakdown.vernizUn + breakdown.conversaoUn + breakdown.acessoriosUn) * unidades;
  if (breakdown.poses > 0) {
    const folhas = Math.ceil(unidades / breakdown.poses);
    return (
      breakdown.setupTotal +
      folhas * breakdown.custoFolhaPapel * breakdown.desperdicio +
      folhas * breakdown.custoFolhaMaquina +
      outros
    );
  }
  return breakdown.setupTotal + custoVariavelUn(breakdown) * unidades;
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

  const custoTotal = custoDoPedido(breakdown, unidades);
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
  const nomes = input.grupos.map((grupo) => catalogo.processoById[grupo.processoId]?.nome ?? grupo.processoId);
  const fator = fatorMkupComissao(input.mkup, input.comissao) * fatorPagamento(proposta) * fatorImpostos(proposta);
  return {
    breakdown,
    estrutura,
    processoNome: nomes.join(" + "),
    ferramentalAParte: input.ferramentalModo === "aparte" ? breakdown.ferramental * fator : 0,
    lotes,
  };
}

/** Volume-base da cotação (para o painel de resumo), no modo ativo. */
export function volumeBaseLote(input: QuoteInput): Lote {
  return input.volumeMode === "kg" ? { kg: input.volumeKg } : { unidades: input.volumeUnidades };
}

/**
 * Processo sugerido para o formato. Em cartonado, é a máquina a folha de menor custo
 * em que o cartucho cabe, no volume base do pedido.
 */
export function processoSugerido(catalogo: Catalogo, input: QuoteInput): string {
  const aplicacao = aplicacaoDoFormato(input.formato);
  const compativeis = catalogo.processos.filter((processo) => processo.aplicacoes.includes(aplicacao));
  if (compativeis.length === 0) throw new Error(`Nenhum processo atende ${input.formato}.`);
  const sugeridos = compativeis.filter((processo) => processo.sugeridoPara.includes(aplicacao));
  const pool = sugeridos.length > 0 ? sugeridos : compativeis;
  const folhas = pool.filter((processo) => processo.alimentacao === "folha");
  if (folhas.length === 0) return pool[0].id;

  const unidades = input.volumeUnidades > 0 ? input.volumeUnidades : 1000;
  const grupoBase: GrupoImpressao = input.grupos[0] ?? {
    processoId: folhas[0].id,
    numCores: 4,
    numBranco: 0,
    numEspeciais: 0,
  };
  let melhorId = "";
  let melhorCusto = Number.POSITIVE_INFINITY;
  for (const processo of folhas) {
    const encaixe: ImposicaoFolha = calcularPoses(input.larguraMm, input.alturaMm, processo);
    if (!encaixe.cabe) continue;
    const tentativa: QuoteInput = {
      ...input,
      grupos: [{ ...grupoBase, processoId: processo.id }],
      passagem: "linha",
    };
    const breakdown = computeBreakdown(catalogo, tentativa);
    const custo = custoDoPedido(breakdown, unidades);
    if (custo < melhorCusto) {
      melhorCusto = custo;
      melhorId = processo.id;
    }
  }
  if (melhorId) return melhorId;
  const maior = folhas.slice().sort(
    (a, b) => b.folhaLarguraMaxMm * b.folhaAlturaMaxMm - a.folhaLarguraMaxMm * a.folhaAlturaMaxMm,
  )[0];
  return maior.id;
}
