import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "/PPG-BP-Research-Tracker/",
  publicDir: fileURLToPath(new URL("../public", import.meta.url)),
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL("../pages-dist", import.meta.url)),
    emptyOutDir: true,
  },
});
