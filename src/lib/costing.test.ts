import { describe, expect, it } from "vitest";
import { catalogoExemplo, propostaPadrao, quoteInputPadrao } from "../config/catalogo";
import { areaM2PorUnidade, computeBreakdown, computeQuote, fatorImpostos, fatorMkupComissao, fatorPagamento, priceLote } from "./costing";
import { defaultLotesForVolumeMode, lotesMatchVolumeMode, normalizeProposta } from "./proposta";

const catalogo = catalogoExemplo;

describe("defaultLotes / normalizeProposta", () => {
  it("gera lotes no modo correto", () => {
    expect(lotesMatchVolumeMode(defaultLotesForVolumeMode(catalogo, "unidades"), "unidades")).toBe(true);
    expect(lotesMatchVolumeMode(defaultLotesForVolumeMode(catalogo, "kg"), "kg")).toBe(true);
    expect(lotesMatchVolumeMode(defaultLotesForVolumeMode(catalogo, "unidades"), "kg")).toBe(false);
  });

  it("troca lotes quando o modo não bate", () => {
    const normalized = normalizeProposta(catalogo, { ...propostaPadrao(catalogo), lotes: [{ unidades: 10 }] }, "kg");
    expect(normalized.lotes.every((l) => "kg" in l)).toBe(true);
  });
});

describe("kg vs unidades", () => {
  const baseInput = {
    ...quoteInputPadrao(catalogo),
    formato: "Stand-up Pouch" as const,
    larguraMm: 130,
    alturaMm: 210,
    profundidadeMm: 70,
    gramatura: 90,
  };
  const propostaUn = normalizeProposta(
    catalogo,
    { ...propostaPadrao(catalogo), lotes: [{ unidades: 1000 }, { unidades: 5000 }] },
    "unidades",
  );

  it("o mesmo peso produz o mesmo NET total nos dois modos", () => {
    const breakdown = computeBreakdown(catalogo, baseInput);
    expect(breakdown.pesoUnKg).toBeGreaterThan(0);

    const unidades = 2500;
    const kg = unidades * breakdown.pesoUnKg;
    const unPrice = priceLote(baseInput, propostaUn, breakdown, { unidades });
    const kgPrice = priceLote({ ...baseInput, volumeMode: "kg" }, propostaUn, breakdown, { kg });

    expect(unPrice.netTotal).toBeCloseTo(kgPrice.netTotal, 6);
    expect(unPrice.comImpostosTotal).toBeCloseTo(kgPrice.comImpostosTotal, 6);
    expect(unPrice.unidades).toBeCloseTo(kgPrice.unidades, 6);
  });

  it("lotes maiores diluem o setup (preço unitário cai)", () => {
    const quote = computeQuote(catalogo, baseInput, propostaUn);
    expect(quote.lotes).toHaveLength(2);
    expect(quote.lotes[1].netUn).toBeLessThan(quote.lotes[0].netUn);
  });
});

describe("valores de referência do catálogo de exemplo", () => {
  it("trava os parâmetros de exemplo usados nas contas", () => {
    expect(catalogo.exemplo).toBe(true);
    expect(catalogo.fatorDesperdicio).toBe(1.12);
    expect(catalogo.setupImpressao).toBe(240);
    expect(catalogo.estruturaById["pet-pe"].precoKg).toBe(14);
    expect(catalogo.estruturaById["pet-pe"].gramatura).toBe(80);
    expect(catalogo.estruturaById["bopp-transp"].precoKg).toBe(12);
    expect(catalogo.estruturaById["bopp-transp"].gramatura).toBe(30);
    expect(catalogo.tintaById["cmyk-branco"].precoM2).toBe(1.5);
    expect(catalogo.tintaById.preto.precoM2).toBe(0.4);
    expect(catalogo.precoVernizM2.Brilho).toBe(0.3);
    expect(catalogo.precoVernizM2.Sem).toBe(0);
    expect(catalogo.conversaoUn["Stand-up Pouch"]).toBe(0.09);
    expect(catalogo.setupConversao["Stand-up Pouch"]).toBe(150);
    expect(catalogo.conversaoUn.Bobina).toBe(0.02);
    expect(catalogo.setupConversao.Bobina).toBe(80);
    expect(catalogo.acessorios.zipper.Normal).toBe(0.07);
    expect(catalogo.acessorios.valvulaUn).toBe(0.05);
    expect(catalogo.comercial.mkup).toBe(0.45);
    expect(catalogo.comercial.comissao).toBe(0.04);
    expect(catalogo.comercial.taxaPagamentoMes).toBe(0.018);
    expect(catalogo.comercial.taxaCartao).toBe(0.0349);
    expect(catalogo.comercial.pisCofins).toBe(0.0925);
    expect(catalogo.comercial.icms).toBe(0.12);
    expect(catalogo.comercial.ipi).toBe(0.05);
  });

  it("calcula área dos formatos com medidas fixas", () => {
    const base = quoteInputPadrao(catalogo);
    expect(
      areaM2PorUnidade({
        ...base,
        formato: "Stand-up Pouch",
        larguraMm: 200,
        alturaMm: 300,
        profundidadeMm: 80,
        zipper: "Sem",
      }),
    ).toBeCloseTo(0.136, 6);
    expect(
      areaM2PorUnidade({ ...base, formato: "Bobina", larguraMm: 1000, alturaMm: 500, profundidadeMm: 0 }),
    ).toBeCloseTo(0.5, 6);
    expect(
      areaM2PorUnidade({ ...base, formato: "Sachê 2 soldas", larguraMm: 100, alturaMm: 200, profundidadeMm: 0 }),
    ).toBeCloseTo(0.04, 6);
  });

  it("stand-up com zipper, válvula e faturado: NET e impostos fixos", () => {
    const input = {
      ...quoteInputPadrao(catalogo),
      formato: "Stand-up Pouch" as const,
      zipper: "Normal" as const,
      valvula: "Com" as const,
      bico: "Sem" as const,
      estruturaId: "pet-pe",
      verniz: "Brilho" as const,
      tipoImpressao: "cmyk-branco",
      gramatura: 100,
      larguraMm: 200,
      alturaMm: 300,
      profundidadeMm: 80,
      mkup: 0.45,
      comissao: 0.04,
    };
    const proposta = {
      ...propostaPadrao(catalogo),
      formaPagamento: "Faturado" as const,
      prazo: 2,
      taxaPagamentoMes: 0.018,
      pisCofins: 0.0925,
      icms: 0.12,
      ipi: 0.05,
      lotes: [{ unidades: 1000 }, { unidades: 5000 }],
    };

    expect(fatorMkupComissao(0.45, 0.04)).toBeCloseTo(1.5104166667, 6);
    expect(fatorPagamento(proposta)).toBeCloseTo(1.036, 6);
    expect(fatorImpostos(proposta)).toBeCloseTo(1.3333333333, 6);

    const breakdown = computeBreakdown(catalogo, input);
    expect(breakdown.areaM2).toBeCloseTo(0.139, 6);
    expect(breakdown.pesoUnKg).toBeCloseTo(0.0139, 6);
    expect(breakdown.materialUn).toBeCloseTo(0.217952, 6);
    expect(breakdown.impressaoUn).toBeCloseTo(0.23352, 6);
    expect(breakdown.vernizUn).toBeCloseTo(0.046704, 6);
    expect(breakdown.conversaoUn).toBeCloseTo(0.09, 6);
    expect(breakdown.acessoriosUn).toBeCloseTo(0.12, 6);
    expect(breakdown.setupTotal).toBeCloseTo(390, 6);

    const quote = computeQuote(catalogo, input, proposta);
    expect(quote.lotes[0].custoTotal).toBeCloseTo(1098.176, 4);
    expect(quote.lotes[0].netTotal).toBeCloseTo(1718.416653, 4);
    expect(quote.lotes[0].comImpostosTotal).toBeCloseTo(2291.222204, 4);
    expect(quote.lotes[0].netUn).toBeCloseTo(1.718417, 4);
    expect(quote.lotes[1].custoTotal).toBeCloseTo(3930.88, 4);
    expect(quote.lotes[1].netTotal).toBeCloseTo(6151.008267, 4);
    expect(quote.lotes[1].comImpostosTotal).toBeCloseTo(8201.344356, 4);
    expect(quote.lotes[1].netUn).toBeCloseTo(1.230202, 4);
    expect(quote.lotes[1].netUn).toBeLessThan(quote.lotes[0].netUn);
  });

  it("bobina no cartão: NET e impostos fixos", () => {
    const input = {
      ...quoteInputPadrao(catalogo),
      formato: "Bobina" as const,
      zipper: "Sem" as const,
      valvula: "Sem" as const,
      bico: "Sem" as const,
      estruturaId: "bopp-transp",
      verniz: "Sem" as const,
      tipoImpressao: "preto",
      larguraMm: 1000,
      alturaMm: 500,
      profundidadeMm: 0,
      mkup: 0.45,
      comissao: 0.04,
    };
    delete input.gramatura;
    const proposta = {
      ...propostaPadrao(catalogo),
      formaPagamento: "Cartão" as const,
      taxaCartao: 0.0349,
      pisCofins: 0.0925,
      icms: 0.12,
      ipi: 0.05,
      lotes: [{ unidades: 2000 }],
    };

    expect(fatorPagamento(proposta)).toBeCloseTo(1.0349, 6);
    const quote = computeQuote(catalogo, input, proposta);
    expect(quote.breakdown.areaM2).toBeCloseTo(0.5, 6);
    expect(quote.breakdown.pesoUnKg).toBeCloseTo(0.015, 6);
    expect(quote.breakdown.materialUn).toBeCloseTo(0.2016, 6);
    expect(quote.breakdown.impressaoUn).toBeCloseTo(0.224, 6);
    expect(quote.breakdown.setupTotal).toBeCloseTo(320, 6);
    expect(quote.lotes[0].custoTotal).toBeCloseTo(1211.2, 4);
    expect(quote.lotes[0].netTotal).toBeCloseTo(1893.263308, 4);
    expect(quote.lotes[0].comImpostosTotal).toBeCloseTo(2524.351078, 4);
  });

  it("rejeita comissão ou impostos que estouram o denominador", () => {
    expect(() => fatorMkupComissao(0.45, 1)).toThrow(/Comissão/);
    expect(() => fatorImpostos({ pisCofins: 0.6, icms: 0.5, ipi: 0 })).toThrow(/Alíquotas/);
  });
});
