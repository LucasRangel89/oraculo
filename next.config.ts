import type { NextConfig } from "next";

/**
 * Dois alvos de build, um código:
 *
 * - **servidor** (`npm run build`): `output: "standalone"`, com as rotas de
 *   `/api` (SSE, cache, comparação, arte).
 * - **estático** (`npm run build:pages`): `output: "export"`, sem servidor.
 *   As rotas de API são retiradas da árvore pelo `scripts/build-pages.mjs` e a
 *   UI passa a usar `src/lib/client-engine.ts` (motor local no navegador).
 */
const isStatic = process.env.STATIC_EXPORT === "1";

/** Subcaminho do GitHub Pages: `<user>.github.io/<repo>` → `/repo`. */
const basePath = (process.env.PAGES_BASE_PATH ?? "").trim().replace(/\/+$/, "");

const nextConfig: NextConfig = isStatic
  ? {
      output: "export",
      // projeto publicado em https://<user>.github.io/<repo>/
      ...(basePath ? { basePath } : {}),
      // GH Pages resolve /caminho/ para /caminho/index.html
      trailingSlash: true,
      images: { unoptimized: true },
      typescript: { ignoreBuildErrors: true },
      reactStrictMode: false,
    }
  : {
      output: "standalone",
      /* O preview da Arena serve o app por um host proxied ({porta}-{sandbox}.e2b.app).
         Liberamos origens de desenvolvimento para o HMR e as requisições internas. */
      allowedDevOrigins: ["*.e2b.app", "localhost", "127.0.0.1"],
      typescript: {
        // o build não deve parar por tipos: o contrato é validado com `tsc --noEmit`
        ignoreBuildErrors: true,
      },
      reactStrictMode: false,
    };

export default nextConfig;
