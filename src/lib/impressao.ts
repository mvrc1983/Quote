import type { Catalogo, PrecoFormato, Processo } from "../config/catalogo";
import type { Formato, GrupoImpressao, QuoteInput } from "../types";
import { APLICACAO_LABEL, aplicacaoDoFormato } from "../types";

export type ContagemCores = Pick<GrupoImpressao, "numCores" | "numBranco" | "numEspeciais">;

export function processosCompativeis(catalogo: Catalogo, formato: Formato): Processo[] {
  const aplicacao = aplicacaoDoFormato(formato);
  return catalogo.processos.filter((processo) => processo.aplicacoes.includes(aplicacao));
}

export function processoCompativel(processo: Processo, formato: Formato): boolean {
  return processo.aplicacoes.includes(aplicacaoDoFormato(formato));
}

/** Erro de importação quando o processo não atende o formato. */
export function mensagemIncompatibilidade(
  processo: Processo,
  formato: Formato,
  validos: string[],
  campo = "produto.processoId",
): string {
  const aplicacao = APLICACAO_LABEL[aplicacaoDoFormato(formato)];
  const lista = validos.length > 0 ? ` Use: ${validos.join(", ")}.` : "";
  if (processo.tecnologia === "inkjet") {
    return `${campo}: "${processo.nome}" só imprime rótulo autoadesivo, não ${aplicacao} (${formato}).${lista}`;
  }
  return `${campo}: "${processo.nome}" não é compatível com o formato "${formato}" (${aplicacao}).${lista}`;
}

export type Imposicao = {
  passoMm: number;
  pistas: number;
  larguraWebMm: number;
  larguraUtilMm: number;
  cabeNaMaquina: boolean;
  metrosPorUn: number;
};

/** Passo, pistas e largura de banda. A máquina limita a largura; o passo vem do pedido ou da altura. */
export function calcularImposicao(input: QuoteInput, processo: Processo, formato: PrecoFormato): Imposicao {
  const pistas = input.pistas > 0 ? input.pistas : 1;
  const passoMm = input.passoMm > 0 ? input.passoMm : input.alturaMm + processo.gapRepeticaoMm;
  const umaPista =
    input.formato === "Sleeve" ? 2 * input.larguraMm + formato.seamMm : input.larguraMm + processo.gapPistaMm;
  const larguraWebMm = pistas * umaPista;
  return {
    passoMm,
    pistas,
    larguraWebMm,
    larguraUtilMm: processo.larguraUtilMm,
    cabeNaMaquina: larguraWebMm <= processo.larguraUtilMm + 1e-6,
    metrosPorUn: passoMm / 1000 / pistas,
  };
}

export type ImposicaoFolha = {
  folhaLarguraMm: number;
  folhaAlturaMm: number;
  utilLarguraMm: number;
  utilAlturaMm: number;
  poses: number;
  orientacao: "normal" | "girada";
  cabe: boolean;
};

/**
 * Quantas poses do cartucho planificado cabem na folha máxima da máquina.
 * A pinça come a altura útil; as margens laterais comem a largura. O vão entre poses entra no passo.
 */
export function calcularPoses(blankLarguraMm: number, blankAlturaMm: number, processo: Processo): ImposicaoFolha {
  const folhaLarguraMm = processo.folhaLarguraMaxMm;
  const folhaAlturaMm = processo.folhaAlturaMaxMm;
  const utilLarguraMm = folhaLarguraMm - 2 * processo.margemLateralMm;
  const utilAlturaMm = folhaAlturaMm - processo.pincaMm - processo.margemFundoMm;
  const gap = processo.entrePosesMm;

  const contar = (bw: number, bh: number) => {
    if (bw <= 0 || bh <= 0 || utilLarguraMm <= 0 || utilAlturaMm <= 0) return 0;
    const nx = Math.floor((utilLarguraMm + gap) / (bw + gap));
    const ny = Math.floor((utilAlturaMm + gap) / (bh + gap));
    if (nx < 1 || ny < 1) return 0;
    return nx * ny;
  };

  const normal = contar(blankLarguraMm, blankAlturaMm);
  const girada = contar(blankAlturaMm, blankLarguraMm);
  const poses = Math.max(normal, girada);
  return {
    folhaLarguraMm,
    folhaAlturaMm,
    utilLarguraMm,
    utilAlturaMm,
    poses,
    orientacao: girada > normal ? "girada" : "normal",
    cabe: poses >= 1,
  };
}

/** R$/m²: tinta por cobertura e, no digital, clique por separação. */
export function custoTintaPorM2(processo: Processo, cores: ContagemCores): number {
  const processoCores = Math.max(0, cores.numCores - cores.numBranco - cores.numEspeciais);
  const gramas =
    processoCores * processo.coberturaProcesso * processo.consumoTintaGm2Cheio * processo.precoTintaKg +
    Math.max(0, cores.numBranco) * processo.coberturaBranco * processo.consumoTintaGm2Cheio * processo.precoTintaBrancoKg +
    Math.max(0, cores.numEspeciais) *
      processo.coberturaEspecial *
      processo.consumoTintaGm2Cheio *
      processo.precoTintaEspecialKg;
  const clique = Math.max(0, cores.numCores) * processo.custoM2PorSeparacao;
  return gramas / 1000 + clique;
}

/** Clichê, chapa ou cilindro. Uma peça por cor, no tamanho informado (passo × banda, ou a folha). */
export function custoFerramental(processo: Processo, cores: ContagemCores, areaM2: number, passoMm: number): number {
  if (!processo.temFerramental || cores.numCores <= 0) return 0;
  const porCor =
    processo.custoFerramentalPorCor +
    processo.custoFerramentalPorM2 * areaM2 +
    processo.custoFerramentalPorMmPasso * passoMm;
  return cores.numCores * porCor;
}

/** Erros de compatibilidade e de encaixe. Lista vazia significa que o pedido pode ser cotado. */
export function validarImpressao(catalogo: Catalogo, input: QuoteInput): string[] {
  const errors: string[] = [];
  if (input.grupos.length === 0) {
    errors.push("produto.grupos: informe ao menos um processo");
    return errors;
  }

  const processos: Processo[] = [];
  for (let i = 0; i < input.grupos.length; i++) {
    const grupo = input.grupos[i];
    const campo = input.grupos.length === 1 ? "produto.processoId" : `produto.grupos[${i}].processoId`;
    const processo = catalogo.processoById[grupo.processoId];
    if (!processo) {
      errors.push(`${campo}: processo inexistente`);
      continue;
    }
    if (!processoCompativel(processo, input.formato)) {
      const validos = processosCompativeis(catalogo, input.formato).map((item) => item.id);
      errors.push(mensagemIncompatibilidade(processo, input.formato, validos, campo));
    }
    if (grupo.numBranco < 0 || grupo.numEspeciais < 0 || grupo.numCores < 0) {
      errors.push(`${campo}: número de cores inválido`);
    } else if (grupo.numBranco + grupo.numEspeciais > grupo.numCores) {
      errors.push(`${campo}: branco + especiais não pode passar do total de cores`);
    }
    processos.push(processo);
  }
  if (errors.length > 0 || processos.length !== input.grupos.length) return errors;

  const alimentacoes = new Set(processos.map((processo) => processo.alimentacao));
  if (alimentacoes.size > 1) {
    errors.push("produto.grupos: híbrido não mistura máquina a folha e máquina a bobina");
    return errors;
  }

  if (processos[0].alimentacao === "folha") {
    for (const processo of processos) {
      const poses = calcularPoses(input.larguraMm, input.alturaMm, processo);
      if (!poses.cabe) {
        errors.push(
          `produto: o cartucho ${input.larguraMm}×${input.alturaMm} mm não cabe na folha ${poses.folhaLarguraMm}×${poses.folhaAlturaMm} mm de "${processo.nome}" (pinça ${processo.pincaMm} mm e margens).`,
        );
      }
    }
    return errors;
  }

  const formato = catalogo.formatoById[input.formato];
  for (const processo of processos) {
    const imposicao = calcularImposicao(input, processo, formato);
    if (!imposicao.cabeNaMaquina) {
      errors.push(
        `produto.pistas: a banda de ${imposicao.larguraWebMm} mm não cabe na largura útil de ${processo.larguraUtilMm} mm de "${processo.nome}".`,
      );
    }
  }
  return errors;
}
