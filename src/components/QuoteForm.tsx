import type { ReactNode } from "react";
import type { Catalogo } from "../config/catalogo";
import type { QuoteInput } from "../types";
import { FORMATOS, SIM_NAO, VERNIZES, VOLUME_MODES, ZIPPERS } from "../types";

type Props = {
  catalogo: Catalogo;
  input: QuoteInput;
  onChange: (next: QuoteInput) => void;
};

export function QuoteForm({ catalogo, input, onChange }: Props) {
  const set = <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => onChange({ ...input, [key]: value });

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Produto e volume</h2>
        <p>Estrutura, consumo e preço</p>
      </header>

      <div className="grid-2">
        <Field label="Formato">
          <select value={input.formato} onChange={(e) => set("formato", e.target.value as QuoteInput["formato"])}>
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
        <Field label="Impressão" wide>
          <select value={input.tipoImpressao} onChange={(e) => set("tipoImpressao", e.target.value)}>
            {catalogo.tintas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
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
