import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    css: { include: [/colors\.module\.scss/] },
    coverage: {
      reporter: ["text", "json", "html"],
      include: ["src/**"],
      thresholds: {
        branches: 33,
        functions: 33,
        lines: 43,
        statements: 43,
      },
    },
  },
});
