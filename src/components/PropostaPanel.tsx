import type { ReactNode } from "react";
import type { Lote, PropostaInput, VolumeMode } from "../types";
import { FORMAS_PAGAMENTO, isLoteKg } from "../types";
import { isPropostaComplete, propostaMissingFields } from "../lib/proposta";

type Props = {
  proposta: PropostaInput;
  volumeMode: VolumeMode;
  onChange: (next: PropostaInput) => void;
  onGenerate: () => void;
};

export function PropostaPanel({ proposta, volumeMode, onChange, onGenerate }: Props) {
  const set = <K extends keyof PropostaInput>(key: K, value: PropostaInput[K]) =>
    onChange({ ...proposta, [key]: value });

  const ready = isPropostaComplete(proposta, volumeMode);
  const missing = propostaMissingFields(proposta, volumeMode);

  const updateLote = (index: number, qty: number) => {
    const lotes = proposta.lotes.map((lote, i) => {
      if (i !== index) return lote;
      return volumeMode === "kg" ? { kg: qty } : { unidades: qty };
    });
    onChange({ ...proposta, lotes });
  };

  const addLote = () => {
    const extra: Lote = volumeMode === "kg" ? { kg: 100 } : { unidades: 1000 };
    onChange({ ...proposta, lotes: [...proposta.lotes, extra] });
  };

  const removeLote = (index: number) => {
    onChange({ ...proposta, lotes: proposta.lotes.filter((_, i) => i !== index) });
  };

  return (
    <section className="panel panel-proposta">
      <header className="panel-head">
        <h2>Proposta comercial</h2>
        <p>Dados do cliente e lotes para o PDF</p>
      </header>

      <div className="grid-2">
        <Field label="Cliente" wide>
          <input value={proposta.cliente} onChange={(e) => set("cliente", e.target.value)} />
        </Field>
        <Field label="Contato">
          <input value={proposta.contato} onChange={(e) => set("contato", e.target.value)} />
        </Field>
        <Field label="Data">
          <input value={proposta.data} onChange={(e) => set("data", e.target.value)} />
        </Field>
        <Field label="Especificação" wide>
          <input value={proposta.espec} onChange={(e) => set("espec", e.target.value)} />
        </Field>
        <Field label="Local de entrega">
          <input value={proposta.localEntrega} onChange={(e) => set("localEntrega", e.target.value)} />
        </Field>
        <Field label="Estado">
          <input value={proposta.estado} onChange={(e) => set("estado", e.target.value)} />
        </Field>
        <Field label="Frete">
          <input value={proposta.frete} onChange={(e) => set("frete", e.target.value)} />
        </Field>
        <Field label="Lead time">
          <input value={proposta.leadTime} onChange={(e) => set("leadTime", e.target.value)} />
        </Field>
        <Field label="Validade">
          <input value={proposta.validade} onChange={(e) => set("validade", e.target.value)} />
        </Field>
        <Field label="Forma de pagamento">
          <select
            value={proposta.formaPagamento}
            onChange={(e) => set("formaPagamento", e.target.value as PropostaInput["formaPagamento"])}
          >
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="Prazo (meses)">
          <input
            type="number"
            min={0}
            value={proposta.prazo}
            onChange={(e) => set("prazo", Number(e.target.value))}
          />
        </Field>
        <Field label="Taxa ao mês (fração)">
          <input
            type="number"
            step={0.001}
            value={proposta.taxaPagamentoMes}
            onChange={(e) => set("taxaPagamentoMes", Number(e.target.value))}
          />
        </Field>
        <Field label="Taxa cartão (fração)">
          <input
            type="number"
            step={0.0001}
            value={proposta.taxaCartao}
            onChange={(e) => set("taxaCartao", Number(e.target.value))}
          />
        </Field>
        <Field label="PIS/COFINS (fração)">
          <input
            type="number"
            step={0.0001}
            value={proposta.pisCofins}
            onChange={(e) => set("pisCofins", Number(e.target.value))}
          />
        </Field>
        <Field label="ICMS (fração)">
          <input
            type="number"
            step={0.0001}
            value={proposta.icms}
            onChange={(e) => set("icms", Number(e.target.value))}
          />
        </Field>
        <Field label="IPI (fração)">
          <input
            type="number"
            step={0.0001}
            value={proposta.ipi}
            onChange={(e) => set("ipi", Number(e.target.value))}
          />
        </Field>
        <Field label="Observações" wide>
          <textarea
            rows={3}
            value={proposta.observacoes}
            onChange={(e) => set("observacoes", e.target.value)}
          />
        </Field>
      </div>

      <h3 className="subhead">Lotes ({volumeMode === "kg" ? "kg" : "unidades"})</h3>
      <div className="lotes">
        {proposta.lotes.map((lote, i) => (
            <div className="lote-row" key={i}>
            <input
              type="number"
              min={1}
              value={isLoteKg(lote) ? lote.kg : lote.unidades}
              onChange={(e) => updateLote(i, Number(e.target.value))}
              aria-label={`Lote ${i + 1}`}
            />
            <span>{volumeMode === "kg" ? "kg" : "un"}</span>
            <button type="button" className="ghost" onClick={() => removeLote(i)} disabled={proposta.lotes.length <= 1}>
              remover
            </button>
          </div>
        ))}
        <button type="button" className="ghost" onClick={addLote}>
          + adicionar lote
        </button>
      </div>

      <div className="proposta-actions">
        <button type="button" className="btn-primary" disabled={!ready} onClick={onGenerate}>
          Gerar proposta
        </button>
        {!ready && (
          <p className="hint">Preencha: {missing.join(", ")} para liberar o PDF.</p>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "field field-wide" : "field"}>
      <span>{label}</span>
      {children}
    </label>
  );
}
