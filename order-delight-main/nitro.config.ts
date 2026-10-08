import { defineNitroConfig } from "nitro/config";

const backendUrl =
  process.env.VITE_API_BASE_URL ||
  process.env.BACKEND_URL ||
  "https://pre-order-food-production.up.railway.app";

export default defineNitroConfig({
  routeRules: {
    "/api/**": {
      proxy: `${backendUrl.replace(/\/$/, "")}/api/**`,
    },
    "/health": {
      proxy: `${backendUrl.replace(/\/$/, "")}/health`,
    },
  },
});
