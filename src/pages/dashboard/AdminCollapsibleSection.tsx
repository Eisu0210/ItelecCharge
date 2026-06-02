import { useId, useState, type ReactNode } from "react";
import "./admin-dashboard.css";

type AdminCollapsibleSectionProps = {
  title: string;
  description?: ReactNode;
  countLabel: string;
  actions?: ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
  children: ReactNode;
};

export function AdminCollapsibleSection({
  title,
  description,
  countLabel,
  actions,
  emptyMessage,
  isEmpty = false,
  children,
}: AdminCollapsibleSectionProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  function toggle() {
    setOpen((v) => !v);
  }

  return (
    <section
      className={`admin-dashboard-section card${open ? " admin-dashboard-section--open" : ""}`}
      style={{ padding: 0, marginBottom: "1rem" }}
    >
      <div className="admin-dashboard-section__bar">
        <button
          type="button"
          className="admin-dashboard-section__toggle"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? `Replier ${title}` : `Déplier ${title}`}
          onClick={toggle}
        >
          <span className="admin-dashboard-section__chevron" aria-hidden />
        </button>
        <button type="button" className="admin-dashboard-section__meta-btn" onClick={toggle}>
          <h2 className="admin-dashboard-section__title">{title}</h2>
          {description ? <p className="admin-dashboard-section__desc">{description}</p> : null}
          <span className="admin-dashboard-section__count">{countLabel}</span>
        </button>
        {actions ? (
          <div className="admin-dashboard-section__actions" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        ) : null}
      </div>
      {open ? (
        <div id={panelId} className="admin-dashboard-section__body">
          {isEmpty && emptyMessage ? (
            <p className="admin-dashboard-section__empty">{emptyMessage}</p>
          ) : (
            children
          )}
        </div>
      ) : null}
    </section>
  );
}
