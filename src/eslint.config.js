import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Módulos de lógica pura: no pueden depender de React (design.md de configurar-base-app, D3).
const MODULOS_SIN_REACT = [
  'src/datos/**',
  'src/rutas/**',
  'src/clima/**',
  'src/cierres/**',
  'src/busqueda/**',
  'src/conexion/**',
]

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    'playwright-report',
    'test-results',
    'public/data',
    'docs',
    'openspec',
  ]),

  {
    files: ['**/*.{ts,tsx,js}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023 },
  },

  // App del navegador.
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },

  // Interfaz React: hooks, Fast Refresh y accesibilidad.
  {
    files: ['src/**/*.tsx', 'src/ui/**/*.ts'],
    extends: [
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
  },

  {
    files: MODULOS_SIN_REACT,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react/*',
                'react-dom',
                'react-dom/*',
                'react-leaflet',
                '@testing-library/react',
              ],
              message:
                'src/datos, src/rutas, src/clima, src/cierres y src/busqueda son lógica pura: no importan React. La interfaz va en src/ui/.',
            },
          ],
        },
      ],
    },
  },

  // Node: pipeline de datos, configuración y tests e2e.
  {
    files: ['scripts/**/*.ts', 'tests/**/*.ts', '*.config.{ts,js}'],
    languageOptions: { globals: globals.node },
  },

  // Siempre al final: ESLint no opina de formato (eso es de Prettier).
  prettier,
])
