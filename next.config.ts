import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
