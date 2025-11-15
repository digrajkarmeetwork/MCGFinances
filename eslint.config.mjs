import tseslint from 'typescript-eslint'
import js from '@eslint/js'

export default tseslint.config(
  {
    ignores: ['**/dist/**', 'apps/web/**/dist/**']
  },
  {
    files: ['apps/**/src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      sourceType: 'module'
    },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off'
    }
  }
)
