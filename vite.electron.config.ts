import { defineConfig, type UserConfig } from "vite";
import path from "path";

/** Names the bundle after its entry, with the .cjs Electron needs to load it. */
function fileName(_format: string, entryName: string): string {
  return `${entryName}.cjs`;
}

// Main and preload build separately, one entry each. Built together, Rollup
// hoists what they share into a third chunk, and a sandboxed preload cannot
// require it — it fails with "module not found" and the bridge never appears.
export default defineConfig(function config({ mode }): UserConfig {
  return {
    build: {
      outDir: "dist-electron",
      // Only the first build clears the folder, or it deletes the other bundle.
      emptyOutDir: mode === "main",
      // Electron 44 ships Node 24. Matching it keeps the bundle unpolyfilled.
      target: "node24",
      lib: {
        // Keyed by mode so the bundle is main.cjs or preload.cjs, not index.cjs.
        entry: {
          [mode]: path.resolve(
            import.meta.dirname,
            `./src/main/electron/${mode}.ts`
          ),
        },
        formats: ["cjs"],
        fileName,
      },
      rollupOptions: {
        // Electron supplies both. Bundling a node: builtin silently breaks it.
        external: [/^node:/, "electron"],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
  };
});
