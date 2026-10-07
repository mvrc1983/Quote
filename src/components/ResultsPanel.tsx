import { custoVariavelUn } from "../lib/costing";
import { formatBRL, formatNumber } from "../lib/format";
import type { QuoteInput, QuoteResult } from "../types";
import { isLoteKg } from "../types";

type Props = {
  input: QuoteInput;
  quote: QuoteResult;
};

export function ResultsPanel({ input, quote }: Props) {
  const { breakdown, estrutura, lotes } = quote;
  const modeKg = input.volumeMode === "kg";

  return (
    <section className="panel panel-results">
      <header className="panel-head">
        <h2>Cálculo</h2>
        <p>
          {estrutura.nome} · {quote.processoNome} · {formatNumber(breakdown.gramatura, 0)} g/m²
        </p>
      </header>

      <dl className="metrics">
        <div>
          <dt>Área / un</dt>
          <dd>{formatNumber(breakdown.areaM2, 4)} m²</dd>
        </div>
        <div>
          <dt>Peso / un</dt>
          <dd>{formatNumber(breakdown.pesoUnKg * 1000, 2)} g</dd>
        </div>
        <div>
          <dt>Custo variável / un</dt>
          <dd>{formatBRL(custoVariavelUn(breakdown))}</dd>
        </div>
        <div>
          <dt>Setup</dt>
          <dd>{formatBRL(breakdown.setupTotal)}</dd>
        </div>
        <div>
          <dt>Ferramental</dt>
          <dd>
            {formatBRL(breakdown.ferramentalNoLote ? breakdown.ferramental : quote.ferramentalAParte)}
            {breakdown.ferramentalNoLote ? "" : " à parte"}
          </dd>
        </div>
        {breakdown.poses > 0 && (
          <div>
            <dt>Imposição</dt>
            <dd>
              {breakdown.poses} {breakdown.poses === 1 ? "pose" : "poses"} · {formatNumber(breakdown.folhaLarguraMm, 0)}×{formatNumber(breakdown.folhaAlturaMm, 0)} mm
            </dd>
          </div>
        )}
      </dl>
      {breakdown.avisos.length > 0 &&
        breakdown.avisos.map((aviso) => (
          <p className="warn" key={aviso}>
            {aviso}
          </p>
        ))}

      <table className="price-table">
        <thead>
          <tr>
            <th>{modeKg ? "Lote (kg)" : "Lote (un)"}</th>
            <th>{modeKg ? "NET / kg" : "NET / un"}</th>
            <th>{modeKg ? "c/ imp. / kg" : "c/ imp. / un"}</th>
            <th>Total NET</th>
            <th>Total c/ imp.</th>
          </tr>
        </thead>
        <tbody>
          {lotes.map((lote, i) => {
            const qty = isLoteKg(lote.lote) ? lote.lote.kg : lote.lote.unidades;
            return (
              <tr key={i}>
                <td>{formatNumber(qty, 0)}</td>
                <td>{formatBRL(modeKg ? lote.netKg : lote.netUn)}</td>
                <td>{formatBRL(modeKg ? lote.comImpostosKg : lote.comImpostosUn)}</td>
                <td>{formatBRL(lote.netTotal)}</td>
                <td>{formatBRL(lote.comImpostosTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
