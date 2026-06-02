import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: string) => { promise: Promise<PdfDocument> };
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy?: () => void;
};

type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => {
    promise: Promise<void>;
  };
};

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
  }
}

const SCRIPT_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const WORKER_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const FLIP_DURATION_MS = 620;
const PAGE_SWAP_AT_MS = Math.round(FLIP_DURATION_MS * 0.48);
const FLYER_SCALE_FACTOR = 1.1;
const FLYER_SCALE_FULLSCREEN_FACTOR = 1.0;
const MAX_CANVAS_PIXELS = 6_000_000;

type FlipDirection = "next" | "prev" | null;
type BookMode = "cover" | "spread" | "back";

function PageCanvas({
  pdf,
  pageNumber,
  className,
  scaleFactor = FLYER_SCALE_FACTOR,
}: {
  pdf: PdfDocument | null;
  pageNumber: number | null;
  className: string;
  scaleFactor?: number;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let raf = 0;

    async function renderPage() {
      if (!pdf || !pageNumber || !hostRef.current || !canvasRef.current) return;
      const page = await pdf.getPage(pageNumber);
      if (cancelled || !hostRef.current || !canvasRef.current) return;

      const hostWidth = Math.max(260, hostRef.current.clientWidth - 6);
      const hostHeight = Math.max(320, hostRef.current.clientHeight - 6);
      const initial = page.getViewport({ scale: 1 });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const fitScale = Math.min(hostWidth / initial.width, hostHeight / initial.height);
      const maxSafeScale = Math.sqrt(MAX_CANVAS_PIXELS / (initial.width * initial.height));
      const requestedScale = fitScale * scaleFactor;
      const safeScale = Math.max(0.2, Math.min(requestedScale, maxSafeScale));

      async function draw(scaleToUse: number) {
        const viewport = page.getViewport({ scale: scaleToUse });
        const workCanvas = document.createElement("canvas");
        workCanvas.width = Math.floor(viewport.width);
        workCanvas.height = Math.floor(viewport.height);
        const workCtx = workCanvas.getContext("2d");
        if (!workCtx) return;
        await page.render({ canvasContext: workCtx as CanvasRenderingContext2D, viewport }).promise;
        if (cancelled) return;
        canvas.width = workCanvas.width;
        canvas.height = workCanvas.height;
        const displayCtx = canvas.getContext("2d");
        if (!displayCtx) return;
        displayCtx.clearRect(0, 0, canvas.width, canvas.height);
        displayCtx.drawImage(workCanvas, 0, 0);
      }

      try {
        await draw(safeScale);
      } catch {
        // Fallback immédiat vers un rendu "fit" pour éviter les pages invisibles.
        await draw(fitScale);
      }
    }

    void renderPage();

    if (hostRef.current) {
      resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          void renderPage();
        });
      });
      resizeObserver.observe(hostRef.current);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
    };
  }, [pdf, pageNumber, scaleFactor]);

  return (
    <article className={className} ref={hostRef}>
      {pageNumber ? <canvas ref={canvasRef} /> : <div className="docs-book-empty-page" />}
    </article>
  );
}

export function DocsPage() {
  const [pdf, setPdf] = useState<PdfDocument | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [flipDirection, setFlipDirection] = useState<FlipDirection>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const dragEndX = useRef<number | null>(null);
  const swapTimerRef = useRef<number | null>(null);
  const endFlipTimerRef = useRef<number | null>(null);
  const fullscreenOverlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let injectedScript: HTMLScriptElement | null = null;
    async function loadPdf() {
      try {
        if (!window.pdfjsLib) {
          injectedScript = document.createElement("script");
          injectedScript.src = SCRIPT_SRC;
          injectedScript.async = true;
          document.head.appendChild(injectedScript);
          await new Promise<void>((resolve, reject) => {
            injectedScript!.onload = () => resolve();
            injectedScript!.onerror = () => reject(new Error("Impossible de charger PDF.js"));
          });
        }
        if (!window.pdfjsLib || cancelled) return;
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;
        const doc = await window.pdfjsLib.getDocument("/folder-commercial.pdf").promise;
        if (cancelled) {
          doc.destroy?.();
          return;
        }
        setPdf(doc);
        setNumPages(doc.numPages);
        setLoadError(null);
      } catch {
        if (!cancelled) setLoadError("Le folder n’a pas pu se charger. Réessayez dans quelques secondes.");
      }
    }
    void loadPdf();
    return () => {
      cancelled = true;
      // Le script PDF.js est conservé une fois chargé pour éviter des réinitialisations instables.
      if (injectedScript) {
        injectedScript.onload = null;
        injectedScript.onerror = null;
      }
    };
  }, []);

  const interiorCount = Math.max(0, numPages - 2);
  const spreadCount = Math.ceil(interiorCount / 2);
  const maxSheetIndex = numPages > 1 ? spreadCount + 1 : 0;

  const mode: BookMode = useMemo(() => {
    if (numPages <= 1) return "cover";
    if (sheetIndex === 0) return "cover";
    if (sheetIndex === maxSheetIndex) return "back";
    return "spread";
  }, [maxSheetIndex, numPages, sheetIndex]);

  const { leftPage, rightPage, counterText } = useMemo(() => {
    if (numPages <= 0) return { leftPage: null, rightPage: null, counterText: "Chargement..." };
    if (mode === "cover") return { leftPage: 1, rightPage: null, counterText: "Couverture" };
    if (mode === "back") return { leftPage: numPages, rightPage: null, counterText: "Dernière page" };
    const spreadOffset = sheetIndex - 1;
    const left = 2 + spreadOffset * 2;
    const right = left + 1 <= numPages - 1 ? left + 1 : null;
    return {
      leftPage: left,
      rightPage: right,
      counterText: right ? `Pages ${left}-${right}` : `Page ${left}`,
    };
  }, [mode, numPages, sheetIndex]);

  const canPrev = sheetIndex > 0;
  const canNext = sheetIndex < maxSheetIndex;
  const isFlipping = flipDirection !== null;

  const clearFlipTimers = useCallback(() => {
    if (swapTimerRef.current != null) {
      window.clearTimeout(swapTimerRef.current);
      swapTimerRef.current = null;
    }
    if (endFlipTimerRef.current != null) {
      window.clearTimeout(endFlipTimerRef.current);
      endFlipTimerRef.current = null;
    }
  }, []);

  const previousSheet = useCallback(() => {
    if (!canPrev || isFlipping) return;
    clearFlipTimers();
    setFlipDirection("prev");
    swapTimerRef.current = window.setTimeout(() => {
      setSheetIndex((v) => Math.max(0, v - 1));
    }, PAGE_SWAP_AT_MS);
    endFlipTimerRef.current = window.setTimeout(() => {
      setFlipDirection(null);
      clearFlipTimers();
    }, FLIP_DURATION_MS);
  }, [canPrev, clearFlipTimers, isFlipping]);

  const nextSheet = useCallback(() => {
    if (!canNext || isFlipping) return;
    clearFlipTimers();
    setFlipDirection("next");
    swapTimerRef.current = window.setTimeout(() => {
      setSheetIndex((v) => Math.min(maxSheetIndex, v + 1));
    }, PAGE_SWAP_AT_MS);
    endFlipTimerRef.current = window.setTimeout(() => {
      setFlipDirection(null);
      clearFlipTimers();
    }, FLIP_DURATION_MS);
  }, [canNext, clearFlipTimers, isFlipping, maxSheetIndex]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && fullscreenOpen) {
        setFullscreenOpen(false);
        return;
      }
      if (event.key === "ArrowLeft") previousSheet();
      if (event.key === "ArrowRight") nextSheet();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreenOpen, nextSheet, previousSheet]);

  useEffect(() => () => clearFlipTimers(), [clearFlipTimers]);

  useEffect(() => {
    if (!fullscreenOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const target = fullscreenOverlayRef.current;
    if (target && document.fullscreenElement !== target && target.requestFullscreen) {
      void target.requestFullscreen().catch(() => {
        // Certains navigateurs peuvent refuser (permissions ou politique utilisateur).
      });
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      if (document.fullscreenElement && document.exitFullscreen) {
        void document.exitFullscreen().catch(() => {
          // Ignorer un éventuel refus de sortie fullscreen.
        });
      }
    };
  }, [fullscreenOpen]);

  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement && fullscreenOpen) {
        setFullscreenOpen(false);
      }
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [fullscreenOpen]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragStartX.current = event.clientX;
    dragEndX.current = event.clientX;
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStartX.current == null) return;
    dragEndX.current = event.clientX;
  }

  function onPointerUp() {
    const start = dragStartX.current;
    const end = dragEndX.current;
    dragStartX.current = null;
    dragEndX.current = null;
    if (start == null || end == null) return;
    const delta = end - start;
    if (delta <= -45) nextSheet();
    else if (delta >= 45) previousSheet();
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Documentation commerciale</h1>
      <p style={{ color: "var(--color-muted)" }}>
        Brochure commerciale disponible pour les équipes admin, dispatch, site survey, commerciales et
        techniciens.
      </p>

      <div
        className="card"
        style={{
          marginTop: "1rem",
          background: "linear-gradient(135deg, #003358 0%, #004d73 45%, #006837 100%)",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: "0.25rem", color: "#fff" }}>Folder commercial</h2>
            <p style={{ margin: 0, opacity: 0.92 }}>
              Navigation type livre : utilisez les flèches ou votre clavier.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-accent" onClick={() => setFullscreenOpen(true)}>
              Ouvrir en plein écran
            </button>
            <a
              className="btn btn-ghost"
              href="/folder-commercial.pdf"
              download
              style={{ color: "#fff", borderColor: "rgba(255,255,255,0.45)" }}
            >
              Télécharger
            </a>
          </div>
        </div>
      </div>

      <div className="card docs-book-card">
        <div className="docs-book-toolbar">
          <button type="button" className="btn btn-primary" onClick={previousSheet} disabled={!canPrev || isFlipping}>
            ← Tourner en arrière
          </button>
          <span className="docs-book-counter">{counterText}</span>
          <button type="button" className="btn btn-primary" onClick={nextSheet} disabled={!canNext || isFlipping}>
            Tourner en avant →
          </button>
        </div>

        <div
          className="docs-book-shell"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {loadError ? <div className="docs-book-error">{loadError}</div> : null}
          <button
            type="button"
            className="docs-book-hotzone docs-book-hotzone-left"
            onClick={previousSheet}
            aria-label="Tourner les pages vers l’arrière"
            disabled={!canPrev || isFlipping || !!loadError}
          />
          <button
            type="button"
            className="docs-book-hotzone docs-book-hotzone-right"
            onClick={nextSheet}
            aria-label="Tourner les pages vers l’avant"
            disabled={!canNext || isFlipping || !!loadError}
          />

          <div className={`docs-book-pages docs-book-pages-${mode}`}>
            <PageCanvas pdf={pdf} pageNumber={leftPage} className="docs-book-page docs-book-page-left" />
            <PageCanvas pdf={pdf} pageNumber={rightPage} className="docs-book-page docs-book-page-right" />
          </div>

          {isFlipping ? (
            <div
              className={`docs-book-flip-overlay ${
                flipDirection === "next" ? "docs-book-flip-next" : "docs-book-flip-prev"
              }`}
              aria-hidden
            />
          ) : null}
        </div>

        <p className="docs-book-help">
          Clique sur le bord droit/gauche ou glisse horizontalement pour tourner les pages.
        </p>
      </div>

      {fullscreenOpen ? (
        <div
          ref={fullscreenOverlayRef}
          className="docs-fullscreen-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Folder en plein écran"
        >
          <div className="docs-fullscreen-header">
            <strong>Folder commercial — Plein écran</strong>
            <button type="button" className="btn btn-ghost" onClick={() => setFullscreenOpen(false)}>
              Fermer
            </button>
          </div>
          <div className="docs-fullscreen-content">
            <div className="docs-book-toolbar">
              <button
                type="button"
                className="btn btn-primary"
                onClick={previousSheet}
                disabled={!canPrev || isFlipping}
              >
                ← Tourner en arrière
              </button>
              <span className="docs-book-counter">{counterText}</span>
              <button type="button" className="btn btn-primary" onClick={nextSheet} disabled={!canNext || isFlipping}>
                Tourner en avant →
              </button>
            </div>

            <div
              className="docs-book-shell docs-book-shell-fullscreen"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {loadError ? <div className="docs-book-error">{loadError}</div> : null}
              <button
                type="button"
                className="docs-book-hotzone docs-book-hotzone-left"
                onClick={previousSheet}
                aria-label="Tourner les pages vers l’arrière"
                disabled={!canPrev || isFlipping || !!loadError}
              />
              <button
                type="button"
                className="docs-book-hotzone docs-book-hotzone-right"
                onClick={nextSheet}
                aria-label="Tourner les pages vers l’avant"
                disabled={!canNext || isFlipping || !!loadError}
              />

              <div className={`docs-book-pages docs-book-pages-${mode}`}>
                <PageCanvas
                  pdf={pdf}
                  pageNumber={leftPage}
                  className="docs-book-page docs-book-page-left"
                  scaleFactor={FLYER_SCALE_FULLSCREEN_FACTOR}
                />
                <PageCanvas
                  pdf={pdf}
                  pageNumber={rightPage}
                  className="docs-book-page docs-book-page-right"
                  scaleFactor={FLYER_SCALE_FULLSCREEN_FACTOR}
                />
              </div>

              {isFlipping ? (
                <div
                  className={`docs-book-flip-overlay ${
                    flipDirection === "next" ? "docs-book-flip-next" : "docs-book-flip-prev"
                  }`}
                  aria-hidden
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
