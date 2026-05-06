import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
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
  },
});
