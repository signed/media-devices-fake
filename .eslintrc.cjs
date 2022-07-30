// https://typescript-eslint.io/docs/
module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: true,
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
        '@typescript-eslint/no-namespace': ['error', {allowDeclarations: true}],
      },
    },
  ],
}

