import eslint from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import jsdocPlugin from 'eslint-plugin-jsdoc'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default [
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '*.config.js',
      '*.config.ts',
      'src_backup/'
    ]
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      jsdoc: jsdocPlugin
    },
    settings: {
      jsdoc: {
        mode: 'typescript'
      }
    },
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-console': 'off',
      semi: ['error', 'always'],
      quotes: ['error', 'single', { allowTemplateLiterals: true }],
      'no-multiple-empty-lines': ['error', { max: 2 }],
      eqeqeq: ['warn', 'always'],
      'no-unused-vars': 'off',
      'jsdoc/require-jsdoc': [
        'warn',
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true
          }
        }
      ],
      'jsdoc/require-description': [
        'warn',
        {
          contexts: ['FunctionDeclaration', 'ClassDeclaration']
        }
      ]
    }
  }
]
