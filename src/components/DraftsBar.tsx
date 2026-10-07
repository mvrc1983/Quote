import { useRef } from "react";
import type { Draft } from "../lib/drafts";

type Props = {
  drafts: Draft[];
  onSave: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onImportFile: (file: File) => void;
};

export function DraftsBar({ drafts, onSave, onLoad, onDelete, onImportFile }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="drafts-bar">
      <div className="drafts-actions">
        <button type="button" className="btn-secondary" onClick={onSave}>
          Salvar rascunho
        </button>
        <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
          Importar template
        </button>
        <a className="btn-ghost" href="/template-cotacao.json" download="template-cotacao.json">
          Baixar template em branco
        </a>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv,application/json,text/csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImportFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {drafts.length > 0 && (
        <ul className="draft-list">
          {drafts.map((d) => (
            <li key={d.id}>
              <button type="button" className="linkish" onClick={() => onLoad(d.id)}>
                {d.nome}
              </button>
              <span className="muted">{new Date(d.savedAt).toLocaleString("pt-BR")}</span>
              <button type="button" className="ghost" onClick={() => onDelete(d.id)}>
                excluir
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
