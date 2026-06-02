import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { SeoHead } from "../components/SeoHead";
import { connexionDemoHint } from "../data/demoAccounts";
import { useAuth } from "../context/AuthContext";
import { buildPageTitle } from "../lib/seo";

export function ConnexionPage() {
  const { user, login, ready } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!ready) {
    return (
      <div className="container" style={{ padding: "3rem 0" }}>
        <p>Vérification de la session…</p>
      </div>
    );
  }
  if (user) return <Navigate to="/app" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (await login(username, password)) {
        navigate("/app", { replace: true });
        return;
      }
      setError(`Identifiants invalides. ${connexionDemoHint()} Après un seed, relancez « npm run db:seed » si besoin.`);
    } catch (err) {
      const msg = err instanceof Error && err.message === "server" ? "server" : "network";
      setError(
        msg === "server"
          ? "Erreur serveur à la connexion. Relancez « npm run dev » (l’API sur le port 3001 doit être démarrée)."
          : "Impossible de joindre l’API (port 3001). Relancez « npm run dev » et vérifiez que le terminal affiche « API ItelecCharge — http://localhost:3001 »."
      );
    }
  }

  return (
    <>
      <SeoHead
        title={buildPageTitle("Connexion espace pro")}
        description="Accès réservé aux équipes ITELEC CHARGE."
        path="/connexion"
        noindex
      />
      <div className="connexion-page-wrap">
      <div className="container connexion-page-inner">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Connexion espace pro</h1>
        <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
          {connexionDemoHint()} Les comptes sont créés / mis à jour par <code>npm run db:seed</code> (mot de passe
          haché en base).
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
    </div>
    </>
  );
}
