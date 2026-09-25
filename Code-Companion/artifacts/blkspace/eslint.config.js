// ESLint flat config. Replaces the legacy `.eslintrc.cjs`, which stopped working
// when ESLint moved to v9+ flat config and went unnoticed because `lint` ran
// `tsc` rather than a linter.
//
// Two rules here exist because of real defects, not style preference:
//
//   no-empty-function on catch   A swallowed error is how the withdrawal bug
//                                debited real credits and returned a fabricated
//                                signature, and how browser media reported a
//                                save that never synced. Silence in a promise
//                                chain is a bug shape, not a style choice.
//   no-demo-user-fallback        `getCurrentHandle() || "demo_user"` attributes
//                                an unauthenticated action to a fake shared
//                                identity instead of refusing.
//
// Rules are declared explicitly rather than extending a preset, so the gate is
// exactly what is listed here and nothing arrives implicitly on an upgrade.
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";

/** Reject `x || "demo_user"` — never attribute an action to a fake identity. */
const noDemoUserFallback = {
  name: "no-demo-user-fallback",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow falling back to the shared demo_user identity when a real handle is absent.",
    },
    schema: [],
    messages: {
      noFallback:
        'Do not fall back to "demo_user". Require a real handle, or surface that the action is unattributed.',
    },
  },
  create(context) {
    return {
      LogicalExpression(node) {
        if (node.operator !== "||") return;
        const right = node.right;
        if (right && right.type === "Literal" && right.value === "demo_user") {
          context.report({ node, messageId: "noFallback" });
        }
      },
    };
  },
};

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "src-tauri/target/**",
      "server/**",
      "scripts/**",
      "eslint.config.js",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        crypto: "readonly",
        console: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        queueMicrotask: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Blob: "readonly",
        File: "readonly",
        FileReader: "readonly",
        FormData: "readonly",
        Headers: "readonly",
        Response: "readonly",
        Request: "readonly",
        AbortController: "readonly",
        performance: "readonly",
        indexedDB: "readonly",
        CustomEvent: "readonly",
        Event: "readonly",
        HTMLElement: "readonly",
        HTMLVideoElement: "readonly",
        HTMLAudioElement: "readonly",
        HTMLImageElement: "readonly",
        HTMLCanvasElement: "readonly",
        Image: "readonly",
        Notification: "readonly",
        matchMedia: "readonly",
        process: "readonly",
        Buffer: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      honesty: { rules: { "no-demo-user-fallback": noDemoUserFallback } },
    },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // Honesty rules.
      "honesty/no-demo-user-fallback": "error",
      // Catches `.catch(() => {})`. Autoplay call sites are opted out below.
      "no-empty-function": ["error", { allow: [] }],
      "no-empty": ["error", { allowEmptyCatch: false }],
    },
  },
  {
    // Test doubles legitimately stub behaviour they are not exercising. A mock
    // that throws would fail tests for the wrong reason.
    files: ["src/test/**/*.{ts,tsx}"],
    rules: { "no-empty-function": "off" },
  },
  {
    // The two autoplay call sites are a browser policy, not a defect: the user
    // has not interacted with the page, so play() is rejected by design. These
    // are opted out explicitly so the rule stays strict everywhere else.
    files: [
      "src/components/profile/LogosDeckPlayer.tsx",
      "src/components/profile/ProfileMusicPlayer.tsx",
    ],
    rules: { "no-empty-function": "off" },
  },
];
