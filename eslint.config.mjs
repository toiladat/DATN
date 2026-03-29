// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      'no-console': 'warn',
      // 'no-unused-vars': 'error',
      'no-lonely-if': 'warn',
      'perfectionist/sort-imports': 'off',
      'no-constant-condition': 'off',
      'react-refresh/only-export-components': 'off',
      'style/comma-dangle': 'off',
      'format/prettier': 'off',
      'ts/consistent-type-definitions': 'off',
      '@typescript-eslint/no-require-imports' : 'off',
      "no-unused-vars": "off",
      '@typescript-eslint/no-unsafe-argument': 'off', 
      "@typescript-eslint/no-unused-vars": ["error"],
    },
  },
);
