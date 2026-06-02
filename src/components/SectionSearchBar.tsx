type SectionSearchBarProps = {
  id: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  filteredCount: number;
  totalCount: number;
};

export function SectionSearchBar({
  id,
  placeholder = "Filtrer…",
  value,
  onChange,
  filteredCount,
  totalCount,
}: SectionSearchBarProps) {
  const active = value.trim().length > 0;
  return (
    <div
      className="section-search-bar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        flexWrap: "wrap",
        padding: "0.45rem 0.75rem",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <input
        id={id}
        type="search"
        className="input section-search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        autoComplete="off"
      />
      {active ? (
        <>
          <button
            type="button"
            className="section-search-clear"
            onClick={() => onChange("")}
            aria-label="Effacer la recherche"
          >
            ×
          </button>
          <span className="section-search-count">
            {filteredCount}/{totalCount}
          </span>
        </>
      ) : null}
    </div>
  );
}
