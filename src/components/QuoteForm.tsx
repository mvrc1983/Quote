import type { ReactNode } from "react";
import type { Catalogo } from "../config/catalogo";
import { processoSugerido } from "../lib/costing";
import { processosCompativeis } from "../lib/impressao";
import type { Formato, GrupoImpressao, QuoteInput } from "../types";
import { FORMATOS, MODOS_FERRAMENTAL, PASSAGENS, SIM_NAO, VERNIZES, VOLUME_MODES, ZIPPERS, aplicacaoDoFormato } from "../types";

type Props = {
  catalogo: Catalogo;
  input: QuoteInput;
  onChange: (next: QuoteInput) => void;
};

export function QuoteForm({ catalogo, input, onChange }: Props) {
  const set = <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => onChange({ ...input, [key]: value });
  const compativeis = processosCompativeis(catalogo, input.formato);
  const alimentacaoDoGrupo = (index: number) => {
    const outros = input.grupos.filter((_, i) => i !== index);
    if (outros.length === 0) return compativeis;
    const alimentacao = catalogo.processoById[outros[0].processoId]?.alimentacao;
    return compativeis.filter((processo) => processo.alimentacao === alimentacao);
  };
  const aplicacao = aplicacaoDoFormato(input.formato);
  const sugestaoId = processoSugerido(catalogo, input);
  const sugestao = catalogo.processoById[sugestaoId];
  const emFolha = input.grupos.some((grupo) => catalogo.processoById[grupo.processoId]?.alimentacao === "folha");

  const mudarFormato = (formato: Formato) => {
    const next: QuoteInput = { ...input, formato };
    const novoAplicacao = aplicacaoDoFormato(formato);
    if (formato === "Cartonado" && catalogo.estruturaById["cartao-duplex"]) {
      next.estruturaId = "cartao-duplex";
    } else if (input.formato === "Cartonado" && input.estruturaId === "cartao-duplex") {
      next.estruturaId = "pet-pe";
    }
    const compativel = next.grupos.every((grupo) => {
      const processo = catalogo.processoById[grupo.processoId];
      return processo?.aplicacoes.includes(novoAplicacao) ?? false;
    });
    const primeiro = catalogo.processoById[next.grupos[0]?.processoId ?? ""];
    const jaSugerido = primeiro?.sugeridoPara.includes(novoAplicacao) ?? false;
    if (!compativel || (novoAplicacao === "cartonado" && !jaSugerido)) {
      const processoId = processoSugerido(catalogo, next);
      next.grupos = [{ ...(next.grupos[0] ?? { numCores: 4, numBranco: 0, numEspeciais: 0, processoId }), processoId }];
      next.passagem = "linha";
    }
    onChange(next);
  };

  const atualizarGrupo = (index: number, patch: Partial<GrupoImpressao>) => {
    const grupos = input.grupos.map((grupo, i) => {
      if (i !== index) return grupo;
      const next = { ...grupo, ...patch };
      if (next.numBranco + next.numEspeciais > next.numCores) next.numCores = next.numBranco + next.numEspeciais;
      return next;
    });
    onChange({ ...input, grupos });
  };

  const adicionarGrupo = () => {
    const alimentacao = catalogo.processoById[input.grupos[0]?.processoId ?? ""]?.alimentacao;
    const mesmaAlimentacao = compativeis.filter((processo) => processo.alimentacao === alimentacao);
    const usados = new Set(input.grupos.map((grupo) => grupo.processoId));
    const outro = mesmaAlimentacao.find((processo) => !usados.has(processo.id)) ?? mesmaAlimentacao[0];
    if (!outro) return;
    onChange({
      ...input,
      passagem: "linha",
      grupos: [...input.grupos, { processoId: outro.id, numCores: 1, numBranco: 1, numEspeciais: 0 }],
    });
  };

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Produto e volume</h2>
        <p>Estrutura, processo e preço</p>
      </header>

      <div className="grid-2">
        <Field label="Formato">
          <select value={input.formato} onChange={(e) => mudarFormato(e.target.value as Formato)}>
            {FORMATOS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="Estrutura">
          <select value={input.estruturaId} onChange={(e) => set("estruturaId", e.target.value)}>
            {catalogo.estruturas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Zipper">
          <select value={input.zipper} onChange={(e) => set("zipper", e.target.value as QuoteInput["zipper"])}>
            {ZIPPERS.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
        </Field>
        <Field label="Válvula">
          <select value={input.valvula} onChange={(e) => set("valvula", e.target.value as QuoteInput["valvula"])}>
            {SIM_NAO.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Bico">
          <select value={input.bico} onChange={(e) => set("bico", e.target.value as QuoteInput["bico"])}>
            {SIM_NAO.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Verniz">
          <select value={input.verniz} onChange={(e) => set("verniz", e.target.value as QuoteInput["verniz"])}>
            {VERNIZES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Largura (mm)">
          <input type="number" min={1} value={input.larguraMm} onChange={(e) => set("larguraMm", Number(e.target.value))} />
        </Field>
        <Field label="Altura (mm)">
          <input type="number" min={1} value={input.alturaMm} onChange={(e) => set("alturaMm", Number(e.target.value))} />
        </Field>
        <Field label="Profundidade (mm)">
          <input
            type="number"
            min={0}
            value={input.profundidadeMm}
            onChange={(e) => set("profundidadeMm", Number(e.target.value))}
          />
        </Field>
        <Field label="Gramatura (g/m²)">
          <input
            type="number"
            min={0}
            placeholder="padrão da estrutura"
            value={input.gramatura ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const next = { ...input };
              if (v === "") delete next.gramatura;
              else next.gramatura = Number(v);
              onChange(next);
            }}
          />
        </Field>
      </div>

      <h3 className="subhead">Impressão</h3>
      {input.grupos.map((grupo, index) => (
        <div className="grid-2" key={index}>
          <Field label={input.grupos.length > 1 ? `Processo ${index + 1}` : "Processo"} wide>
            <select value={grupo.processoId} onChange={(e) => atualizarGrupo(index, { processoId: e.target.value })}>
              {alimentacaoDoGrupo(index).map((processo) => (
                <option key={processo.id} value={processo.id}>
                  {processo.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cores (total)">
            <input
              type="number"
              min={0}
              value={grupo.numCores}
              onChange={(e) => atualizarGrupo(index, { numCores: Number(e.target.value) })}
            />
          </Field>
          <Field label="Branco">
            <input
              type="number"
              min={0}
              value={grupo.numBranco}
              onChange={(e) => atualizarGrupo(index, { numBranco: Number(e.target.value) })}
            />
          </Field>
          <Field label="Especiais">
            <input
              type="number"
              min={0}
              value={grupo.numEspeciais}
              onChange={(e) => atualizarGrupo(index, { numEspeciais: Number(e.target.value) })}
            />
          </Field>
          {input.grupos.length > 1 && (
            <div className="field">
              <span>Grupo</span>
              <button type="button" className="btn-ghost" onClick={() => set("grupos", input.grupos.filter((_, i) => i !== index))}>
                Remover grupo
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="proposta-actions">
        <button type="button" className="btn-secondary" onClick={adicionarGrupo}>
          Adicionar grupo (híbrido em linha)
        </button>
        {aplicacao === "cartonado" && sugestao && input.grupos[0]?.processoId !== sugestaoId && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => atualizarGrupo(0, { processoId: sugestaoId })}
          >
            Usar {sugestao.nome} (menor custo neste lote)
          </button>
        )}
      </div>
      <p className="hint">
        {emFolha
          ? "Máquina a folha: a imposição usa o formato máximo, com pinça e margens. O cartonado sugere a folha de menor custo."
          : "Híbrido em linha soma ferramental, setup e tinta. A banda roda uma vez, na menor velocidade, com a hora das máquinas somada."}
        {aplicacao === "flexivel" ? " Offset em flexível é permitido e não é o padrão sugerido." : ""}
      </p>

      <div className="grid-2">
        {input.grupos.length > 1 && (
          <Field label="Passagem">
            <select value={input.passagem} onChange={(e) => set("passagem", e.target.value as QuoteInput["passagem"])}>
              {PASSAGENS.map((modo) => (
                <option key={modo} value={modo}>
                  {modo === "linha" ? "Em linha (uma passada)" : "Passagens separadas"}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Ferramental">
          <select
            value={input.ferramentalModo}
            onChange={(e) => set("ferramentalModo", e.target.value as QuoteInput["ferramentalModo"])}
          >
            {MODOS_FERRAMENTAL.map((modo) => (
              <option key={modo} value={modo}>
                {modo === "diluido" ? "Diluído no lote" : "Cobrado à parte"}
              </option>
            ))}
          </select>
        </Field>
        {!emFolha && (
          <>
            <Field label="Pistas">
              <input type="number" min={1} value={input.pistas} onChange={(e) => set("pistas", Number(e.target.value))} />
            </Field>
            <Field label="Passo (mm)">
              <input
                type="number"
                min={0}
                placeholder="altura + vão"
                value={input.passoMm}
                onChange={(e) => set("passoMm", Number(e.target.value))}
              />
            </Field>
          </>
        )}
      </div>

      <h3 className="subhead">Volume e comercial</h3>
      <div className="grid-2">
        <Field label="Modo de volume">
          <select
            value={input.volumeMode}
            onChange={(e) => set("volumeMode", e.target.value as QuoteInput["volumeMode"])}
          >
            {VOLUME_MODES.map((m) => (
              <option key={m} value={m}>
                {m === "unidades" ? "Unidades" : "Quilogramas"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Volume base (unidades)">
          <input
            type="number"
            min={1}
            value={input.volumeUnidades}
            onChange={(e) => set("volumeUnidades", Number(e.target.value))}
          />
        </Field>
        <Field label="Volume base (kg)">
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={input.volumeKg}
            onChange={(e) => set("volumeKg", Number(e.target.value))}
          />
        </Field>
        <Field label="Markup (fração)">
          <input type="number" min={0} step={0.01} value={input.mkup} onChange={(e) => set("mkup", Number(e.target.value))} />
        </Field>
        <Field label="Comissão (fração)">
          <input
            type="number"
            min={0}
            max={0.99}
            step={0.01}
            value={input.comissao}
            onChange={(e) => set("comissao", Number(e.target.value))}
          />
        </Field>
      </div>
    </section>
  );
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "field field-wide" : "field"}>
      <span>{label}</span>
      {children}
    </label>
  );
}
