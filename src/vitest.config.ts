import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Dos proyectos: `logica` (entorno node, sin DOM) y `ui` (jsdom + Testing Library).
// Los tests van al lado del código: *.test.ts / *.test.tsx.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'logica',
            environment: 'node',
            include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
            exclude: ['src/ui/**'],
          },
        },
        {
          extends: true,
          test: {
            name: 'ui',
            environment: 'jsdom',
            include: ['src/ui/**/*.test.{ts,tsx}', 'src/**/*.test.tsx'],
            setupFiles: ['./src/ui/test/setup.ts'],
          },
        },
      ],
    },
  }),
)
