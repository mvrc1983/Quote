import { jsPDF } from "jspdf";
import type { Catalogo } from "../config/catalogo";
import type { PropostaInput, QuoteInput, QuoteResult } from "../types";
import { isLoteKg } from "../types";
import { formatBRL, formatNumber, formatPct, slugFilename } from "./format";

const FONT = "LiberationSans";

type FontCache = { regular: string; bold: string };
let fontCache: FontCache | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadFonts(): Promise<FontCache> {
  if (fontCache) return fontCache;
  const [regular, bold] = await Promise.all([
    fetch("/fonts/LiberationSans-Regular.ttf").then((r) => {
      if (!r.ok) throw new Error("Fonte regular não encontrada");
      return r.arrayBuffer();
    }),
    fetch("/fonts/LiberationSans-Bold.ttf").then((r) => {
      if (!r.ok) throw new Error("Fonte bold não encontrada");
      return r.arrayBuffer();
    }),
  ]);
  fontCache = {
    regular: arrayBufferToBase64(regular),
    bold: arrayBufferToBase64(bold),
  };
  return fontCache;
}

function applyFonts(doc: jsPDF, fonts: FontCache): void {
  doc.addFileToVFS("LiberationSans-Regular.ttf", fonts.regular);
  doc.addFont("LiberationSans-Regular.ttf", FONT, "normal");
  doc.addFileToVFS("LiberationSans-Bold.ttf", fonts.bold);
  doc.addFont("LiberationSans-Bold.ttf", FONT, "bold");
  doc.setFont(FONT, "normal");
}

function line(doc: jsPDF, y: number, x1 = 18, x2 = 192) {
  doc.setDrawColor(24, 48, 42);
  doc.setLineWidth(0.25);
  doc.line(x1, y, x2, y);
}

export async function buildPropostaPdf(
  catalogo: Catalogo,
  input: QuoteInput,
  proposta: PropostaInput,
  quote: QuoteResult,
): Promise<{ blob: Blob; filename: string }> {
  const fonts = await loadFonts();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  applyFonts(doc, fonts);

  const estrutura = quote.estrutura;
  const modeKg = input.volumeMode === "kg";
  const { breakdown } = quote;

  doc.setFillColor(14, 36, 32);
  doc.rect(0, 0, 210, 32, "F");
  doc.setFillColor(201, 162, 72);
  doc.rect(0, 32, 210, 1.4, "F");

  doc.setTextColor(246, 241, 232);
  doc.setFont(FONT, "bold");
  doc.setFontSize(16);
  doc.text("PROPOSTA COMERCIAL", 18, 14);
  doc.setFont(FONT, "normal");
  doc.setFontSize(9);
  doc.text(catalogo.empresa.linha, 18, 21);
  doc.text(`Validade: ${proposta.validade || "—"}  ·  Data: ${proposta.data || "—"}`, 18, 27);

  doc.setTextColor(201, 162, 72);
  doc.setFont(FONT, "bold");
  doc.setFontSize(10);
  doc.text(catalogo.empresa.nome, 192, 14, { align: "right" });
  doc.setTextColor(246, 241, 232);
  doc.setFont(FONT, "normal");
  doc.setFontSize(8);
  doc.text(`${catalogo.empresa.cidade} / ${catalogo.empresa.uf}`, 192, 20, { align: "right" });

  let y = 44;
  doc.setTextColor(14, 36, 32);
  doc.setFont(FONT, "bold");
  doc.setFontSize(11);
  doc.text("Cliente", 18, y);
  y += 6;
  doc.setFont(FONT, "normal");
  doc.setFontSize(10);
  doc.text(proposta.cliente || "—", 18, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(70, 82, 76);
  doc.text(`Contato: ${proposta.contato || "—"}`, 18, y);
  y += 5;
  doc.text(
    `Entrega: ${proposta.localEntrega || "—"} / ${proposta.estado || "—"}  ·  Frete: ${proposta.frete || "—"}`,
    18,
    y,
  );

  y += 10;
  doc.setTextColor(14, 36, 32);
  doc.setFont(FONT, "bold");
  doc.setFontSize(11);
  doc.text("Especificação", 18, y);
  y += 6;
  doc.setFont(FONT, "normal");
  doc.setFontSize(10);
  const espec = doc.splitTextToSize(proposta.espec || "—", 174);
  doc.text(espec, 18, y);
  y += espec.length * 5 + 3;

  doc.setFontSize(9);
  doc.setTextColor(70, 82, 76);
  const dims =
    input.profundidadeMm > 0
      ? `${input.larguraMm} × ${input.alturaMm} × ${input.profundidadeMm} mm`
      : `${input.larguraMm} × ${input.alturaMm} mm`;
  const specLines = [
    `Formato: ${input.formato}  ·  Estrutura: ${estrutura.nome}`,
    `Medidas: ${dims}  ·  Gramatura: ${formatNumber(quote.breakdown.gramatura, 0)} g/m²  ·  Área: ${formatNumber(quote.breakdown.areaM2, 4)} m²/un`,
    `Impressão: ${quote.processoNome}  ·  ${breakdown.numCores} cores  ·  Verniz: ${input.verniz}`,
    breakdown.poses > 0
      ? `Folha ${formatNumber(breakdown.folhaLarguraMm, 0)}×${formatNumber(breakdown.folhaAlturaMm, 0)} mm  ·  ${breakdown.poses} poses  ·  acerto ${breakdown.folhasAcerto} fls`
      : `Banda ${formatNumber(breakdown.larguraWebMm, 0)} mm  ·  passo ${formatNumber(breakdown.passoMm, 0)} mm  ·  ${breakdown.pistas} pista(s)`,
    breakdown.ferramental > 0
      ? input.ferramentalModo === "diluido"
        ? `Ferramental diluído no lote: ${formatBRL(breakdown.ferramental)}`
        : `Ferramental cobrado à parte: ${formatBRL(quote.ferramentalAParte)}`
      : "Ferramental: sem clichê, chapa ou cilindro",
    `Zipper: ${input.zipper}  ·  Válvula: ${input.valvula}  ·  Bico: ${input.bico}`,
    `Peso estimado: ${formatNumber(quote.breakdown.pesoUnKg * 1000, 2)} g/un`,
  ];
  for (const row of specLines) {
    doc.text(row, 18, y);
    y += 5;
  }

  y += 6;
  doc.setTextColor(14, 36, 32);
  doc.setFont(FONT, "bold");
  doc.setFontSize(11);
  doc.text(modeKg ? "Preços por lote (kg)" : "Preços por lote (unidades)", 18, y);
  y += 3;
  line(doc, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont(FONT, "bold");
  doc.setTextColor(70, 82, 76);
  if (modeKg) {
    doc.text("Lote (kg)", 18, y);
    doc.text("Unid. equiv.", 42, y);
    doc.text("NET / kg", 78, y);
    doc.text("c/ imp. / kg", 110, y);
    doc.text("Total NET", 148, y);
    doc.text("Total c/ imp.", 192, y, { align: "right" });
  } else {
    doc.text("Lote (un)", 18, y);
    doc.text("Peso (kg)", 42, y);
    doc.text("NET / un", 78, y);
    doc.text("c/ imp. / un", 110, y);
    doc.text("Total NET", 148, y);
    doc.text("Total c/ imp.", 192, y, { align: "right" });
  }
  y += 2;
  line(doc, y);
  y += 6;

  doc.setFont(FONT, "normal");
  doc.setTextColor(14, 36, 32);
  for (const lote of quote.lotes) {
    const qty = isLoteKg(lote.lote) ? lote.lote.kg : lote.lote.unidades;
    if (modeKg) {
      doc.text(formatNumber(qty, 0), 18, y);
      doc.text(formatNumber(lote.unidades, 0), 42, y);
      doc.text(formatBRL(lote.netKg), 78, y);
      doc.text(formatBRL(lote.comImpostosKg), 110, y);
    } else {
      doc.text(formatNumber(qty, 0), 18, y);
      doc.text(formatNumber(lote.kg, 1), 42, y);
      doc.text(formatBRL(lote.netUn), 78, y);
      doc.text(formatBRL(lote.comImpostosUn), 110, y);
    }
    doc.text(formatBRL(lote.netTotal), 148, y);
    doc.text(formatBRL(lote.comImpostosTotal), 192, y, { align: "right" });
    y += 6;
  }

  y += 6;
  doc.setFont(FONT, "bold");
  doc.setFontSize(11);
  doc.text("Condições comerciais", 18, y);
  y += 6;
  doc.setFont(FONT, "normal");
  doc.setFontSize(9);
  doc.setTextColor(70, 82, 76);
  const cond = [
    `Pagamento: ${proposta.formaPagamento}${proposta.formaPagamento === "Faturado" ? ` · ${proposta.prazo} mês(es)` : ""}`,
    `Markup: ${formatPct(input.mkup)}  ·  Comissão: ${formatPct(input.comissao)}`,
    `PIS/COFINS ${formatPct(proposta.pisCofins)}  ·  ICMS ${formatPct(proposta.icms)}  ·  IPI ${formatPct(proposta.ipi)}`,
    `Lead time: ${proposta.leadTime || "—"}  ·  Frete: ${proposta.frete || "—"}`,
  ];
  for (const row of cond) {
    doc.text(row, 18, y);
    y += 5;
  }

  if (proposta.observacoes.trim()) {
    y += 3;
    doc.setFont(FONT, "bold");
    doc.setTextColor(14, 36, 32);
    doc.text("Observações", 18, y);
    y += 5;
    doc.setFont(FONT, "normal");
    doc.setTextColor(70, 82, 76);
    const obs = doc.splitTextToSize(proposta.observacoes, 174);
    doc.text(obs, 18, y);
    y += obs.length * 5;
  }

  y = Math.max(y + 10, 270);
  line(doc, y);
  y += 5;
  doc.setFontSize(7.5);
  doc.setTextColor(120, 128, 122);
  const rodape = [
    "Valores NET sem impostos. Impostos estimados conforme alíquotas informadas e sujeitos a confirmação fiscal.",
    `${catalogo.empresa.nome} · ${catalogo.empresa.cidade} / ${catalogo.empresa.uf}. Gerado por Quote.`,
    catalogo.exemplo ? "Documento de demonstração com preços fictícios." : "",
  ]
    .filter(Boolean)
    .join(" ");
  doc.text(rodape, 18, y, { maxWidth: 174 });

  const filename = `Proposta_${slugFilename(proposta.cliente)}_${slugFilename(proposta.data)}.pdf`;
  const blob = doc.output("blob");
  return { blob, filename };
}

/** Abre a aba na hora do clique (evita bloqueio) e preenche o PDF em seguida. */
export function generatePropostaPdf(
  catalogo: Catalogo,
  input: QuoteInput,
  proposta: PropostaInput,
  quote: QuoteResult,
): void {
  const preview = window.open("about:blank", "_blank");
  void buildPropostaPdf(catalogo, input, proposta, quote)
    .then(({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      if (preview && !preview.closed) {
        preview.location.href = url;
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (preview && !preview.closed) preview.document.body.innerText = `Falha ao gerar PDF: ${msg}`;
      window.alert(`Falha ao gerar PDF: ${msg}`);
    });
}
