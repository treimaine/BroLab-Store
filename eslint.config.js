import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "sonaar_music/**/*", "convex/_generated/**/*"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      // Allow control character patterns in security-related regex
      "no-control-regex": "off",
      // Règles supplémentaires pour détecter les erreurs de syntaxe JSX
      "react/jsx-no-undef": "error",
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      "react/no-unescaped-entities": "warn",
      "react/self-closing-comp": "warn",
      // Règles pour détecter les erreurs de structure JSX
      "react/jsx-closing-bracket-location": ["warn", "line-aligned"],
      "react/jsx-closing-tag-location": "warn",
      "react/jsx-curly-brace-presence": ["warn", { props: "never", children: "never" }],
      "react/jsx-curly-spacing": ["warn", "never"],
      "react/jsx-equals-spacing": ["warn", "never"],
      "react/jsx-indent": ["warn", 2],
      "react/jsx-indent-props": ["warn", 2],
      "react/jsx-key": "error",
      "react/jsx-max-props-per-line": ["warn", { maximum: 1, when: "multiline" }],
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-literals": "off",
      "react/jsx-no-target-blank": "warn",
      "react/jsx-pascal-case": "warn",
      "react/jsx-props-no-multi-spaces": "warn",
      "react/jsx-sort-props": "off",
      "react/jsx-tag-spacing": [
        "warn",
        { closingSlash: "never", beforeSelfClosing: "always", afterOpening: "never" },
      ],
      "react/jsx-wrap-multilines": "warn",
    },
  },
  // Relaxed rules for test files - allow any types in mocks
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|^mock|Mock|^unused",
        },
      ],
    },
  },
  // Relaxed rules for migration scripts (archive)
  {
    files: ["**/migrations/archive/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Relaxed rules for example/documentation files
  {
    files: ["**/docs/**/*.{ts,tsx}", "**/*.example.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Relaxed rules for scripts
  {
    files: ["**/scripts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  }
);
