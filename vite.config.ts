import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // Electron loads the built index.html over file://, where absolute paths break
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    // Vitest stubs CSS modules by default, which turns the themes' :export
    // values into class names. These stylesheets carry data, so compile them.
    css: { include: [/shared[\/]themes/] },
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
