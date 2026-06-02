import "./db/loadEnv";
import { isSmtpConfigured, verifySmtpConnection } from "./mail";

async function main() {
  if (!isSmtpConfigured()) {
    console.error("SMTP non configuré : SMTP_HOST et MAIL_FROM requis dans .env");
    process.exit(1);
  }
  await verifySmtpConnection();
  console.log("Connexion SMTP OK —", process.env.SMTP_USER);
}

main().catch((e) => {
  console.error("Échec SMTP :", e instanceof Error ? e.message : e);
  process.exit(1);
});
