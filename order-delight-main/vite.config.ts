import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig(({ mode }) => {
  const frontendRoot = process.cwd();
  const workspaceRoot = path.resolve(__dirname, "..");
  const rootEnv = loadEnv(mode, workspaceRoot, "");
  const frontendEnv = loadEnv(mode, frontendRoot, "");
  const env = {
    ...rootEnv,
    ...frontendEnv,
  };

  const widgetId = (env.VITE_MSG91_WIDGET_ID ?? env.MSG91_WIDGET_ID ?? "").trim() || undefined;
  const tokenAuth = (env.VITE_MSG91_TOKEN_AUTH ?? env.MSG91_TOKEN_AUTH ?? "").trim() || undefined;

  return {
    define: {
      "import.meta.env.VITE_MSG91_WIDGET_ID": JSON.stringify(widgetId),
      "import.meta.env.VITE_MSG91_TOKEN_AUTH": JSON.stringify(tokenAuth),
    },
    plugins: [
      tailwindcss(),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart(),
      react(),
    ],
    resolve: {
      alias: {
        "@": `${__dirname}/src`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    server: {
      host: "0.0.0.0",
      port: 5000,
      strictPort: true,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: false,
        },
        "/health": {
          target: "http://localhost:8000",
          changeOrigin: false,
        },
      },
    },
  };
});
