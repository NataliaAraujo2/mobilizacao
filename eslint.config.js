import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
export default [
  { ignores: ["dist", ".tmp_docx", "*.py"] },
  { settings: { react: { version: "detect" } } },
  js.configs.recommended,
  reactHooks.configs["recommended-latest"],
  reactRefresh.configs.vite,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: { ecmaVersion: 2020, globals: globals.browser, parserOptions: { ecmaVersion: "latest", ecmaFeatures: { jsx: true }, sourceType: "module" } },
    settings: { react: { version: "detect" } },
    rules: { "react/prop-types": "off" },
  },
  {
    files: ["scripts/**/*.mjs", "functions/**/*.js"],
    languageOptions: { globals: globals.node },
  },
];
