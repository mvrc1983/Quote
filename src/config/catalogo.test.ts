import { describe, expect, it } from "vitest";
import exemploJson from "./empresa.exemplo.json" with { type: "json" };
import { catalogoExemplo, parseCatalogo } from "./catalogo";

describe("catálogo de exemplo", () => {
  it("está marcado como fictício e cobre o cadastro mínimo", () => {
    expect(catalogoExemplo.exemplo).toBe(true);
    expect(catalogoExemplo.aviso.toLowerCase()).toContain("fict");
    expect(catalogoExemplo.estruturas).toHaveLength(10);
    expect(catalogoExemplo.tintas.length).toBeGreaterThan(0);
    expect(catalogoExemplo.empresa.nome).toBe("Convertedor Exemplo Ltda.");
    expect(catalogoExemplo.empresa.cidade).toBe("Cidade Exemplo");
  });

  it("rejeita catálogo sem um formato", () => {
    const clone = structuredClone(exemploJson) as { formatos: { id: string }[] };
    clone.formatos = clone.formatos.filter((item) => item.id !== "Bobina");
    expect(() => parseCatalogo(clone)).toThrow(/Bobina/);
  });
});
