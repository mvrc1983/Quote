import { describe, expect, it } from "vitest";
import { catalogoExemplo, propostaPadrao, quoteInputPadrao } from "../config/catalogo";
import type { QuoteInput } from "../types";
import { computeBreakdown, computeQuote, custoDoPedido, processoSugerido } from "./costing";
import { calcularPoses } from "./impressao";

const catalogo = catalogoExemplo;

function pedido(patch: Partial<QuoteInput>): QuoteInput {
  return { ...quoteInputPadrao(catalogo), verniz: "Sem", zipper: "Sem", valvula: "Sem", bico: "Sem", ...patch };
}

describe("imposição de offset a folha", () => {
  const meia = catalogo.processoById["offset-meia-folha"];
  const inteiro = catalogo.processoById["offset-inteiro"];

  it("cabe 12 poses de 180×120 na meia folha 520×740, com pinça e margens", () => {
    const poses = calcularPoses(180, 120, meia);
    expect(meia.folhaLarguraMinMm).toBe(280);
    expect(meia.folhaAlturaMinMm).toBe(400);
    expect(meia.pincaMm).toBe(12);
    expect(poses.folhaLarguraMm).toBe(520);
    expect(poses.folhaAlturaMm).toBe(740);
    expect(poses.utilLarguraMm).toBe(500);
    expect(poses.utilAlturaMm).toBe(718);
    expect(poses.poses).toBe(12);
    expect(poses.orientacao).toBe("girada");
  });

  it("um cartucho 600×800 não cabe na meia folha e cabe uma vez no formato inteiro", () => {
    expect(calcularPoses(600, 800, meia).cabe).toBe(false);
    const noInteiro = calcularPoses(600, 800, inteiro);
    expect(noInteiro.cabe).toBe(true);
    expect(noInteiro.poses).toBe(1);
    expect(noInteiro.folhaLarguraMm).toBe(720);
    expect(noInteiro.folhaAlturaMm).toBe(1020);
  });

  it("arredonda as folhas do lote e soma as folhas de acerto", () => {
    const input = pedido({
      formato: "Cartonado",
      estruturaId: "cartao-duplex",
      larguraMm: 180,
      alturaMm: 120,
      grupos: [{ processoId: "offset-meia-folha", numCores: 4, numBranco: 0, numEspeciais: 0 }],
    });
    const breakdown = computeBreakdown(catalogo, input);
    expect(breakdown.poses).toBe(12);
    expect(breakdown.folhasAcerto).toBe(120 + 60 * 4);
    expect(breakdown.custoFolhaPapel).toBeGreaterThan(0);
    expect(breakdown.custoFolhaMaquina).toBeCloseTo(420 / 13000, 8);

    const unidades = 100;
    const linear =
      breakdown.setupTotal +
      (breakdown.materialUn + breakdown.maquinaUn + breakdown.impressaoUn + breakdown.conversaoUn) * unidades;
    expect(custoDoPedido(breakdown, unidades)).toBeGreaterThan(linear);
    expect(Math.ceil(unidades / breakdown.poses)).toBe(9);
  });

  it("sugere, entre as folhas que cabem, a de menor custo no volume do pedido", () => {
    const input = pedido({
      formato: "Cartonado",
      estruturaId: "cartao-duplex",
      larguraMm: 180,
      alturaMm: 120,
      volumeUnidades: 2000,
      grupos: [{ processoId: "offset-large", numCores: 4, numBranco: 0, numEspeciais: 0 }],
    });
    const sugerido = processoSugerido(catalogo, input);
    expect(sugerido.startsWith("offset-")).toBe(true);
    expect(sugerido).not.toBe("ep-embalagem");

    const maquinas = ["offset-meia-folha", "offset-inteiro", "offset-large"];
    const custos = maquinas.map((id) => {
      const breakdown = computeBreakdown(catalogo, {
        ...input,
        grupos: [{ processoId: id, numCores: 4, numBranco: 0, numEspeciais: 0 }],
      });
      return breakdown.poses > 0 ? custoDoPedido(breakdown, 2000) : Number.POSITIVE_INFINITY;
    });
    const menor = maquinas[custos.indexOf(Math.min(...custos))];
    expect(sugerido).toBe(menor);

    const grande = processoSugerido(catalogo, { ...input, larguraMm: 600, alturaMm: 800 });
    expect(grande).not.toBe("offset-meia-folha");
    expect(calcularPoses(600, 800, catalogo.processoById[grande]).cabe).toBe(true);
  });

  it("no flexível sugere flexo, mesmo com offset rotativo cadastrado", () => {
    expect(processoSugerido(catalogo, pedido({ formato: "Bobina" }))).toBe("flexo-ci");
    expect(catalogo.processoById["offset-rotativo"].aplicacoes).toContain("flexivel");
    expect(catalogo.processoById["offset-rotativo"].sugeridoPara).not.toContain("flexivel");
  });
});

describe("híbrido em linha e ponto de equilíbrio", () => {
  it("offset das cores mais rotogravura do branco soma ferramental, setup e tinta", () => {
    const base = pedido({
      formato: "Bobina",
      estruturaId: "pet-pe",
      larguraMm: 200,
      alturaMm: 200,
      profundidadeMm: 0,
      passagem: "linha",
      ferramentalModo: "diluido",
    });
    const offset = computeBreakdown(catalogo, {
      ...base,
      grupos: [{ processoId: "offset-rotativo", numCores: 4, numBranco: 0, numEspeciais: 0 }],
    });
    const roto = computeBreakdown(catalogo, {
      ...base,
      grupos: [{ processoId: "rotogravura", numCores: 1, numBranco: 1, numEspeciais: 0 }],
    });
    const hibrido = computeBreakdown(catalogo, {
      ...base,
      grupos: [
        { processoId: "offset-rotativo", numCores: 4, numBranco: 0, numEspeciais: 0 },
        { processoId: "rotogravura", numCores: 1, numBranco: 1, numEspeciais: 0 },
      ],
    });

    expect(hibrido.ferramental).toBeCloseTo(offset.ferramental + roto.ferramental, 6);
    expect(hibrido.ferramental).toBeGreaterThan(offset.ferramental);
    expect(hibrido.setupTotal).toBeGreaterThan(offset.setupTotal);
    expect(hibrido.impressaoUn).toBeGreaterThan(offset.impressaoUn);
    expect(hibrido.maquinaUn).toBeGreaterThan(0);
    expect(hibrido.cabeNaMaquina).toBe(true);
    expect(hibrido.numCores).toBe(5);
  });

  it("ferramental à parte sai do lote e entra no preço separado", () => {
    const input = pedido({
      formato: "Bobina",
      grupos: [{ processoId: "flexo-ci", numCores: 4, numBranco: 1, numEspeciais: 0 }],
      ferramentalModo: "diluido",
    });
    const proposta = { ...propostaPadrao(catalogo), lotes: [{ unidades: 1000 }] };
    const diluido = computeQuote(catalogo, input, proposta);
    const aparte = computeQuote(catalogo, { ...input, ferramentalModo: "aparte" }, proposta);
    expect(aparte.breakdown.setupTotal).toBeCloseTo(diluido.breakdown.setupTotal - diluido.breakdown.ferramental, 4);
    expect(aparte.ferramentalAParte).toBeGreaterThan(aparte.breakdown.ferramental);
    expect(aparte.lotes[0].custoTotal).toBeLessThan(diluido.lotes[0].custoTotal);
  });

  it("digital ganha em volume baixo e flexo ou rotogravura ganham em volume alto", () => {
    const custo = (processoId: string, unidades: number) =>
      custoDoPedido(
        computeBreakdown(
          catalogo,
          pedido({
            formato: "Bobina",
            larguraMm: 300,
            alturaMm: 200,
            grupos: [{ processoId, numCores: 6, numBranco: 1, numEspeciais: 0 }],
          }),
        ),
        unidades,
      );

    expect(custo("ep-embalagem", 300)).toBeLessThan(custo("flexo-ci", 300));
    expect(custo("ep-embalagem", 300)).toBeLessThan(custo("rotogravura", 300));
    expect(custo("flexo-ci", 400000)).toBeLessThan(custo("ep-embalagem", 400000));
    expect(custo("rotogravura", 400000)).toBeLessThan(custo("ep-embalagem", 400000));
  });
});
