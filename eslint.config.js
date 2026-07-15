import tseslint from "@typescript-eslint/eslint-plugin"
import tsparser from "@typescript-eslint/parser"
import unusedImports from "eslint-plugin-unused-imports"
import reactHooks from "eslint-plugin-react-hooks"

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      },
      globals: {
        window: "readonly", document: "readonly", fetch: "readonly",
        localStorage: "readonly", navigator: "readonly", alert: "readonly",
        console: "readonly", Blob: "readonly", FileReader: "readonly",
        Audio: "readonly", MediaRecorder: "readonly",
        requestAnimationFrame: "readonly", cancelAnimationFrame: "readonly",
        SpeechSynthesisUtterance: "readonly", speechSynthesis: "readonly",
        HTMLCanvasElement: "readonly", HTMLInputElement: "readonly",
        HTMLDivElement: "readonly", HTMLAudioElement: "readonly",
        setTimeout: "readonly", setInterval: "readonly",
        clearInterval: "readonly", clearTimeout: "readonly",
        URL: "readonly", location: "readonly", JSON: "readonly",
        Math: "readonly", Date: "readonly", NodeJS: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "unused-imports": unusedImports,
      "react-hooks": reactHooks
    },
    rules: {
      "no-undef": "off",
      "react-hooks/exhaustive-deps": "off",
      // Remove unused imports / unused named imports.
      "unused-imports/no-unused-imports": "error"
    }
  }
]
