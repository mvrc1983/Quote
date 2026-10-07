import { describe, expect, it } from "vitest";
import exemploJson from "./empresa.exemplo.json" with { type: "json" };
import { catalogoExemplo, parseCatalogo } from "./catalogo";

describe("catálogo de exemplo", () => {
  it("está marcado como fictício e cobre o cadastro mínimo", () => {
    expect(catalogoExemplo.exemplo).toBe(true);
    expect(catalogoExemplo.aviso.toLowerCase()).toContain("fict");
    expect(catalogoExemplo.estruturas).toHaveLength(11);
    expect(catalogoExemplo.processos.length).toBeGreaterThanOrEqual(11);
    expect(catalogoExemplo.processoById["offset-meia-folha"].folhaLarguraMaxMm).toBe(520);
    expect(catalogoExemplo.processoById["offset-meia-folha"].folhaLarguraMinMm).toBe(280);
    expect(catalogoExemplo.processoById["offset-inteiro"].folhaLarguraMaxMm).toBe(720);
    expect(catalogoExemplo.processoById["offset-large"].folhaLarguraMaxMm).toBe(1210);
    expect(catalogoExemplo.empresa.nome).toBe("Convertedor Exemplo Ltda.");
    expect(catalogoExemplo.empresa.cidade).toBe("Cidade Exemplo");
  });

  it("rejeita catálogo sem um formato", () => {
    const clone = structuredClone(exemploJson) as { formatos: { id: string }[] };
    clone.formatos = clone.formatos.filter((item) => item.id !== "Bobina");
    expect(() => parseCatalogo(clone)).toThrow(/Bobina/);
  });

  it("recusa inkjet fora de rótulo autoadesivo", () => {
    const clone = structuredClone(exemploJson) as {
      processos: { id: string; aplicacoes: string[] }[];
    };
    const inkjet = clone.processos.find((item) => item.id === "inkjet-rotulo");
    if (!inkjet) throw new Error("inkjet ausente");
    inkjet.aplicacoes = ["rotulo", "sleeve"];
    expect(() => parseCatalogo(clone)).toThrow(/rótulo autoadesivo/);
  });
});
