import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch, formatApiErrorMessage } from "../../lib/api";
import { ROLE_FR } from "../../data/demoAccounts";
import type { Role } from "../../types";
import "./users-page.css";
import "./compact-list-page.css";

const ALL_ROLES: Role[] = ["admin", "commercial", "installateur", "dispatch", "site_survey"];

type UserRow = {
  id: number;
  login: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
};

type CreateUserResponse = {
  user: {
    id: number;
    login: string;
    role: Role;
    firstName: string;
    lastName: string;
    createdAt: string;
  };
  initialPassword: string;
};

function rolePillClass(role: Role): string {
  const base = "users-page__role";
  const map: Record<Role, string> = {
    admin: "users-page__role--admin",
    commercial: "users-page__role--commercial",
    installateur: "users-page__role--installateur",
    dispatch: "users-page__role--dispatch",
    site_survey: "users-page__role--site_survey",
  };
  return `${base} ${map[role]}`;
}

/**
 * Comptes PostgreSQL `users` (API + JWT) — admin : création guidée, identifiants générés côté serveur.
 */
function isRowSelf(current: { id: number; username: string } | null, r: UserRow): boolean {
  if (!current) return false;
  if (r.id === current.id) return true;
  return r.login === current.username;
}

export function UsersPage() {
  const { user: current } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("installateur");
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [lastCreate, setLastCreate] = useState<CreateUserResponse | null>(null);
  const [copyHint, setCopyHint] = useState<"all" | "id" | "pass" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setErr(null);
    const data = await apiFetch<UserRow[]>("/api/users");
    setRows(data);
  }

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        if (!cancel) setErr(null);
        await load();
      } catch (e) {
        if (!cancel) {
          setErr(
            formatApiErrorMessage(
              e,
              "Chargement impossible. Vérifiez l’API et la base (DATABASE_URL, migrations)."
            )
          );
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  function showCopyHint(kind: "all" | "id" | "pass") {
    setCopyHint(kind);
    window.setTimeout(() => setCopyHint(null), 2000);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormErr(null);
    setLastCreate(null);
    if (!firstName.trim() || !lastName.trim()) {
      setFormErr("Renseignez le prénom et le nom.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<CreateUserResponse>("/api/users", {
        method: "POST",
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), role }),
      });
      setLastCreate(res);
      setFirstName("");
      setLastName("");
      setRole("installateur");
    } catch (e) {
      setFormErr(
        formatApiErrorMessage(
          e,
          "Création impossible. Vérifiez la base (migration) et la configuration."
        )
      );
    } finally {
      setSaving(false);
    }
    try {
      await load();
    } catch {
      setErr("Compte peut-être créé, mais le rechargement de la liste a échoué.");
    }
  }

  const listTitle =
    rows.length === 0 && !loading ? "Aucun compte" : rows.length === 1 ? "1 compte" : `${rows.length} comptes`;

  async function confirmDeleteUser() {
    if (!deleteTarget) return;
    setDeleteErr(null);
    setDeleting(true);
    const removedId = deleteTarget.id;
    try {
      await apiFetch<void>(`/api/users/${removedId}`, { method: "DELETE" });
      setDeleteTarget(null);
      setLastCreate((prev) => (prev && prev.user.id === removedId ? null : prev));
      await load();
    } catch (e) {
      setDeleteErr(formatApiErrorMessage(e, "Suppression impossible."));
    } finally {
      setDeleting(false);
    }
  }


  return (
    <div className="users-page">
      <header className="users-page__header">
        <h1>Utilisateurs</h1>
        <p className="users-page__lede">Création de comptes, attribution des rôles et aperçu de tous les accès.</p>
        <details className="users-page__details">
          <summary>Règles de génération automatique</summary>
          <div className="users-page__rules-body">
            <p>
              L’<strong>identifiant de connexion</strong> est généré automatiquement : <strong>1ʳᵉ lettre du nom
              (majuscule)</strong> + <strong>prénom</strong> avec sa 1ʳᵉ lettre en majuscule, sans accents (ex.{" "}
              <code>Mathieu</code> <code>Hopengarten</code> → <code>HMathieu</code>, sans chiffre dans
              l’identifiant). Rien n’est ajouté après le prénom : si ce couple nom / prénom existe déjà, la création
              est refusée. La connexion reste indifférente à la casse.
            </p>
            <p>
              Le <strong>mot de passe provisoire</strong> : 1ʳᵉ lettre du nom, 1ʳᵉ du prénom, puis le texte fixe{" "}
              <code>Itel</code>, puis 4 chiffres aléatoires. Il n’est affiché <strong>qu’une seule fois</strong> après
              la création.
            </p>
          </div>
        </details>
      </header>

      {err && !lastCreate ? (
        <p className="users-page__banner-err users-page__banner-err--page" role="alert">
          {err}
        </p>
      ) : null}

      <div
        className={`users-page__top${lastCreate ? " users-page__top--with-success" : ""}`}
      >
        <section className="card" aria-labelledby="users-create-title">
          <h2 id="users-create-title" className="users-page__panel-title">
            Nouveau compte
          </h2>
          <form onSubmit={onSubmit}>
            <div className="users-page__form-grid">
              <div className="field">
                <label htmlFor="user-firstname">Prénom</label>
                <input
                  id="user-firstname"
                  className="input"
                  value={firstName}
                  onChange={(ev) => setFirstName(ev.target.value)}
                  autoComplete="given-name"
                  placeholder="ex. Jean"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="user-lastname">Nom</label>
                <input
                  id="user-lastname"
                  className="input"
                  value={lastName}
                  onChange={(ev) => setLastName(ev.target.value)}
                  autoComplete="family-name"
                  placeholder="ex. Dupont"
                  required
                />
              </div>
              <div className="field users-page__field-full">
                <label htmlFor="user-role">Rôle d’accès</label>
                <select
                  id="user-role"
                  className="input"
                  value={role}
                  onChange={(ev) => setRole(ev.target.value as Role)}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_FR[r]}
                    </option>
                  ))}
                </select>
              </div>
              {formErr ? (
                <div className="users-page__field-full users-page__alert" role="alert">
                  {formErr}
                </div>
              ) : null}
              <div className="users-page__form-actions users-page__field-full">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Création en cours…" : "Enregistrer le compte"}
                </button>
              </div>
            </div>
          </form>
        </section>

        {lastCreate ? (
          <section
            className="card users-page__success"
            aria-live="polite"
            aria-labelledby="users-cred-title"
          >
            <h2 id="users-cred-title" className="users-page__success-title">
              Identifiants générés
            </h2>
            <p className="users-page__success-hint">
              Communiquez ces accès de façon sécurisée. Le mot de passe ne pourra plus être relu ici.
            </p>
            <div className="users-page__cred">
              <div className="users-page__cred-row">
                <span className="users-page__cred-label">Identifiant de connexion</span>
                <span className="users-page__cred-value" id="cred-login">
                  {lastCreate.user.login}
                </span>
                <button
                  type="button"
                  className="users-page__cred-copy"
                  onClick={async () => {
                    await navigator.clipboard.writeText(lastCreate.user.login);
                    showCopyHint("id");
                  }}
                >
                  {copyHint === "id" ? "Copié" : "Copier"}
                </button>
              </div>
              <div className="users-page__cred-row">
                <span className="users-page__cred-label">Mot de passe provisoire</span>
                <span className="users-page__cred-value" id="cred-pw">
                  {lastCreate.initialPassword}
                </span>
                <button
                  type="button"
                  className="users-page__cred-copy"
                  onClick={async () => {
                    await navigator.clipboard.writeText(lastCreate.initialPassword);
                    showCopyHint("pass");
                  }}
                >
                  {copyHint === "pass" ? "Copié" : "Copier"}
                </button>
              </div>
            </div>
            <div className="users-page__success-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  const text = `Identifiant : ${lastCreate.user.login}\nMot de passe : ${lastCreate.initialPassword}`;
                  await navigator.clipboard.writeText(text);
                  showCopyHint("all");
                }}
              >
                {copyHint === "all" ? "Tout copié" : "Tout copier (identifiant + mot de passe)"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setLastCreate(null)}>
                Fermer cet encart
              </button>
            </div>
          </section>
        ) : null}
      </div>

      <section className="card users-page__list" aria-labelledby="users-list-title">
        <div className="users-page__list-head">
          <h2 id="users-list-title" className="users-page__list-title">
            Comptes enregistrés
          </h2>
          <span className="users-page__list-meta" aria-live="polite">
            {loading ? "Chargement…" : listTitle}
          </span>
        </div>
        {err && lastCreate ? (
          <p className="users-page__banner-err" role="alert">
            {err}
          </p>
        ) : null}
        {loading ? (
          <p className="users-page__loading">Chargement de la liste…</p>
        ) : (
          <div className="users-page__table-wrap table-wrap table-wrap--stack-mobile table-wrap--stack-compact compact-list-table">
            {rows.length === 0 ? (
              <p className="users-page__empty">
                <strong>Aucun utilisateur</strong>
                Créez un compte ou exécutez le script de base de données (seed) pour les comptes de démonstration.
              </p>
            ) : (
              <table className="users-page__table">
                <thead>
                  <tr>
                    <th>Compte</th>
                    <th>Id</th>
                    <th>Personne</th>
                    <th>Identifiant</th>
                    <th>Rôle</th>
                    <th>Date de création</th>
                    <th className="users-page__actions" scope="col">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const hasName = Boolean(r.firstName || r.lastName);
                    const displayName = hasName
                      ? [r.firstName, r.lastName].filter(Boolean).join(" ")
                      : r.login;
                    const createdShort = new Date(r.createdAt).toLocaleDateString("fr-BE", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    });
                    const self = isRowSelf(current, r);
                    return (
                      <tr key={r.id} className={self ? "users-page__row--self" : undefined}>
                        <td className="table-cell-primary">
                          <div className="table-cell-primary-head">
                            <strong className="users-page__name">{displayName}</strong>
                          </div>
                          <div className="compact-list-meta users-page__date-line">
                            #{r.id} · {createdShort}
                          </div>
                        </td>
                        <td className="users-page__id" data-label="Id">
                          {r.id}
                        </td>
                        <td data-label="Personne">
                          {hasName ? (
                            <span className="users-page__name">
                              {[r.firstName, r.lastName].filter(Boolean).join(" ")}
                            </span>
                          ) : (
                            <span className="users-page__name--empty">—</span>
                          )}
                        </td>
                        <td data-label="Identifiant">
                          <span className="users-page__email">{r.login}</span>
                        </td>
                        <td data-label="Rôle">
                          <span className={rolePillClass(r.role)} title={r.role}>
                            {ROLE_FR[r.role]}
                          </span>
                        </td>
                        <td className="users-page__date" data-label="Date de création">
                          {new Date(r.createdAt).toLocaleString("fr-BE", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="users-page__actions" data-label="Actions">
                          {self ? (
                            <span className="users-page__self-hint">(vous)</span>
                          ) : (
                            <button
                              type="button"
                              className="users-page__btn-del compact-list-btn-sm"
                              onClick={() => {
                                setDeleteErr(null);
                                setDeleteTarget(r);
                              }}
                            >
                              Supprimer
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      {deleteTarget ? (
        <div
          className="users-page__modal-back"
          role="presentation"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="users-page__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="users-del-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3 id="users-del-title">Supprimer l’utilisateur ?</h3>
            <p>
              Cette action est <strong>irréversible</strong>. Le compte <code>{deleteTarget.login}</code> ne pourra
              plus se connecter.
            </p>
            {deleteErr ? (
              <p className="users-page__modal-err" role="alert">
                {deleteErr}
              </p>
            ) : null}
            <div className="users-page__modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Annuler
              </button>
              <button type="button" className="btn btn-danger" disabled={deleting} onClick={() => void confirmDeleteUser()}>
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
