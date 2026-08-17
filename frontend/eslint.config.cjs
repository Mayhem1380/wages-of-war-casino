module.exports = {
  languageOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  env: {
    browser: true,
    es2021: true
  },
  plugins: {
    react: require('eslint-plugin-react'),
    'jsx-a11y': require('eslint-plugin-jsx-a11y'),
    'react-hooks': require('eslint-plugin-react-hooks')
  },
  settings: {
    react: { version: 'detect' }
  },
  rules: {
    'react/prop-types': 'off'
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:react-hooks/recommended'
  ]
};
