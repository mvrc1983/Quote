import { describe, expect, it } from "vitest";
import { propostaPadrao, quoteInputPadrao, catalogoExemplo } from "../config/catalogo";
import { upsertDraft } from "./drafts";

describe("upsertDraft", () => {
  const input = quoteInputPadrao(catalogoExemplo);
  const proposta = propostaPadrao(catalogoExemplo);

  it("atualiza o rascunho quando recebe o id existente", () => {
    const first = upsertDraft([], input, { ...proposta, cliente: "Cliente Exemplo" }, "rascunho-1");
    const second = upsertDraft(
      first,
      { ...input, mkup: 0.5 },
      { ...proposta, cliente: "Cliente Exemplo" },
      "rascunho-1",
    );

    expect(second).toHaveLength(1);
    expect(second[0]?.id).toBe("rascunho-1");
    expect(second[0]?.nome).toBe("Cliente Exemplo");
    expect(second[0]?.input.mkup).toBe(0.5);
  });

  it("cria outro rascunho quando o id é diferente", () => {
    const first = upsertDraft([], input, proposta, "rascunho-1");
    const second = upsertDraft(first, input, { ...proposta, cliente: "Outro Cliente" }, "rascunho-2");
    expect(second.map((draft) => draft.id)).toEqual(["rascunho-2", "rascunho-1"]);
  });
});
