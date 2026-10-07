import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { catalogoExemplo } from "../config/catalogo";
import { isLoteKg, isLoteUnidades } from "../types";
import { csvToTemplateObject, importTemplate, mapTemplateObject, stripMetaKeys } from "./importTemplate";
import { lotesMatchVolumeMode } from "./proposta";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const catalogo = catalogoExemplo;

const filledJson = {
  _instrucoes: "ignore",
  cliente: {
    nome: "Café Serra Alta",
    contato: "Ana Souza",
    data: "20/09/2026",
    espec: "Stand-up pouch fosco metalizado 250g",
    localEntrega: "Distrito Exemplo",
    estado: "EX",
    frete: "CIF — entrega inclusa (exemplo)",
    leadTime: "12 dias úteis (exemplo)",
    validade: "15 dias (exemplo)",
    observacoes: "Pedido de demonstração, sem compromisso comercial.",
  },
  produto: {
    formato: "Stand-up Pouch",
    _opcoes_formato: ["Bobina"],
    zipper: "Normal",
    valvula: "Com",
    bico: "Sem",
    estruturaId: "pet-pe",
    verniz: "Verniz Fosco",
    processoId: "ep-embalagem",
    numCores: 5,
    numBranco: 1,
    numEspeciais: 0,
    pistas: 1,
    passoMm: 0,
    ferramentalModo: "diluido",
    gramatura: 90,
    larguraMm: 130,
    alturaMm: 210,
    profundidadeMm: 70,
  },
  volume: {
    volumeMode: "unidades",
    volumeUnidades: 5000,
    volumeKg: 400,
    lotes: [1000, 2500, 5000],
  },
  comercial: {
    mkup: 0.5,
    comissao: 0.03,
    formaPagamento: "Faturado",
    prazoPagamento: 2,
    taxaPagamentoMes: 0.012,
    taxaCartao: 0.025,
    pisCofins: 0.0925,
    icms: 0.12,
    ipi: 0.05,
  },
};

describe("stripMetaKeys", () => {
  it("remove chaves que começam com _", () => {
    const cleaned = stripMetaKeys(filledJson) as Record<string, unknown>;
    expect(cleaned._instrucoes).toBeUndefined();
    expect((cleaned.produto as Record<string, unknown>)._opcoes_formato).toBeUndefined();
    expect((cleaned.produto as Record<string, unknown>).formato).toBe("Stand-up Pouch");
  });
});

describe("mapTemplateObject happy path", () => {
  it("mapeia JSON preenchido para QuoteInput + PropostaInput", () => {
    const result = mapTemplateObject(filledJson, catalogo);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.input.formato).toBe("Stand-up Pouch");
    expect(result.input.zipper).toBe("Normal");
    expect(result.input.valvula).toBe("Com");
    expect(result.input.bico).toBe("Sem");
    expect(result.input.estruturaId).toBe("pet-pe");
    expect(result.input.verniz).toBe("Verniz Fosco");
    expect(result.input.grupos[0].processoId).toBe("ep-embalagem");
    expect(result.input.grupos[0].numCores).toBe(5);
    expect(result.input.gramatura).toBe(90);
    expect(result.input.larguraMm).toBe(130);
    expect(result.input.alturaMm).toBe(210);
    expect(result.input.profundidadeMm).toBe(70);
    expect(result.input.volumeMode).toBe("unidades");
    expect(result.input.volumeUnidades).toBe(5000);
    expect(result.input.mkup).toBe(0.5);
    expect(result.input.comissao).toBe(0.03);
    expect(result.proposta.taxaPagamentoMes).toBe(0.012);
    expect(result.proposta.taxaCartao).toBe(0.025);

    expect(result.proposta.cliente).toBe("Café Serra Alta");
    expect(result.proposta.contato).toBe("Ana Souza");
    expect(result.proposta.data).toBe("20/09/2026");
    expect(result.proposta.espec).toBe("Stand-up pouch fosco metalizado 250g");
    expect(result.proposta.localEntrega).toBe("Distrito Exemplo");
    expect(result.proposta.formaPagamento).toBe("Faturado");
    expect(result.proposta.prazo).toBe(2);
    expect(result.proposta.lotes).toEqual([{ unidades: 1000 }, { unidades: 2500 }, { unidades: 5000 }]);
    expect(lotesMatchVolumeMode(result.proposta.lotes, "unidades")).toBe(true);
    expect(result.proposta.lotes.every(isLoteUnidades)).toBe(true);
  });

  it("normaliza enum por case-insensitive para o valor canônico", () => {
    const result = mapTemplateObject(
      {
        ...filledJson,
        produto: { ...filledJson.produto, zipper: "normal", formato: "stand-up pouch", processoId: "EP-EMBALAGEM" },
      },
      catalogo,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.zipper).toBe("Normal");
    expect(result.input.formato).toBe("Stand-up Pouch");
    expect(result.input.grupos[0].processoId).toBe("ep-embalagem");
    expect(result.input.grupos[0].numCores).toBe(5);
  });

  it("mapeia lotes em kg quando volumeMode=kg", () => {
    const result = mapTemplateObject(
      {
        ...filledJson,
        volume: { volumeMode: "kg", volumeKg: 200, volumeUnidades: 20, lotes: [50, 100, 200] },
      },
      catalogo,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.volumeMode).toBe("kg");
    expect(result.input.volumeKg).toBe(200);
    expect(result.proposta.lotes).toEqual([{ kg: 50 }, { kg: 100 }, { kg: 200 }]);
    expect(result.proposta.lotes.every(isLoteKg)).toBe(true);
    expect(lotesMatchVolumeMode(result.proposta.lotes, "kg")).toBe(true);
  });

  it("usa defaults do catálogo de exemplo quando o bloco comercial vem vazio", () => {
    const result = mapTemplateObject(
      {
        cliente: { nome: "Cliente X" },
        produto: {
          formato: "Bobina",
          estruturaId: "pet-pe",
          larguraMm: 320,
          alturaMm: 225,
        },
        volume: { volumeMode: "unidades", volumeUnidades: 20 },
      },
      catalogo,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.mkup).toBe(0.45);
    expect(result.input.comissao).toBe(0.04);
    expect(result.input.zipper).toBe("Sem");
    expect(result.input.grupos[0].processoId).toBe("flexo-ci");
    expect(result.input.grupos[0].numCores).toBe(6);
    expect(result.proposta.lotes).toEqual([
      { unidades: 1000 },
      { unidades: 2500 },
      { unidades: 5000 },
      { unidades: 7500 },
      { unidades: 10000 },
    ]);
    expect(result.proposta.localEntrega).toBe("Cidade Exemplo");
    expect(result.proposta.estado).toBe("EX");
    expect(result.proposta.frete).toBe("A combinar (exemplo)");
    expect(result.proposta.leadTime).toBe("15 dias úteis (exemplo)");
    expect(result.proposta.validade).toBe("10 dias (exemplo)");
    expect(result.proposta.pisCofins).toBe(0.0925);
    expect(result.proposta.icms).toBe(0.12);
    expect(result.proposta.ipi).toBe(0.05);
  });
});

describe("enum inválido", () => {
  it("lista o campo e não inventa valor", () => {
    const result = mapTemplateObject(
      {
        ...filledJson,
        produto: { ...filledJson.produto, formato: "Doypack", zipper: "Invisível" },
      },
      catalogo,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.startsWith("produto.formato:"))).toBe(true);
    expect(result.errors.some((e) => e.startsWith("produto.zipper:"))).toBe(true);
    expect(result.errors.join(" ")).toContain("Doypack");
    expect(result.errors.join(" ")).toContain("Invisível");
  });

  it("rejeita estrutura e tinta que não estão no catálogo", () => {
    const result = mapTemplateObject(
      {
        ...filledJson,
        produto: { ...filledJson.produto, estruturaId: "pet-nylon-pe", processoId: "tinta-hp" },
      },
      catalogo,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.startsWith("produto.estruturaId:"))).toBe(true);
    expect(result.errors.some((e) => e.startsWith("produto.processoId:"))).toBe(true);
  });
});

describe("CSV", () => {
  it("converte CSV do template e importa no happy path", () => {
    const csv = `campo,valor,opcoes_ou_nota
cliente.nome,Café Serra Alta,
cliente.contato,Ana,
cliente.data,20/09/2026,
cliente.espec,Stand-up pouch 250g,
produto.formato,Stand-up Pouch,
produto.zipper,Sem,
produto.valvula,Sem,
produto.bico,Sem,
produto.estruturaId,pet-pe,
produto.verniz,Brilho,
produto.processoId,ep-embalagem,
produto.numCores,5,
produto.numBranco,1,
produto.numEspeciais,0,
produto.gramatura,90,
produto.larguraMm,130,
produto.alturaMm,210,
produto.profundidadeMm,70,
volume.volumeMode,unidades,
volume.volumeUnidades,5000,
volume.volumeKg,400,
volume.lotes,"1000;2500;5000",
comercial.mkup,0.5,
comercial.comissao,0.03,
comercial.formaPagamento,Faturado,
comercial.prazoPagamento,2,
`;
    const obj = csvToTemplateObject(csv);
    expect((obj.cliente as { nome: string }).nome).toBe("Café Serra Alta");
    const result = importTemplate(csv, catalogo, "template-cotacao.csv");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.formato).toBe("Stand-up Pouch");
    expect(result.input.grupos[0].processoId).toBe("ep-embalagem");
    expect(result.input.grupos[0].numCores).toBe(5);
    expect(result.input.mkup).toBe(0.5);
    expect(result.proposta.lotes).toEqual([{ unidades: 1000 }, { unidades: 2500 }, { unidades: 5000 }]);
    expect(result.proposta.localEntrega).toBe("Cidade Exemplo");
  });
});

describe("importTemplate JSON string", () => {
  it("parseia JSON textual", () => {
    const result = importTemplate(JSON.stringify(filledJson), catalogo, "template-cotacao.json");
    expect(result.ok).toBe(true);
  });

  it("falha em JSON quebrado", () => {
    const result = importTemplate("{nope", catalogo, "template-cotacao.json");
    expect(result.ok).toBe(false);
  });

  it("carrega o exemplo público preenchido", () => {
    const text = readFileSync(resolve(root, "public/exemplo-template-preenchido.json"), "utf8");
    const result = importTemplate(text, catalogo, "exemplo-template-preenchido.json");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposta.cliente).toBe("Café Serra Alta");
    expect(result.input.grupos[0].processoId).toBe("ep-embalagem");
    expect(result.input.grupos[0].numCores).toBe(5);
    expect(result.proposta.localEntrega).toBe("Distrito Exemplo");
  });

  it("rejeita inkjet fora de rótulo e aceita offset em rótulo, sleeve, flexível e cartonado", () => {
    const base = {
      cliente: { nome: "Cliente Teste" },
      volume: { volumeMode: "unidades", volumeUnidades: 1000 },
    };
    const pedir = (produto: Record<string, unknown>) =>
      mapTemplateObject(
        {
          ...base,
          produto: { estruturaId: "pet-pe", larguraMm: 80, alturaMm: 80, processoId: "flexo-ci", numCores: 4, ...produto },
        },
        catalogo,
      );

    for (const formato of ["Stand-up Pouch", "Sleeve", "Cartonado"]) {
      const recusado = pedir({ formato, processoId: "inkjet-rotulo" });
      expect(recusado.ok).toBe(false);
      if (recusado.ok) return;
      expect(recusado.errors.join(" ")).toMatch(/rótulo autoadesivo/);
    }

    expect(pedir({ formato: "Rótulo", processoId: "inkjet-rotulo", numCores: 4 }).ok).toBe(true);
    expect(pedir({ formato: "Rótulo", processoId: "offset-intermitente" }).ok).toBe(true);
    expect(pedir({ formato: "Sleeve", processoId: "offset-intermitente" }).ok).toBe(true);
    expect(pedir({ formato: "Rótulo", processoId: "offset-rotativo" }).ok).toBe(true);
    expect(pedir({ formato: "Sleeve", processoId: "offset-rotativo" }).ok).toBe(true);
    expect(pedir({ formato: "Bobina", processoId: "offset-rotativo", larguraMm: 200 }).ok).toBe(true);
    expect(pedir({ formato: "Cartonado", processoId: "offset-meia-folha", larguraMm: 180, alturaMm: 120, estruturaId: "cartao-duplex" }).ok).toBe(true);
    expect(pedir({ formato: "Cartonado", processoId: "offset-inteiro", larguraMm: 600, alturaMm: 800, estruturaId: "cartao-duplex" }).ok).toBe(true);
    expect(pedir({ formato: "Cartonado", processoId: "ep-embalagem", larguraMm: 100, alturaMm: 100, estruturaId: "cartao-duplex" }).ok).toBe(true);

    const meiaGrande = pedir({ formato: "Cartonado", processoId: "offset-meia-folha", larguraMm: 600, alturaMm: 800, estruturaId: "cartao-duplex" });
    expect(meiaGrande.ok).toBe(false);
    if (!meiaGrande.ok) expect(meiaGrande.errors.join(" ")).toMatch(/não cabe na folha/);

    const offsetNoCarton = pedir({ formato: "Cartonado", processoId: "offset-intermitente", estruturaId: "cartao-duplex" });
    expect(offsetNoCarton.ok).toBe(false);

    const hibrido = mapTemplateObject(
      {
        ...base,
        produto: {
          formato: "Bobina",
          estruturaId: "pet-pe",
          larguraMm: 200,
          alturaMm: 200,
          passagem: "linha",
          grupos: [
            { processoId: "offset-rotativo", numCores: 4, numBranco: 0, numEspeciais: 0 },
            { processoId: "rotogravura", numCores: 1, numBranco: 1, numEspeciais: 0 },
          ],
        },
      },
      catalogo,
    );
    expect(hibrido.ok).toBe(true);
    if (!hibrido.ok) return;
    expect(hibrido.input.grupos).toHaveLength(2);
  });

  it("rejeita o template em branco sem cliente.nome", () => {
    const text = readFileSync(resolve(root, "public/template-cotacao.json"), "utf8");
    const result = importTemplate(text, catalogo, "template-cotacao.json");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.startsWith("cliente.nome:"))).toBe(true);
  });
});
