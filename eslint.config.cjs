// eslint.config.cjs
// @ts-check

const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const reactPlugin = require("eslint-plugin-react");
const reactHooksPlugin = require("eslint-plugin-react-hooks");
const importPlugin = require("eslint-plugin-import");
const storybookPlugin = require("eslint-plugin-storybook");

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    ignores: ["dist", "node_modules", ".storybook-static", "coverage", "*.json", "*.config.**"],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: "readonly",
        document: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      import: importPlugin,
      storybook: storybookPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
        typescript: {
          project: "./tsconfig.json",
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      "react/prop-types": "off",
      "react/jsx-no-useless-fragment": ["warn", { allowExpressions: true }],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"], "type"],
          pathGroups: [
            {
              pattern: "react",
              group: "external",
              position: "before",
            },
            {
              pattern: "@/**",
              group: "internal",
              position: "after",
            },
          ],
          pathGroupsExcludedImportTypes: ["react"],
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
          "newlines-between": "always",
        },
      ],
      "import/no-unresolved": "error",
      "import/no-default-export": "error",
      "import/no-commonjs": "warn",
    },
  },
  {
    files: ["**/*.stories.@(ts|tsx|js|jsx)", "**/*.test.@(ts|tsx|js|jsx)", "**/*.spec.@(ts|tsx|js|jsx)"],
    rules: {
      "import/no-default-export": "off",
    },
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "import/no-default-export": "off",
    },
  },
  {
    files: ["*.js", "*.cjs", "*.mjs"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
      },
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
    },
  },
];
