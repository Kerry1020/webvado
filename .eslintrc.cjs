module.exports = {
  root: true,
  env: { es2022: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  extends: ['eslint:recommended'],
  ignorePatterns: ['node_modules/', 'dist/', 'tools/'],
  rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }] },
  overrides: [
    { files: ['frontend/**/*.js'], env: { browser: true } },
    { files: ['backend/**/*.js', 'scripts/**/*.js', 'tests/**/*.js'], env: { node: true } }
  ]
};
