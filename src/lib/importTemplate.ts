import type { Catalogo } from "../config/catalogo";
import { propostaPadrao, quoteInputPadrao } from "../config/catalogo";
import type { FormaPagamento, Formato, Lote, PropostaInput, QuoteInput, SimNao, Verniz, VolumeMode, Zipper } from "../types";
import { FORMAS_PAGAMENTO, FORMATOS, SIM_NAO, VERNIZES, VOLUME_MODES, ZIPPERS } from "../types";
import { defaultLotesForVolumeMode, lotesMatchVolumeMode, normalizeProposta } from "./proposta";

export type ImportSuccess = {
  ok: true;
  input: QuoteInput;
  proposta: PropostaInput;
};

export type ImportFailure = {
  ok: false;
  errors: string[];
};

export type ImportResult = ImportSuccess | ImportFailure;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Remove chaves que começam com `_` (instruções / opções do template). */
export function stripMetaKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripMetaKeys);
  if (!isObject(value)) return value;
  const out: JsonObject = {};
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith("_")) continue;
    out[key] = stripMetaKeys(child);
  }
  return out;
}

function isBlank(value: unknown): boolean {
  return value == null || (typeof value === "string" && value.trim() === "");
}

function asString(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function parseNumber(value: unknown, field: string, errors: string[]): number | undefined {
  if (isBlank(value)) return undefined;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      errors.push(`${field}: número inválido`);
      return undefined;
    }
    return value;
  }
  const raw = String(value).trim();
  const normalized = raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw.replace(/\s/g, "");
  const n = Number(normalized);
  if (!Number.isFinite(n)) {
    errors.push(`${field}: valor "${raw}" não é um número`);
    return undefined;
  }
  return n;
}

function normalizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  errors: string[],
): T | undefined {
  if (isBlank(value)) return undefined;
  const raw = String(value).trim();
  const exact = allowed.find((item) => item === raw);
  if (exact) return exact;
  const ci = allowed.find((item) => item.toLowerCase() === raw.toLowerCase());
  if (ci) return ci;
  errors.push(`${field}: valor "${raw}" inválido. Use: ${allowed.join(", ")}`);
  return undefined;
}

function section(raw: JsonObject, name: string): JsonObject {
  const value = raw[name];
  return isObject(value) ? value : {};
}

function parseLotes(value: unknown, mode: VolumeMode, errors: string[]): Lote[] | undefined {
  if (isBlank(value)) return undefined;

  let nums: number[] = [];
  if (Array.isArray(value)) {
    nums = value.map((item, i) => {
      const n = parseNumber(item, `volume.lotes[${i}]`, errors);
      return n ?? NaN;
    });
  } else if (typeof value === "string") {
    nums = value
      .split(/[;|]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part, i) => parseNumber(part, `volume.lotes[${i}]`, errors) ?? NaN);
  } else {
    errors.push("volume.lotes: esperado lista de números ou string separada por ;");
    return undefined;
  }

  if (nums.some((n) => !Number.isFinite(n))) return undefined;
  const positive = nums.filter((n) => n > 0);
  if (positive.length === 0) {
    errors.push("volume.lotes: informe ao menos um lote maior que zero");
    return undefined;
  }

  return mode === "kg" ? positive.map((kg) => ({ kg })) : positive.map((unidades) => ({ unidades }));
}

export function mapTemplateObject(rawUnknown: unknown, catalogo: Catalogo): ImportResult {
  const errors: string[] = [];
  if (!isObject(rawUnknown)) {
    return { ok: false, errors: ["O arquivo deve ser um objeto JSON com seções cliente, produto, volume e comercial."] };
  }

  const raw = stripMetaKeys(rawUnknown) as JsonObject;
  const cliente = section(raw, "cliente");
  const produto = section(raw, "produto");
  const vol = section(raw, "volume");
  const comercial = section(raw, "comercial");
  const baseInput = quoteInputPadrao(catalogo);
  const baseProposta = propostaPadrao(catalogo);

  const formato = normalizeEnum<Formato>(produto.formato, FORMATOS, "produto.formato", errors);
  const zipper = normalizeEnum<Zipper>(produto.zipper, ZIPPERS, "produto.zipper", errors);
  const valvula = normalizeEnum<SimNao>(produto.valvula, SIM_NAO, "produto.valvula", errors);
  const bico = normalizeEnum<SimNao>(produto.bico, SIM_NAO, "produto.bico", errors);
  const estruturaIds = catalogo.estruturas.map((item) => item.id);
  const estruturaId = normalizeEnum(produto.estruturaId, estruturaIds, "produto.estruturaId", errors);
  const verniz = normalizeEnum<Verniz>(produto.verniz, VERNIZES, "produto.verniz", errors);
  const tintaIds = catalogo.tintas.map((item) => item.id);
  const tipoImpressao = normalizeEnum(produto.tipoImpressao, tintaIds, "produto.tipoImpressao", errors);
  const volumeMode = normalizeEnum<VolumeMode>(vol.volumeMode, VOLUME_MODES, "volume.volumeMode", errors);
  const formaPagamento = normalizeEnum<FormaPagamento>(
    comercial.formaPagamento,
    FORMAS_PAGAMENTO,
    "comercial.formaPagamento",
    errors,
  );

  const larguraMm = parseNumber(produto.larguraMm, "produto.larguraMm", errors);
  const alturaMm = parseNumber(produto.alturaMm, "produto.alturaMm", errors);
  const profundidadeMm = parseNumber(produto.profundidadeMm, "produto.profundidadeMm", errors);
  const gramatura = parseNumber(produto.gramatura, "produto.gramatura", errors);
  const volumeUnidades = parseNumber(vol.volumeUnidades, "volume.volumeUnidades", errors);
  const volumeKg = parseNumber(vol.volumeKg, "volume.volumeKg", errors);
  const mkup = parseNumber(comercial.mkup, "comercial.mkup", errors);
  const comissao = parseNumber(comercial.comissao, "comercial.comissao", errors);
  const prazo = parseNumber(comercial.prazoPagamento ?? comercial.prazo, "comercial.prazoPagamento", errors);
  const taxaPagamentoMes = parseNumber(comercial.taxaPagamentoMes, "comercial.taxaPagamentoMes", errors);
  const taxaCartao = parseNumber(comercial.taxaCartao, "comercial.taxaCartao", errors);
  const pisCofins = parseNumber(comercial.pisCofins, "comercial.pisCofins", errors);
  const icms = parseNumber(comercial.icms, "comercial.icms", errors);
  const ipi = parseNumber(comercial.ipi, "comercial.ipi", errors);

  if (isBlank(cliente.nome) && isBlank(cliente.cliente)) {
    errors.push("cliente.nome: obrigatório");
  }
  if (formato == null && isBlank(produto.formato)) errors.push("produto.formato: obrigatório");
  if (estruturaId == null && isBlank(produto.estruturaId)) errors.push("produto.estruturaId: obrigatório");
  if (larguraMm == null) errors.push("produto.larguraMm: obrigatório");
  else if (larguraMm <= 0) errors.push("produto.larguraMm: deve ser maior que zero");
  if (alturaMm == null) errors.push("produto.alturaMm: obrigatório");
  else if (alturaMm <= 0) errors.push("produto.alturaMm: deve ser maior que zero");
  if (volumeMode == null && isBlank(vol.volumeMode)) errors.push("volume.volumeMode: obrigatório");

  if (volumeMode === "unidades") {
    if (volumeUnidades == null) errors.push("volume.volumeUnidades: obrigatório no modo unidades");
    else if (volumeUnidades <= 0) errors.push("volume.volumeUnidades: deve ser maior que zero");
  }
  if (volumeMode === "kg") {
    if (volumeKg == null) errors.push("volume.volumeKg: obrigatório no modo kg");
    else if (volumeKg <= 0) errors.push("volume.volumeKg: deve ser maior que zero");
  }

  const lotes = volumeMode != null ? parseLotes(vol.lotes, volumeMode, errors) : undefined;

  if (errors.length > 0) return { ok: false, errors };

  const input: QuoteInput = {
    ...baseInput,
    formato: formato ?? baseInput.formato,
    zipper: zipper ?? baseInput.zipper,
    valvula: valvula ?? baseInput.valvula,
    bico: bico ?? baseInput.bico,
    estruturaId: estruturaId ?? baseInput.estruturaId,
    verniz: verniz ?? baseInput.verniz,
    tipoImpressao: tipoImpressao ?? baseInput.tipoImpressao,
    larguraMm: larguraMm ?? baseInput.larguraMm,
    alturaMm: alturaMm ?? baseInput.alturaMm,
    profundidadeMm: profundidadeMm ?? 0,
    volumeMode: volumeMode ?? baseInput.volumeMode,
    volumeUnidades: volumeUnidades ?? baseInput.volumeUnidades,
    volumeKg: volumeKg ?? baseInput.volumeKg,
    mkup: mkup ?? baseInput.mkup,
    comissao: comissao ?? baseInput.comissao,
  };
  if (gramatura != null && gramatura > 0) input.gramatura = gramatura;

  const mappedLotes = lotes ?? defaultLotesForVolumeMode(catalogo, input.volumeMode);
  if (!lotesMatchVolumeMode(mappedLotes, input.volumeMode)) {
    return {
      ok: false,
      errors: ["volume.lotes: os lotes não correspondem ao volumeMode (use { unidades } ou { kg })"],
    };
  }

  const proposta = normalizeProposta(
    catalogo,
    {
      ...baseProposta,
      cliente: asString(cliente.nome ?? cliente.cliente),
      contato: asString(cliente.contato),
      data: asString(cliente.data),
      espec: asString(cliente.espec),
      localEntrega: asString(cliente.localEntrega) || baseProposta.localEntrega,
      estado: asString(cliente.estado) || baseProposta.estado,
      frete: asString(cliente.frete) || baseProposta.frete,
      leadTime: asString(cliente.leadTime) || baseProposta.leadTime,
      validade: asString(cliente.validade) || baseProposta.validade,
      observacoes: isBlank(cliente.observacoes) ? baseProposta.observacoes : asString(cliente.observacoes),
      lotes: mappedLotes,
      formaPagamento: formaPagamento ?? baseProposta.formaPagamento,
      prazo: prazo ?? baseProposta.prazo,
      taxaPagamentoMes: taxaPagamentoMes ?? baseProposta.taxaPagamentoMes,
      taxaCartao: taxaCartao ?? baseProposta.taxaCartao,
      pisCofins: pisCofins ?? baseProposta.pisCofins,
      icms: icms ?? baseProposta.icms,
      ipi: ipi ?? baseProposta.ipi,
    },
    input.volumeMode,
  );

  return { ok: true, input, proposta };
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function detectDelimiter(header: string): string {
  const commas = splitCsvLine(header, ",").length;
  const semis = splitCsvLine(header, ";").length;
  return semis > commas ? ";" : ",";
}

function setPath(target: JsonObject, path: string, value: unknown): void {
  const parts = path
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return;
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = cursor[key];
    if (!isObject(next)) cursor[key] = {};
    cursor = cursor[key] as JsonObject;
  }
  cursor[parts[parts.length - 1]] = value;
}

export function csvToTemplateObject(text: string): JsonObject {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleaned.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return {};

  const delimiter = detectDelimiter(lines[0]);
  const out: JsonObject = {};

  for (let i = 0; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], delimiter);
    const path = cells[0] ?? "";
    if (!path || path.startsWith("_") || path.toLowerCase() === "campo") continue;
    const rawValue = cells[1] ?? "";
    if (path === "volume.lotes") {
      setPath(out, path, rawValue);
      continue;
    }
    if (rawValue === "") {
      setPath(out, path, "");
      continue;
    }
    const asNum = Number(rawValue.includes(",") && !rawValue.includes(".") ? rawValue.replace(",", ".") : rawValue);
    setPath(out, path, Number.isFinite(asNum) && rawValue.trim() !== "" ? asNum : rawValue);
  }
  return out;
}

export function importTemplate(text: string, catalogo: Catalogo, filename = "template.json"): ImportResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, errors: ["Arquivo vazio"] };

  const isCsv = filename.toLowerCase().endsWith(".csv") || /^campo[,;]/i.test(trimmed.split(/\r?\n/, 1)[0] ?? "");

  try {
    if (isCsv) return mapTemplateObject(csvToTemplateObject(trimmed), catalogo);
    const parsed: unknown = JSON.parse(trimmed);
    return mapTemplateObject(parsed, catalogo);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: [`Falha ao ler ${isCsv ? "CSV" : "JSON"}: ${msg}`] };
  }
}
