import { useMemo, useState } from "react";

type ChargerKey = "witty_plus" | "witty_pro";
type TechDoc = { id: string; title: string; url: string };
type ChargerDocs = { key: ChargerKey; name: string; docs: TechDoc[] };

const CHARGERS: ChargerDocs[] = [
  {
    key: "witty_plus",
    name: "Witty Plus",
    docs: [
      { id: "witty-plus-1", title: "Witty Plus — Document 1", url: "/docs-technique/witty-plus/witty-plus-1.pdf" },
      { id: "witty-plus-2", title: "Witty Plus — Document 2", url: "/docs-technique/witty-plus/witty-plus-2.pdf" },
    ],
  },
  {
    key: "witty_pro",
    name: "Witty Pro",
    docs: [
      { id: "witty-pro-1", title: "Witty Pro — Document 1", url: "/docs-technique/witty-pro/witty-pro-1.pdf" },
      { id: "witty-pro-2", title: "Witty Pro — Document 2", url: "/docs-technique/witty-pro/witty-pro-2.pdf" },
    ],
  },
];

/** Documentation technique par borne. */
export function DocsTechniquePage() {
  const [selectedCharger, setSelectedCharger] = useState<ChargerKey | null>(null);
  const selectedSet = useMemo(
    () => CHARGERS.find((c) => c.key === selectedCharger) ?? null,
    [selectedCharger]
  );
  const [selectedDocId, setSelectedDocId] = useState("");

  const selectedDoc = useMemo(
    () => (selectedSet ? selectedSet.docs.find((doc) => doc.id === selectedDocId) ?? selectedSet.docs[0] : null),
    [selectedDocId, selectedSet]
  );

  function chooseCharger(key: ChargerKey) {
    const next = CHARGERS.find((item) => item.key === key);
    if (!next) return;
    setSelectedCharger(key);
    setSelectedDocId(next.docs[0]?.id ?? "");
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Documentation technique</h1>
      <p style={{ color: "var(--color-muted)" }}>
        Sélectionnez une borne pour afficher uniquement les documents techniques correspondants.
      </p>

      {!selectedSet ? (
        <div className="card" style={{ marginBottom: "0.85rem" }}>
          <h2 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Liste des bornes</h2>
          <div style={{ display: "grid", gap: "0.65rem", maxWidth: 360 }}>
            {CHARGERS.map((charger) => (
              <button
                key={charger.key}
                type="button"
                className="btn btn-primary"
                onClick={() => chooseCharger(charger.key)}
              >
                {charger.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
            <h2 style={{ marginTop: 0, marginBottom: "0.5rem" }}>{selectedSet.name} — Documents</h2>
            <button type="button" className="btn btn-ghost" onClick={() => setSelectedCharger(null)}>
              ← Retour à la liste des bornes
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            {selectedSet.docs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                className={selectedDoc?.id === doc.id ? "btn btn-primary" : "btn btn-ghost"}
                onClick={() => setSelectedDocId(doc.id)}
              >
                {doc.title}
              </button>
            ))}
          </div>

          {selectedDoc ? (
            <>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                <a href={selectedDoc.url} className="btn btn-primary" target="_blank" rel="noreferrer">
                  Ouvrir ce document
                </a>
                <a href={selectedDoc.url} className="btn btn-ghost" download>
                  Télécharger
                </a>
              </div>
              <iframe
                src={`${selectedDoc.url}#view=FitH&toolbar=0&navpanes=0`}
                title={selectedDoc.title}
                style={{ width: "100%", minHeight: "68vh", border: "1px solid var(--color-border)", borderRadius: 12 }}
              />
            </>
          ) : (
            <p style={{ margin: 0, color: "var(--color-muted)" }}>Aucun document disponible pour cette borne.</p>
          )}
        </div>
      )}
    </div>
  );
}
