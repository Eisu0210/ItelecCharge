import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ConnexionPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (user) return <Navigate to="/app" replace />;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (login(username, password)) {
      navigate("/app", { replace: true });
    } else {
      setError("Identifiants invalides. Comptes démo : admin, commercial, installateur, dispatch — mot de passe ItelecCharge.");
    }
  }

  return (
    <div className="container" style={{ padding: "3rem 0", maxWidth: 440 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Connexion espace pro</h1>
        <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
          Comptes de démonstration (sans vérification) :{" "}
          <strong>admin</strong>, <strong>commercial</strong>, <strong>installateur</strong>,{" "}
          <strong>dispatch</strong> — mot de passe <code>ItelecCharge</code>.
        </p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="u">Identifiant</label>
            <input
              id="u"
              className="input"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="p">Mot de passe</label>
            <input
              id="p"
              type="password"
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? (
            <p style={{ color: "#c0392b", fontSize: "0.9rem" }} role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }}>
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
