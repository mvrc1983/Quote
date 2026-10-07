import { useMemo, useRef, useState } from "react";
import { Banner } from "./components/Banner";
import { DraftsBar } from "./components/DraftsBar";
import { PropostaPanel } from "./components/PropostaPanel";
import { QuoteForm } from "./components/QuoteForm";
import { ResultsPanel } from "./components/ResultsPanel";
import { catalogoExemplo, propostaPadrao, quoteInputPadrao } from "./config/catalogo";
import { computeQuote } from "./lib/costing";
import { loadDrafts, saveDrafts, upsertDraft, type Draft } from "./lib/drafts";
import { importTemplate } from "./lib/importTemplate";
import { defaultLotesForVolumeMode, lotesMatchVolumeMode, normalizeProposta } from "./lib/proposta";
import { generatePropostaPdf } from "./lib/propostaPdf";
import type { PropostaInput, QuoteInput } from "./types";

const catalogo = catalogoExemplo;

export default function App() {
  const inputInicial = quoteInputPadrao(catalogo);
  const [input, setInput] = useState<QuoteInput>(inputInicial);
  const [proposta, setProposta] = useState<PropostaInput>(() =>
    normalizeProposta(catalogo, propostaPadrao(catalogo), inputInicial.volumeMode),
  );
  const [drafts, setDrafts] = useState<Draft[]>(() => (typeof localStorage === "undefined" ? [] : loadDrafts()));
  const [banner, setBanner] = useState<{ type: "ok" | "err"; message: string } | null>(null);
  // Reusa o id para atualizar o rascunho aberto. Sem isso, cada salvar cria outro.
  const draftIdRef = useRef<string | undefined>(undefined);

  const quote = useMemo(() => computeQuote(catalogo, input, proposta), [input, proposta]);

  const handleInput = (next: QuoteInput) => {
    setInput(next);
    if (next.volumeMode !== input.volumeMode || !lotesMatchVolumeMode(proposta.lotes, next.volumeMode)) {
      setProposta((prev) => ({ ...prev, lotes: defaultLotesForVolumeMode(catalogo, next.volumeMode) }));
    }
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const result = importTemplate(text, catalogo, file.name);
    if (!result.ok) {
      setBanner({
        type: "err",
        message: `Template inválido — corrija os campos:\n${result.errors.join("\n")}`,
      });
      return;
    }
    draftIdRef.current = undefined;
    setInput(result.input);
    setProposta(result.proposta);
    setBanner({ type: "ok", message: "Template carregado — revise e gere a proposta" });
  };

  const handleSaveDraft = () => {
    const updating = draftIdRef.current != null;
    const id = draftIdRef.current ?? crypto.randomUUID();
    draftIdRef.current = id;
    const next = upsertDraft(drafts, input, proposta, id);
    setDrafts(next);
    saveDrafts(next);
    setBanner({
      type: "ok",
      message: updating ? "Rascunho atualizado neste navegador" : "Rascunho salvo neste navegador",
    });
  };

  const handleLoadDraft = (id: string) => {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    draftIdRef.current = id;
    setInput(draft.input);
    setProposta(normalizeProposta(catalogo, draft.proposta, draft.input.volumeMode));
    setBanner({ type: "ok", message: `Rascunho “${draft.nome}” restaurado` });
  };

  const handleDeleteDraft = (id: string) => {
    if (draftIdRef.current === id) draftIdRef.current = undefined;
    const next = drafts.filter((d) => d.id !== id);
    setDrafts(next);
    saveDrafts(next);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand">
            <span className="brand-mark">Q</span>
            <div>
              <p className="brand-kicker">{catalogo.empresa.nome}</p>
              <h1>Quote</h1>
            </div>
          </div>
          {catalogo.exemplo ? <p className="example-flag">{catalogo.aviso}</p> : null}
        </div>
        <p className="topbar-note">Importe o template, revise o cálculo e gere a proposta em PDF.</p>
      </header>

      <DraftsBar
        drafts={drafts}
        onSave={handleSaveDraft}
        onLoad={handleLoadDraft}
        onDelete={handleDeleteDraft}
        onImportFile={handleImportFile}
      />

      {banner && <Banner type={banner.type} message={banner.message} onClose={() => setBanner(null)} />}

      <main className="layout">
        <QuoteForm catalogo={catalogo} input={input} onChange={handleInput} />
        <div className="stack">
          <ResultsPanel input={input} quote={quote} />
          <PropostaPanel
            proposta={proposta}
            volumeMode={input.volumeMode}
            onChange={setProposta}
            onGenerate={() => generatePropostaPdf(catalogo, input, proposta, quote)}
          />
        </div>
      </main>
    </div>
  );
}
