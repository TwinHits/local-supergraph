import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import prettier from "eslint-config-prettier";

const MAIN_GROUP = ["@/main", "@/main/**"];
const RENDERER_GROUP = ["@/renderer", "@/renderer/**"];
const MUI_GROUP = ["@mui/*", "@mui/**"];
const ELECTRON_FOLDER_GROUP = ["@/main/electron", "@/main/electron/**"];

const ELECTRON_MESSAGE =
  "Only src/main/electron may import electron. A service that imports it cannot be tested without launching Electron.";
const MAIN_MESSAGE =
  "The renderer reaches main through @/renderer/api, never by importing it.";
const RENDERER_MESSAGE = "Main must not depend on the renderer.";
const MUI_MESSAGE =
  "Only src/renderer/ui may import MUI. One file decides how a control looks.";
const MODELS_MESSAGE =
  "models.ts is shared by both sides, so it depends on neither.";
const ELECTRON_FOLDER_MESSAGE =
  "src/main/electron imports electron, so importing it drags electron into a service.";

export default [
  {
    ignores: ["dist/", "dist-electron/", "node_modules/"],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "test/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "react-hooks": reactHooks,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "no-undef": "off",
      // a const and a type may share a name; tsc catches real redeclarations
      "no-redeclare": "off",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },
  // The process split, enforced. Each scope below is disjoint, so
  // no-restricted-imports is set once per file and never overwritten.
  {
    files: ["src/main/services/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "electron", message: ELECTRON_MESSAGE }],
          patterns: [
            { group: RENDERER_GROUP, message: RENDERER_MESSAGE },
            { group: MUI_GROUP, message: MUI_MESSAGE },
            {
              group: ELECTRON_FOLDER_GROUP,
              message: ELECTRON_FOLDER_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/main/electron/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: RENDERER_GROUP, message: RENDERER_MESSAGE }] },
      ],
    },
  },
  {
    files: ["src/renderer/**/*.{ts,tsx}"],
    ignores: ["src/renderer/api.ts"],
    rules: {
      // Naming the bridge is not an import, so no-restricted-imports cannot see it.
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "bridge",
          message:
            "Reach main through @/renderer/api, the only file that names the bridge.",
        },
      ],
    },
  },
  {
    files: ["src/renderer/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "electron", message: ELECTRON_MESSAGE }],
          patterns: [{ group: MAIN_GROUP, message: MAIN_MESSAGE }],
        },
      ],
    },
  },
  {
    files: ["src/renderer/**/*.{ts,tsx}"],
    ignores: ["src/renderer/ui/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "electron", message: ELECTRON_MESSAGE }],
          patterns: [
            { group: MAIN_GROUP, message: MAIN_MESSAGE },
            { group: MUI_GROUP, message: MUI_MESSAGE },
          ],
        },
      ],
    },
  },
  {
    files: ["src/shared/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "electron", message: ELECTRON_MESSAGE }],
          patterns: [
            {
              group: [...MAIN_GROUP, ...RENDERER_GROUP],
              message: MODELS_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  prettier,
];
