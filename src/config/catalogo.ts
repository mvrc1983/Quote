import exemploJson from "./empresa.exemplo.json" with { type: "json" };
import type {
  Alimentacao,
  Aplicacao,
  Estrutura,
  FamiliaProcesso,
  FormaPagamento,
  Formato,
  ModoFerramental,
  Passagem,
  PropostaInput,
  QuoteInput,
  SimNao,
  TecnologiaDigital,
  Verniz,
  VolumeMode,
  Zipper,
} from "../types";
import {
  APLICACOES,
  ALIMENTACOES,
  FAMILIAS_PROCESSO,
  FORMAS_PAGAMENTO,
  FORMATOS,
  MODOS_FERRAMENTAL,
  PASSAGENS,
  SIM_NAO,
  TECNOLOGIAS_DIGITAL,
  VERNIZES,
  VOLUME_MODES,
  ZIPPERS,
  aplicacaoDoFormato,
} from "../types";

export type PrecoFormato = {
  id: Formato;
  conversaoUn: number;
  setup: number;
  custoCosturaUn: number;
  custoCorteUn: number;
  seamMm: number;
};

export type Processo = {
  id: string;
  nome: string;
  familia: FamiliaProcesso;
  tecnologia: TecnologiaDigital;
  aplicacoes: Aplicacao[];
  /** Aplicações em que este processo é o padrão sugerido. Vazio = permitido, mas não sugerido. */
  sugeridoPara: Aplicacao[];
  alimentacao: Alimentacao;
  larguraUtilMm: number;
  velocidadeMMin: number;
  custoHora: number;
  setupHorasBase: number;
  setupHorasPorCor: number;
  metrosAcertoBase: number;
  metrosAcertoPorCor: number;
  /** Folha máxima do alimentador. Zero em máquina de bobina. */
  folhaLarguraMaxMm: number;
  folhaAlturaMaxMm: number;
  folhaLarguraMinMm: number;
  folhaAlturaMinMm: number;
  pincaMm: number;
  margemLateralMm: number;
  margemFundoMm: number;
  entrePosesMm: number;
  folhasPorHora: number;
  folhasAcertoBase: number;
  folhasAcertoPorCor: number;
  consumoTintaGm2Cheio: number;
  precoTintaKg: number;
  precoTintaBrancoKg: number;
  precoTintaEspecialKg: number;
  coberturaProcesso: number;
  coberturaBranco: number;
  coberturaEspecial: number;
  /** Clique digital em R$/m² por separação. Zero quando o custo está na tinta. */
  custoM2PorSeparacao: number;
  temFerramental: boolean;
  custoFerramentalPorCor: number;
  custoFerramentalPorM2: number;
  /** Offset intermitente: a chapa acompanha o passo, sem cilindro gravado. */
  custoFerramentalPorMmPasso: number;
  ferramentalModoPadrao: ModoFerramental;
  gapRepeticaoMm: number;
  gapPistaMm: number;
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
  processoId: string;
  numCores: number;
  numBranco: number;
  numEspeciais: number;
  passagem: Passagem;
  passoMm: number;
  pistas: number;
  ferramentalModo: ModoFerramental;
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
  estruturas: Estrutura[];
  processos: Processo[];
  vernizes: { id: Verniz; precoM2: number }[];
  formatos: PrecoFormato[];
  acessorios: { zipper: Record<Zipper, number>; valvulaUn: number; bicoUn: number };
  lotesPadrao: { unidades: number[]; kg: number[] };
  comercial: ComercialPadrao;
  produtoPadrao: ProdutoPadrao;
  estruturaById: Record<string, Estrutura>;
  processoById: Record<string, Processo>;
  precoVernizM2: Record<Verniz, number>;
  conversaoUn: Record<Formato, number>;
  setupConversao: Record<Formato, number>;
  formatoById: Record<Formato, PrecoFormato>;
};

function fail(path: string, msg: string): never {
  throw new Error(`Catálogo inválido em ${path}: ${msg}`);
}

function isObj(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return true;
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

function bool(source: Record<string, unknown>, key: string, path: string): boolean {
  const value = source[key];
  if (typeof value !== "boolean") fail(`${path}.${key}`, "booleano esperado");
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

function positive(value: number, path: string): number {
  if (value <= 0) fail(path, "deve ser maior que zero");
  return value;
}

function intNonNeg(source: Record<string, unknown>, key: string, path: string): number {
  const value = num(source, key, path);
  if (!Number.isInteger(value) || value < 0) fail(`${path}.${key}`, "inteiro maior ou igual a zero");
  return value;
}

function unitInterval(value: number, path: string): number {
  if (value < 0 || value > 1) fail(path, "deve ficar entre 0 e 1");
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

function aplicacoesDe(value: unknown, path: string): Aplicacao[] {
  if (!Array.isArray(value) || value.length === 0) fail(path, "informe ao menos uma aplicação");
  const out: Aplicacao[] = [];
  for (const [index, item] of value.entries()) {
    const aplicacao = oneOf(item, APLICACOES, `${path}[${index}]`);
    if (out.includes(aplicacao)) fail(`${path}[${index}]`, "aplicação repetida");
    out.push(aplicacao);
  }
  return out;
}

function parseProcesso(item: unknown, index: number): Processo {
  const path = `processos[${index}]`;
  const row = obj(item, path);
  const familia = oneOf(row.familia, FAMILIAS_PROCESSO, `${path}.familia`);
  const tecnologia = oneOf(row.tecnologia, TECNOLOGIAS_DIGITAL, `${path}.tecnologia`);
  const aplicacoes = aplicacoesDe(row.aplicacoes, `${path}.aplicacoes`);
  let sugeridos: Aplicacao[] = [];
  if (row.sugeridoPara == null) {
    sugeridos = [];
  } else if (!Array.isArray(row.sugeridoPara)) {
    fail(`${path}.sugeridoPara`, "lista esperada");
  } else {
    for (const [i, itemSugerido] of row.sugeridoPara.entries()) {
      const aplicacao = oneOf(itemSugerido, APLICACOES, `${path}.sugeridoPara[${i}]`);
      if (!aplicacoes.includes(aplicacao)) {
        fail(`${path}.sugeridoPara[${i}]`, "só pode sugerir uma aplicação que o processo atende");
      }
      if (sugeridos.includes(aplicacao)) fail(`${path}.sugeridoPara[${i}]`, "aplicação repetida");
      sugeridos.push(aplicacao);
    }
  }

  if (familia === "digital") {
    if (tecnologia === "nenhuma") fail(`${path}.tecnologia`, "processo digital precisa de tecnologia");
  } else if (tecnologia !== "nenhuma") {
    fail(`${path}.tecnologia`, "só processo digital usa tecnologia de impressão");
  }
  if (tecnologia === "inkjet") {
    const soRotulo = aplicacoes.length === 1 && aplicacoes[0] === "rotulo";
    if (!soRotulo) fail(`${path}.aplicacoes`, "inkjet só pode ser cadastrado para rótulo autoadesivo");
  }

  const alimentacao = oneOf(row.alimentacao, ALIMENTACOES, `${path}.alimentacao`);
  const processo: Processo = {
    id: text(row, "id", path),
    nome: text(row, "nome", path),
    familia,
    tecnologia,
    aplicacoes,
    sugeridoPara: sugeridos,
    alimentacao,
    larguraUtilMm: nonNegative(num(row, "larguraUtilMm", path), `${path}.larguraUtilMm`),
    velocidadeMMin: nonNegative(num(row, "velocidadeMMin", path), `${path}.velocidadeMMin`),
    custoHora: nonNegative(num(row, "custoHora", path), `${path}.custoHora`),
    setupHorasBase: nonNegative(num(row, "setupHorasBase", path), `${path}.setupHorasBase`),
    setupHorasPorCor: nonNegative(num(row, "setupHorasPorCor", path), `${path}.setupHorasPorCor`),
    metrosAcertoBase: nonNegative(num(row, "metrosAcertoBase", path), `${path}.metrosAcertoBase`),
    metrosAcertoPorCor: nonNegative(num(row, "metrosAcertoPorCor", path), `${path}.metrosAcertoPorCor`),
    folhaLarguraMaxMm: nonNegative(num(row, "folhaLarguraMaxMm", path), `${path}.folhaLarguraMaxMm`),
    folhaAlturaMaxMm: nonNegative(num(row, "folhaAlturaMaxMm", path), `${path}.folhaAlturaMaxMm`),
    folhaLarguraMinMm: nonNegative(num(row, "folhaLarguraMinMm", path), `${path}.folhaLarguraMinMm`),
    folhaAlturaMinMm: nonNegative(num(row, "folhaAlturaMinMm", path), `${path}.folhaAlturaMinMm`),
    pincaMm: nonNegative(num(row, "pincaMm", path), `${path}.pincaMm`),
    margemLateralMm: nonNegative(num(row, "margemLateralMm", path), `${path}.margemLateralMm`),
    margemFundoMm: nonNegative(num(row, "margemFundoMm", path), `${path}.margemFundoMm`),
    entrePosesMm: nonNegative(num(row, "entrePosesMm", path), `${path}.entrePosesMm`),
    folhasPorHora: nonNegative(num(row, "folhasPorHora", path), `${path}.folhasPorHora`),
    folhasAcertoBase: nonNegative(num(row, "folhasAcertoBase", path), `${path}.folhasAcertoBase`),
    folhasAcertoPorCor: nonNegative(num(row, "folhasAcertoPorCor", path), `${path}.folhasAcertoPorCor`),
    consumoTintaGm2Cheio: nonNegative(num(row, "consumoTintaGm2Cheio", path), `${path}.consumoTintaGm2Cheio`),
    precoTintaKg: nonNegative(num(row, "precoTintaKg", path), `${path}.precoTintaKg`),
    precoTintaBrancoKg: nonNegative(num(row, "precoTintaBrancoKg", path), `${path}.precoTintaBrancoKg`),
    precoTintaEspecialKg: nonNegative(num(row, "precoTintaEspecialKg", path), `${path}.precoTintaEspecialKg`),
    coberturaProcesso: unitInterval(num(row, "coberturaProcesso", path), `${path}.coberturaProcesso`),
    coberturaBranco: unitInterval(num(row, "coberturaBranco", path), `${path}.coberturaBranco`),
    coberturaEspecial: unitInterval(num(row, "coberturaEspecial", path), `${path}.coberturaEspecial`),
    custoM2PorSeparacao: nonNegative(num(row, "custoM2PorSeparacao", path), `${path}.custoM2PorSeparacao`),
    temFerramental: bool(row, "temFerramental", path),
    custoFerramentalPorCor: nonNegative(num(row, "custoFerramentalPorCor", path), `${path}.custoFerramentalPorCor`),
    custoFerramentalPorM2: nonNegative(num(row, "custoFerramentalPorM2", path), `${path}.custoFerramentalPorM2`),
    custoFerramentalPorMmPasso: nonNegative(num(row, "custoFerramentalPorMmPasso", path), `${path}.custoFerramentalPorMmPasso`),
    ferramentalModoPadrao: oneOf(row.ferramentalModoPadrao, MODOS_FERRAMENTAL, `${path}.ferramentalModoPadrao`),
    gapRepeticaoMm: nonNegative(num(row, "gapRepeticaoMm", path), `${path}.gapRepeticaoMm`),
    gapPistaMm: nonNegative(num(row, "gapPistaMm", path), `${path}.gapPistaMm`),
  };

  if (alimentacao === "bobina") {
    positive(processo.velocidadeMMin, `${path}.velocidadeMMin`);
    positive(processo.larguraUtilMm, `${path}.larguraUtilMm`);
  } else {
    positive(processo.folhasPorHora, `${path}.folhasPorHora`);
    positive(processo.folhaLarguraMaxMm, `${path}.folhaLarguraMaxMm`);
    positive(processo.folhaAlturaMaxMm, `${path}.folhaAlturaMaxMm`);
    positive(processo.folhaLarguraMinMm, `${path}.folhaLarguraMinMm`);
    positive(processo.folhaAlturaMinMm, `${path}.folhaAlturaMinMm`);
    if (processo.folhaLarguraMinMm > processo.folhaLarguraMaxMm) {
      fail(`${path}.folhaLarguraMinMm`, "não pode passar da largura máxima");
    }
    if (processo.folhaAlturaMinMm > processo.folhaAlturaMaxMm) {
      fail(`${path}.folhaAlturaMinMm`, "não pode passar da altura máxima");
    }
    const utilW = processo.folhaLarguraMaxMm - 2 * processo.margemLateralMm;
    const utilH = processo.folhaAlturaMaxMm - processo.pincaMm - processo.margemFundoMm;
    if (utilW <= 0 || utilH <= 0) fail(path, "pinça e margens consomem a folha máxima");
  }
  return processo;
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

  if (!Array.isArray(root.processos) || root.processos.length === 0) fail("processos", "informe ao menos um processo");
  const processos = root.processos.map((item, index) => parseProcesso(item, index));
  const processoById = indexById(processos, "processos");

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
      custoCosturaUn: nonNegative(num(row, "custoCosturaUn", `formatos[${index}]`), `formatos[${index}].custoCosturaUn`),
      custoCorteUn: nonNegative(num(row, "custoCorteUn", `formatos[${index}]`), `formatos[${index}].custoCorteUn`),
      seamMm: nonNegative(num(row, "seamMm", `formatos[${index}]`), `formatos[${index}].seamMm`),
    };
  });
  const conversaoUn = {} as Record<Formato, number>;
  const setupConversao = {} as Record<Formato, number>;
  const formatoById = {} as Record<Formato, PrecoFormato>;
  for (const formato of FORMATOS) {
    const found = formatos.filter((item) => item.id === formato);
    if (found.length !== 1) fail("formatos", `informe o formato "${formato}" uma vez`);
    conversaoUn[formato] = found[0].conversaoUn + found[0].custoCosturaUn + found[0].custoCorteUn;
    setupConversao[formato] = found[0].setup;
    formatoById[formato] = found[0];
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
    processoId: text(produtoRaw, "processoId", "produtoPadrao"),
    numCores: intNonNeg(produtoRaw, "numCores", "produtoPadrao"),
    numBranco: intNonNeg(produtoRaw, "numBranco", "produtoPadrao"),
    numEspeciais: intNonNeg(produtoRaw, "numEspeciais", "produtoPadrao"),
    passagem: oneOf(produtoRaw.passagem, PASSAGENS, "produtoPadrao.passagem"),
    passoMm: nonNegative(num(produtoRaw, "passoMm", "produtoPadrao"), "produtoPadrao.passoMm"),
    pistas: intNonNeg(produtoRaw, "pistas", "produtoPadrao"),
    ferramentalModo: oneOf(produtoRaw.ferramentalModo, MODOS_FERRAMENTAL, "produtoPadrao.ferramentalModo"),
    larguraMm: num(produtoRaw, "larguraMm", "produtoPadrao"),
    alturaMm: num(produtoRaw, "alturaMm", "produtoPadrao"),
    profundidadeMm: num(produtoRaw, "profundidadeMm", "produtoPadrao"),
    volumeMode: oneOf(produtoRaw.volumeMode, VOLUME_MODES, "produtoPadrao.volumeMode"),
    volumeUnidades: num(produtoRaw, "volumeUnidades", "produtoPadrao"),
    volumeKg: num(produtoRaw, "volumeKg", "produtoPadrao"),
  };
  if (!estruturaById[produtoPadrao.estruturaId]) fail("produtoPadrao.estruturaId", "estrutura inexistente");
  const processoPadrao = processoById[produtoPadrao.processoId];
  if (!processoPadrao) fail("produtoPadrao.processoId", "processo inexistente");
  if (!processoPadrao.aplicacoes.includes(aplicacaoDoFormato(produtoPadrao.formato))) {
    fail("produtoPadrao.processoId", "processo incompatível com o formato padrão");
  }
  if (produtoPadrao.pistas < 1) fail("produtoPadrao.pistas", "informe ao menos uma pista");
  if (produtoPadrao.numBranco + produtoPadrao.numEspeciais > produtoPadrao.numCores) {
    fail("produtoPadrao", "branco + especiais não pode passar do total de cores");
  }
  if (produtoPadrao.larguraMm <= 0 || produtoPadrao.alturaMm <= 0) {
    fail("produtoPadrao", "largura e altura devem ser maiores que zero");
  }
  if (produtoPadrao.profundidadeMm < 0) fail("produtoPadrao.profundidadeMm", "não pode ser negativa");

  return {
    exemplo,
    aviso,
    empresa,
    fatorDesperdicio,
    estruturas,
    processos,
    vernizes,
    formatos,
    acessorios,
    lotesPadrao,
    comercial,
    produtoPadrao,
    estruturaById,
    processoById,
    precoVernizM2,
    conversaoUn,
    setupConversao,
    formatoById,
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
    grupos: [
      {
        processoId: produto.processoId,
        numCores: produto.numCores,
        numBranco: produto.numBranco,
        numEspeciais: produto.numEspeciais,
      },
    ],
    passagem: produto.passagem,
    passoMm: produto.passoMm,
    pistas: produto.pistas,
    ferramentalModo: produto.ferramentalModo,
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
