import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { PRERENDER_PATHS } from "../src/content/publicRoutes.ts";

const DIST = join(process.cwd(), "dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

function routeToFile(route: string): string {
  if (route === "/") return join(DIST, "index.html");
  const clean = route.replace(/^\//, "").replace(/\/$/, "");
  return join(DIST, clean, "index.html");
}

function startStaticServer(): Promise<{ port: number; close: () => void }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url || "/", "http://127.0.0.1");
        let filePath = join(DIST, decodeURIComponent(url.pathname.replace(/^\//, "")));

        if (url.pathname === "/" || url.pathname === "") {
          filePath = join(DIST, "index.html");
        } else if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
          filePath = join(DIST, "index.html");
        }

        if (!filePath.startsWith(DIST)) {
          res.statusCode = 403;
          res.end("Forbidden");
          return;
        }

        const body = readFileSync(filePath);
        res.setHeader("Content-Type", MIME[extname(filePath)] ?? "application/octet-stream");
        res.end(body);
      } catch {
        res.statusCode = 404;
        res.end("Not found");
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ port, close: () => server.close() });
    });
    server.on("error", reject);
  });
}

async function main(): Promise<void> {
  const skip = process.env.SKIP_PRERENDER === "1";
  if (skip) {
    console.log("Pré-rendu ignoré (SKIP_PRERENDER=1).");
    return;
  }

  let playwright: typeof import("playwright");
  try {
    playwright = await import("playwright");
  } catch {
    console.warn(
      "Playwright absent — pré-rendu ignoré. Installez avec : npm i -D playwright && node node_modules/playwright/cli.js install chromium"
    );
    return;
  }

  const staticServer = await startStaticServer();
  const BASE = `http://127.0.0.1:${staticServer.port}`;

  try {
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();

    for (const route of PRERENDER_PATHS) {
      const url = route === "/" ? `${BASE}/` : `${BASE}${route}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForSelector('[data-seo-ready="true"]', { timeout: 15_000 }).catch(() => {
        console.warn(`  ⚠ data-seo-ready absent pour ${route}`);
      });
      await page.waitForSelector("main h1", { timeout: 10_000 }).catch(() => undefined);

      const html = await page.content();
      const out = routeToFile(route);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, html, "utf8");
      console.log(`  ✓ ${route}`);
    }

    await browser.close();
    console.log(`Pré-rendu terminé (${PRERENDER_PATHS.length} pages HTML statiques).`);
  } finally {
    staticServer.close();
  }
}

main().catch((e) => {
  console.error("Pré-rendu échoué :", e instanceof Error ? e.message : e);
  process.exit(1);
});
