import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

const MAIN_GROUP = ["@/main", "@/main/**"];
const RENDERER_GROUP = ["@/renderer", "@/renderer/**"];

const ELECTRON_MESSAGE =
  "Only src/main/electron may import electron. A service that imports it cannot be tested without launching Electron.";
const MAIN_MESSAGE =
  "The renderer reaches main through @/renderer/api, never by importing it.";
const RENDERER_MESSAGE = "Main must not depend on the renderer.";
const MODELS_MESSAGE =
  "models.ts is shared by both sides, so it depends on neither.";

export default [
  {
    ignores: ["dist/", "dist-electron/", "node_modules/"],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "test/**/*.{ts,tsx}", "fixtures/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "react-hooks": reactHooks,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "no-undef": "off",
      // a const and a type may share a name; tsc catches real redeclarations
      "no-redeclare": "off",
    },
  },
  // The process split (spec §2.2), enforced. Each scope below is disjoint, so
  // no-restricted-imports is set once per file and never overwritten.
  {
    files: ["src/main/services/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "electron", message: ELECTRON_MESSAGE }],
          patterns: [{ group: RENDERER_GROUP, message: RENDERER_MESSAGE }],
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
    files: ["src/models.ts"],
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
