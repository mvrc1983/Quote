import type { PropostaInput, QuoteInput } from "../types";

export type Draft = {
  id: string;
  nome: string;
  savedAt: string;
  input: QuoteInput;
  proposta: PropostaInput;
};

const KEY = "quote-rascunhos-v2";

export function loadDrafts(): Draft[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Draft[]) : [];
  } catch {
    return [];
  }
}

export function saveDrafts(drafts: Draft[]): void {
  localStorage.setItem(KEY, JSON.stringify(drafts));
}

export function upsertDraft(
  drafts: Draft[],
  input: QuoteInput,
  proposta: PropostaInput,
  existingId?: string,
): Draft[] {
  const id = existingId ?? crypto.randomUUID();
  const nome = proposta.cliente.trim() || "Rascunho sem cliente";
  const next: Draft = { id, nome, savedAt: new Date().toISOString(), input, proposta };
  const others = drafts.filter((d) => d.id !== id);
  return [next, ...others].slice(0, 20);
}
