import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { SeoHead } from "../components/SeoHead";
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
      setError("Identifiants incorrects.");
    } catch (err) {
      const msg = err instanceof Error && err.message === "server" ? "server" : "network";
      setError(
        import.meta.env.DEV
          ? msg === "server"
            ? "Erreur serveur à la connexion. Vérifiez que l’API est démarrée (pnpm run dev)."
            : "Impossible de joindre l’API. Vérifiez que l’API est démarrée (pnpm run dev)."
          : "Connexion temporairement indisponible. Réessayez plus tard."
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
          Accès réservé aux comptes autorisés. En cas de difficulté, contactez votre administrateur.
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
