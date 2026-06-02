import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { InstallerStockPanel } from "./InstallerStockPanel";

export function TechStockPage() {
  const { user } = useAuth();
  const { data } = useData();
  const installerId = user?.installerId;

  if (!installerId) {
    return (
      <div>
        <h1>Stock camionnette</h1>
        <p style={{ color: "var(--color-muted)" }}>
          Votre compte n’est pas lié à un profil technicien. Contactez l’administrateur.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>Stock camionnette</h1>
      <p>
        Inventaire du matériel restant dans votre véhicule. Utilisez <strong>−</strong> après chaque
        chantier (ex. 5 disjoncteurs utilisés) et <strong>+</strong> lors d’un réapprovisionnement.
      </p>
      <InstallerStockPanel
        installerId={installerId}
        catalog={data.materialCatalog}
        canEdit
      />
    </div>
  );
}
