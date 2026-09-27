import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Send /api calls to Express. The browser only ever talks to :5173, so in dev
    // it's one origin - exactly like production, where Express serves everything.
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
