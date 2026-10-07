import exemploJson from "./empresa.exemplo.json" with { type: "json" };
import type { Estrutura, FormaPagamento, Formato, PropostaInput, QuoteInput, SimNao, Tinta, Verniz, VolumeMode, Zipper } from "../types";
import { FORMAS_PAGAMENTO, FORMATOS, SIM_NAO, VERNIZES, VOLUME_MODES, ZIPPERS } from "../types";

export type PrecoFormato = {
  id: Formato;
  conversaoUn: number;
  setup: number;
};

export type ComercialPadrao = {
  mkup: number;
  comissao: number;
  formaPagamento: FormaPagamento;
  prazoMeses: number;
  taxaPagamentoMes: number;
  taxaCartao: number;
  pisCofins: number;
  icms: number;
  ipi: number;
  frete: string;
  leadTime: string;
  validade: string;
  localEntrega: string;
  estado: string;
  observacoes: string;
};

export type ProdutoPadrao = {
  formato: Formato;
  zipper: Zipper;
  valvula: SimNao;
  bico: SimNao;
  estruturaId: string;
  verniz: Verniz;
  tipoImpressao: string;
  larguraMm: number;
  alturaMm: number;
  profundidadeMm: number;
  volumeMode: VolumeMode;
  volumeUnidades: number;
  volumeKg: number;
};

/** Objeto de configuração de uma empresa. A mesma forma deve ir para o banco depois. */
export type Catalogo = {
  exemplo: boolean;
  aviso: string;
  empresa: { nome: string; cidade: string; uf: string; linha: string };
  fatorDesperdicio: number;
  setupImpressao: number;
  estruturas: Estrutura[];
  tintas: Tinta[];
  vernizes: { id: Verniz; precoM2: number }[];
  formatos: PrecoFormato[];
  acessorios: { zipper: Record<Zipper, number>; valvulaUn: number; bicoUn: number };
  lotesPadrao: { unidades: number[]; kg: number[] };
  comercial: ComercialPadrao;
  produtoPadrao: ProdutoPadrao;
  estruturaById: Record<string, Estrutura>;
  tintaById: Record<string, Tinta>;
  precoVernizM2: Record<Verniz, number>;
  conversaoUn: Record<Formato, number>;
  setupConversao: Record<Formato, number>;
};

function fail(path: string, msg: string): never {
  throw new Error(`Catálogo inválido em ${path}: ${msg}`);
}

function isObj(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function obj(value: unknown, path: string): Record<string, unknown> {
  if (!isObj(value)) fail(path, "objeto esperado");
  return value;
}

function num(source: Record<string, unknown>, key: string, path: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${path}.${key}`, "número esperado");
  return value;
}

function text(source: Record<string, unknown>, key: string, path: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.trim() === "") fail(`${path}.${key}`, "texto esperado");
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
  fail(path, `use um destes valores: ${allowed.join(", ")}`);
}

function nonNegative(value: number, path: string): number {
  if (value < 0) fail(path, "não pode ser negativo");
  return value;
}

function positiveList(value: unknown, path: string): number[] {
  if (!Array.isArray(value) || value.length === 0) fail(path, "lista com ao menos um número");
  return value.map((item, index) => {
    if (typeof item !== "number" || !Number.isFinite(item) || item <= 0) {
      fail(`${path}[${index}]`, "número maior que zero");
    }
    return item;
  });
}

function indexById<T extends { id: string }>(items: T[], path: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of items) {
    if (out[item.id]) fail(path, `id duplicado "${item.id}"`);
    out[item.id] = item;
  }
  return out;
}

export function parseCatalogo(raw: unknown): Catalogo {
  const root = obj(raw, "catalogo");
  const exemplo = root.exemplo;
  if (typeof exemplo !== "boolean") fail("exemplo", "booleano esperado");
  const aviso = text(root, "aviso", "catalogo");
  if (exemplo && !/fict/i.test(aviso)) {
    fail("aviso", "catálogo de exemplo precisa deixar claro que os dados são fictícios");
  }

  const empresaRaw = obj(root.empresa, "empresa");
  const empresa = {
    nome: text(empresaRaw, "nome", "empresa"),
    cidade: text(empresaRaw, "cidade", "empresa"),
    uf: text(empresaRaw, "uf", "empresa"),
    linha: text(empresaRaw, "linha", "empresa"),
  };

  const fatorDesperdicio = num(root, "fatorDesperdicio", "catalogo");
  if (fatorDesperdicio <= 0) fail("fatorDesperdicio", "deve ser maior que zero");
  const setupImpressao = nonNegative(num(root, "setupImpressao", "catalogo"), "setupImpressao");

  if (!Array.isArray(root.estruturas) || root.estruturas.length === 0) fail("estruturas", "informe ao menos uma estrutura");
  const estruturas: Estrutura[] = root.estruturas.map((item, index) => {
    const row = obj(item, `estruturas[${index}]`);
    const id = text(row, "id", `estruturas[${index}]`);
    const gramatura = num(row, "gramatura", `estruturas[${index}]`);
    if (gramatura <= 0) fail(`estruturas[${index}].gramatura`, "deve ser maior que zero");
    return {
      id,
      nome: text(row, "nome", `estruturas[${index}]`),
      gramatura,
      precoKg: nonNegative(num(row, "precoKg", `estruturas[${index}]`), `estruturas[${index}].precoKg`),
    };
  });
  const estruturaById = indexById(estruturas, "estruturas");

  if (!Array.isArray(root.tintas) || root.tintas.length === 0) fail("tintas", "informe ao menos uma tinta");
  const tintas: Tinta[] = root.tintas.map((item, index) => {
    const row = obj(item, `tintas[${index}]`);
    return {
      id: text(row, "id", `tintas[${index}]`),
      nome: text(row, "nome", `tintas[${index}]`),
      precoM2: nonNegative(num(row, "precoM2", `tintas[${index}]`), `tintas[${index}].precoM2`),
    };
  });
  const tintaById = indexById(tintas, "tintas");

  if (!Array.isArray(root.vernizes)) fail("vernizes", "lista esperada");
  const vernizes = root.vernizes.map((item, index) => {
    const row = obj(item, `vernizes[${index}]`);
    const id = oneOf(row.id, VERNIZES, `vernizes[${index}].id`);
    return { id, precoM2: nonNegative(num(row, "precoM2", `vernizes[${index}]`), `vernizes[${index}].precoM2`) };
  });
  const precoVernizM2 = {} as Record<Verniz, number>;
  for (const verniz of VERNIZES) {
    const found = vernizes.filter((item) => item.id === verniz);
    if (found.length !== 1) fail("vernizes", `informe o verniz "${verniz}" uma vez`);
    precoVernizM2[verniz] = found[0].precoM2;
  }
  if (precoVernizM2.Sem !== 0) fail("vernizes.Sem", "verniz ausente deve custar zero");

  if (!Array.isArray(root.formatos)) fail("formatos", "lista esperada");
  const formatos: PrecoFormato[] = root.formatos.map((item, index) => {
    const row = obj(item, `formatos[${index}]`);
    return {
      id: oneOf(row.id, FORMATOS, `formatos[${index}].id`),
      conversaoUn: nonNegative(num(row, "conversaoUn", `formatos[${index}]`), `formatos[${index}].conversaoUn`),
      setup: nonNegative(num(row, "setup", `formatos[${index}]`), `formatos[${index}].setup`),
    };
  });
  const conversaoUn = {} as Record<Formato, number>;
  const setupConversao = {} as Record<Formato, number>;
  for (const formato of FORMATOS) {
    const found = formatos.filter((item) => item.id === formato);
    if (found.length !== 1) fail("formatos", `informe o formato "${formato}" uma vez`);
    conversaoUn[formato] = found[0].conversaoUn;
    setupConversao[formato] = found[0].setup;
  }

  const acessoriosRaw = obj(root.acessorios, "acessorios");
  const zipperRaw = obj(acessoriosRaw.zipper, "acessorios.zipper");
  const zipper = {} as Record<Zipper, number>;
  for (const tipo of ZIPPERS) {
    zipper[tipo] = nonNegative(num(zipperRaw, tipo, "acessorios.zipper"), `acessorios.zipper.${tipo}`);
  }
  if (zipper.Sem !== 0) fail("acessorios.zipper.Sem", "zipper ausente deve custar zero");
  const acessorios = {
    zipper,
    valvulaUn: nonNegative(num(acessoriosRaw, "valvulaUn", "acessorios"), "acessorios.valvulaUn"),
    bicoUn: nonNegative(num(acessoriosRaw, "bicoUn", "acessorios"), "acessorios.bicoUn"),
  };

  const lotesRaw = obj(root.lotesPadrao, "lotesPadrao");
  const lotesPadrao = {
    unidades: positiveList(lotesRaw.unidades, "lotesPadrao.unidades"),
    kg: positiveList(lotesRaw.kg, "lotesPadrao.kg"),
  };

  const comercialRaw = obj(root.comercial, "comercial");
  const mkup = nonNegative(num(comercialRaw, "mkup", "comercial"), "comercial.mkup");
  const comissao = nonNegative(num(comercialRaw, "comissao", "comercial"), "comercial.comissao");
  if (comissao >= 1) fail("comercial.comissao", "deve ser menor que 1");
  const pisCofins = nonNegative(num(comercialRaw, "pisCofins", "comercial"), "comercial.pisCofins");
  const icms = nonNegative(num(comercialRaw, "icms", "comercial"), "comercial.icms");
  if (pisCofins + icms >= 1) fail("comercial", "PIS/COFINS + ICMS deve ser menor que 1");
  const comercial: ComercialPadrao = {
    mkup,
    comissao,
    formaPagamento: oneOf(comercialRaw.formaPagamento, FORMAS_PAGAMENTO, "comercial.formaPagamento"),
    prazoMeses: nonNegative(num(comercialRaw, "prazoMeses", "comercial"), "comercial.prazoMeses"),
    taxaPagamentoMes: nonNegative(num(comercialRaw, "taxaPagamentoMes", "comercial"), "comercial.taxaPagamentoMes"),
    taxaCartao: nonNegative(num(comercialRaw, "taxaCartao", "comercial"), "comercial.taxaCartao"),
    pisCofins,
    icms,
    ipi: nonNegative(num(comercialRaw, "ipi", "comercial"), "comercial.ipi"),
    frete: text(comercialRaw, "frete", "comercial"),
    leadTime: text(comercialRaw, "leadTime", "comercial"),
    validade: text(comercialRaw, "validade", "comercial"),
    localEntrega: text(comercialRaw, "localEntrega", "comercial"),
    estado: text(comercialRaw, "estado", "comercial"),
    observacoes: text(comercialRaw, "observacoes", "comercial"),
  };

  const produtoRaw = obj(root.produtoPadrao, "produtoPadrao");
  const produtoPadrao: ProdutoPadrao = {
    formato: oneOf(produtoRaw.formato, FORMATOS, "produtoPadrao.formato"),
    zipper: oneOf(produtoRaw.zipper, ZIPPERS, "produtoPadrao.zipper"),
    valvula: oneOf(produtoRaw.valvula, SIM_NAO, "produtoPadrao.valvula"),
    bico: oneOf(produtoRaw.bico, SIM_NAO, "produtoPadrao.bico"),
    estruturaId: text(produtoRaw, "estruturaId", "produtoPadrao"),
    verniz: oneOf(produtoRaw.verniz, VERNIZES, "produtoPadrao.verniz"),
    tipoImpressao: text(produtoRaw, "tipoImpressao", "produtoPadrao"),
    larguraMm: num(produtoRaw, "larguraMm", "produtoPadrao"),
    alturaMm: num(produtoRaw, "alturaMm", "produtoPadrao"),
    profundidadeMm: num(produtoRaw, "profundidadeMm", "produtoPadrao"),
    volumeMode: oneOf(produtoRaw.volumeMode, VOLUME_MODES, "produtoPadrao.volumeMode"),
    volumeUnidades: num(produtoRaw, "volumeUnidades", "produtoPadrao"),
    volumeKg: num(produtoRaw, "volumeKg", "produtoPadrao"),
  };
  if (!estruturaById[produtoPadrao.estruturaId]) fail("produtoPadrao.estruturaId", "estrutura inexistente");
  if (!tintaById[produtoPadrao.tipoImpressao]) fail("produtoPadrao.tipoImpressao", "tinta inexistente");
  if (produtoPadrao.larguraMm <= 0 || produtoPadrao.alturaMm <= 0) fail("produtoPadrao", "largura e altura devem ser maiores que zero");
  if (produtoPadrao.profundidadeMm < 0) fail("produtoPadrao.profundidadeMm", "não pode ser negativa");

  return {
    exemplo,
    aviso,
    empresa,
    fatorDesperdicio,
    setupImpressao,
    estruturas,
    tintas,
    vernizes,
    formatos,
    acessorios,
    lotesPadrao,
    comercial,
    produtoPadrao,
    estruturaById,
    tintaById,
    precoVernizM2,
    conversaoUn,
    setupConversao,
  };
}

/**
 * Catálogo carregado do arquivo da empresa.
 * Hoje é o JSON de exemplo. O próximo passo troca esta carga pelo registro da empresa no banco,
 * sem mudar a forma do objeto.
 */
export const catalogoExemplo = parseCatalogo(exemploJson);

export function quoteInputPadrao(catalogo: Catalogo): QuoteInput {
  const produto = catalogo.produtoPadrao;
  return {
    formato: produto.formato,
    zipper: produto.zipper,
    valvula: produto.valvula,
    bico: produto.bico,
    estruturaId: produto.estruturaId,
    verniz: produto.verniz,
    tipoImpressao: produto.tipoImpressao,
    larguraMm: produto.larguraMm,
    alturaMm: produto.alturaMm,
    profundidadeMm: produto.profundidadeMm,
    volumeMode: produto.volumeMode,
    volumeUnidades: produto.volumeUnidades,
    volumeKg: produto.volumeKg,
    mkup: catalogo.comercial.mkup,
    comissao: catalogo.comercial.comissao,
  };
}

export function propostaPadrao(catalogo: Catalogo): PropostaInput {
  const comercial = catalogo.comercial;
  const lotes =
    catalogo.produtoPadrao.volumeMode === "kg"
      ? catalogo.lotesPadrao.kg.map((kg) => ({ kg }))
      : catalogo.lotesPadrao.unidades.map((unidades) => ({ unidades }));
  return {
    cliente: "",
    contato: "",
    data: "",
    espec: "",
    localEntrega: comercial.localEntrega,
    estado: comercial.estado,
    frete: comercial.frete,
    leadTime: comercial.leadTime,
    validade: comercial.validade,
    observacoes: comercial.observacoes,
    lotes,
    formaPagamento: comercial.formaPagamento,
    prazo: comercial.prazoMeses,
    taxaPagamentoMes: comercial.taxaPagamentoMes,
    taxaCartao: comercial.taxaCartao,
    pisCofins: comercial.pisCofins,
    icms: comercial.icms,
    ipi: comercial.ipi,
  };
}
