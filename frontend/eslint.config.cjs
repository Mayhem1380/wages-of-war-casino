module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  globals: {
    process: "readonly",
  },
  plugins: ["react", "jsx-a11y", "react-hooks"],
  settings: {
    react: { version: "detect" },
  },
  rules: {
    "no-unused-vars": ["error", { varsIgnorePattern: "^React$" }],
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "react/jsx-uses-react": "off",
    "react/jsx-no-comment-textnodes": "off",
    "jsx-a11y/label-has-associated-control": "off",
    "jsx-a11y/heading-has-content": "off",
    "jsx-a11y/anchor-has-content": "off",
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:react-hooks/recommended",
  ],
};
