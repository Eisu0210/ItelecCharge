import { useState } from "react";
import { publicApiErrorMessage } from "../lib/safeUserMessage";

type FormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  message: string;
  website: string;
};

const initial: FormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  message: "",
  website: "",
};

const web3Key = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY?.trim();
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL?.trim() || "hello@itelec-charge.be";

export function DevisContactForm() {
  const [form, setForm] = useState<FormState>(initial);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");
  const [successMode, setSuccessMode] = useState<"api" | "web3" | "mailto">("api");

  async function submitApi(e: React.FormEvent) {
    e.preventDefault();
    setErrorText("");
    setStatus("sending");
    try {
      const res = await fetch("/api/public/devis-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          message: form.message.trim(),
          website: form.website,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
        code?: string;
      };
      if (res.ok && data.ok) {
        setSuccessMode("api");
        setStatus("success");
        setForm(initial);
        return;
      }
      if (res.status === 503 && data.code === "SMTP_NOT_CONFIGURED") {
        if (web3Key) {
          await submitWeb3(e, true);
          return;
        }
        if (contactEmail) {
          submitMailto(e);
          return;
        }
      }
      setStatus("error");
      setErrorText(
        publicApiErrorMessage(
          data as { error?: string },
          "Envoi impossible. Réessayez plus tard ou contactez-nous par e-mail."
        )
      );
    } catch {
      setStatus("error");
      setErrorText("Erreur réseau. Vérifiez votre connexion ou écrivez-nous à hello@itelec-charge.be.");
    }
  }

  async function submitWeb3(e: React.FormEvent, fromFallback = false) {
    if (!fromFallback) e.preventDefault();
    setErrorText("");
    if (!web3Key) return;

    setStatus("sending");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: web3Key,
          subject: `Demande de devis — ${form.name}`,
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          message: form.message,
          from_name: form.name,
          replyto: form.email,
        }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (data.success) {
        setSuccessMode("web3");
        setStatus("success");
        setForm(initial);
      } else {
        setStatus("error");
        setErrorText(data.message ?? "Envoi impossible. Réessayez plus tard.");
      }
    } catch {
      setStatus("error");
      setErrorText("Erreur réseau. Vérifiez votre connexion.");
    }
  }

  function submitMailto(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Demande de devis — ${form.name}`);
    const body = encodeURIComponent(
      `Nom / société : ${form.name}\nEmail : ${form.email}\nTéléphone : ${form.phone || "—"}\nAdresse du site : ${form.address}\n\nProjet / besoin :\n${form.message}`,
    );
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
    setSuccessMode("mailto");
    setStatus("success");
    setForm(initial);
  }

  function onSubmit(e: React.FormEvent) {
    if (form.website.trim()) {
      e.preventDefault();
      setStatus("success");
      setForm(initial);
      return;
    }
    void submitApi(e);
  }

  const canSend =
    form.name.trim() && form.email.trim() && form.address.trim() && form.message.trim();

  return (
    <section id="contact-devis" className="vitrine-band-contact" style={{ padding: "3rem 0 4rem" }}>
      <div className="container">
        <div style={{ maxWidth: 640 }}>
          <h2 style={{ marginTop: 0 }}>Demande de devis</h2>
          <p style={{ color: "var(--color-muted)", marginBottom: "1.5rem" }}>
            Indiquez l’adresse du futur chantier et décrivez votre situation (type de site, nombre de places,
            délai souhaité). Nous vous recontactons pour affiner le projet et préparer une proposition.
          </p>

          {status === "success" ? (
            <div className="card" role="status">
              <p style={{ margin: 0, color: "var(--color-green)", fontWeight: 600 }}>
                {successMode === "mailto"
                  ? "Votre messagerie s’ouvre : il vous suffit d’envoyer le message pour nous joindre."
                  : "Message envoyé. Nous vous répondons dans les meilleurs délais."}
              </p>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginTop: "1rem" }}
                onClick={() => setStatus("idle")}
              >
                Nouvelle demande
              </button>
            </div>
          ) : (
            <form className="card" onSubmit={onSubmit}>
              <div className="field" style={{ position: "absolute", left: "-9999px" }} aria-hidden>
                <label htmlFor="devis-website">Ne pas remplir</label>
                <input
                  id="devis-website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="devis-name">Nom ou société</label>
                <input
                  id="devis-name"
                  name="name"
                  className="input"
                  autoComplete="organization"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="devis-email">E-mail</label>
                <input
                  id="devis-email"
                  name="email"
                  type="email"
                  className="input"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="devis-phone">Téléphone (optionnel)</label>
                <input
                  id="devis-phone"
                  name="phone"
                  type="tel"
                  className="input"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="devis-address">Adresse du site / chantier</label>
                <input
                  id="devis-address"
                  name="address"
                  className="input"
                  autoComplete="street-address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  required
                  placeholder="Ex. : Rue du Bosquet 19, 6181 Gouy-lez-Pieton"
                />
              </div>
              <div className="field">
                <label htmlFor="devis-message">Votre projet en quelques lignes</label>
                <textarea
                  id="devis-message"
                  name="message"
                  className="input"
                  rows={4}
                  style={{ minHeight: "6rem" }}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  placeholder="Ex. : copropriété 12 places, parking client magasin, délai avant l’été…"
                />
              </div>

              {status === "error" && errorText ? (
                <p style={{ color: "#c0392b", fontSize: "0.9rem", marginTop: 0 }} role="alert">
                  {errorText}
                </p>
              ) : null}

              <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", margin: "0 0 1rem" }}>
                Envoi sécurisé vers notre équipe. Vous pouvez aussi nous écrire à{" "}
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
              </p>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!canSend || status === "sending"}
              >
                {status === "sending" ? "Envoi…" : "Envoyer la demande"}
              </button>

              <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", margin: "1rem 0 0" }}>
                Vous êtes déjà client ou partenaire ?{" "}
                <a href="/connexion" style={{ fontWeight: 600 }}>
                  Espace pro
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
