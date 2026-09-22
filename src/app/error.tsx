"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="empty" role="alert">
      <h1>Algo saiu do lugar</h1>
      <p>{error.message || "Tente de novo em instantes."}</p>
      <button type="button" className="btn btn-primary" onClick={reset}>Tentar de novo</button>
    </div>
  );
}
