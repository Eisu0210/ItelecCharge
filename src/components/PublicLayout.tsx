import { Link, Outlet } from "react-router-dom";

export function PublicLayout() {
  return (
    <>
      <header
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--color-border)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            padding: "0.75rem 0",
          }}
        >
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              textDecoration: "none",
            }}
          >
            <img
              src="/logo-itelec-charge.png"
              alt="ITELEC CHARGE"
              style={{ height: 48, width: "auto" }}
            />
          </Link>
          <nav style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
            <Link to="/#offre">Offre</Link>
            <Link to="/#parcours">Parcours</Link>
            <Link to="/#tarifs">Tarifs</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/connexion" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Espace pro
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer
        style={{
          marginTop: "3rem",
          padding: "2rem 0",
          background: "var(--color-navy)",
          color: "#c8d5e0",
          fontSize: "0.9rem",
        }}
      >
        <div className="container">
          <p style={{ margin: 0 }}>
            © {new Date().getFullYear()} ITELEC CHARGE — Bornes de recharge clé en main pour
            entreprises, copropriétés et parkings semi-publics.
          </p>
        </div>
      </footer>
    </>
  );
}
