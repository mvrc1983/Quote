import type { Catalogo } from "../config/catalogo";
import { propostaPadrao } from "../config/catalogo";
import type { Lote, PropostaInput, VolumeMode } from "../types";
import { isLoteKg, isLoteUnidades } from "../types";
import { todayBr } from "./format";

export function defaultLotesForVolumeMode(catalogo: Catalogo, mode: VolumeMode): Lote[] {
  if (mode === "kg") return catalogo.lotesPadrao.kg.map((kg) => ({ kg }));
  return catalogo.lotesPadrao.unidades.map((unidades) => ({ unidades }));
}

export function lotesMatchVolumeMode(lotes: Lote[], mode: VolumeMode): boolean {
  if (lotes.length === 0) return false;
  return lotes.every((lote) => (mode === "kg" ? isLoteKg(lote) : isLoteUnidades(lote)));
}

export function loteQuantidade(lote: Lote): number {
  return isLoteKg(lote) ? lote.kg : lote.unidades;
}

export function normalizeProposta(
  catalogo: Catalogo,
  proposta: Partial<PropostaInput> | undefined,
  volumeMode: VolumeMode,
): PropostaInput {
  const merged: PropostaInput = {
    ...propostaPadrao(catalogo),
    ...proposta,
    lotes: proposta?.lotes?.length ? proposta.lotes : defaultLotesForVolumeMode(catalogo, volumeMode),
  };

  if (!merged.data.trim()) merged.data = todayBr();
  if (!lotesMatchVolumeMode(merged.lotes, volumeMode)) {
    merged.lotes = defaultLotesForVolumeMode(catalogo, volumeMode);
  }

  return merged;
}

export function isPropostaComplete(proposta: PropostaInput, volumeMode: VolumeMode): boolean {
  return (
    proposta.cliente.trim().length > 0 &&
    proposta.espec.trim().length > 0 &&
    lotesMatchVolumeMode(proposta.lotes, volumeMode)
  );
}

export function propostaMissingFields(proposta: PropostaInput, volumeMode: VolumeMode): string[] {
  const missing: string[] = [];
  if (!proposta.cliente.trim()) missing.push("cliente");
  if (!proposta.espec.trim()) missing.push("especificação");
  if (!lotesMatchVolumeMode(proposta.lotes, volumeMode)) missing.push("lotes (modo de volume)");
  return missing;
}
