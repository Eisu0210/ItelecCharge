import { useEffect, useRef, useState } from "react";

export function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#003358";
  }, []);

  function pos(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = ref.current!;
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function start(e: React.MouseEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    setEmpty(false);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = ref.current!;
    onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    onChange("");
  }

  return (
    <div className="signature-pad-wrap">
      <canvas
        ref={ref}
        width={440}
        height={160}
        style={{
          width: "100%",
          maxWidth: 440,
          height: 160,
          border: "1px dashed var(--color-border)",
          borderRadius: 8,
          background: "#fafbfc",
          cursor: "crosshair",
          touchAction: "none",
        }}
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={end}
        onMouseLeave={end}
      />
      <button type="button" className="btn btn-ghost" style={{ marginTop: "0.5rem" }} onClick={clear}>
        Effacer la signature
      </button>
      {empty ? (
        <p style={{ fontSize: "0.8rem", color: "var(--color-muted)", margin: "0.35rem 0 0" }}>
          Signature à la souris (pas d’Itsme dans cette démo).
        </p>
      ) : null}
    </div>
  );
}
