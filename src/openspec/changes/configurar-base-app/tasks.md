## 1. Repositorio git

- [x] 1.1 Ejecutar `git init` con rama `main` en la raíz del proyecto y verificar que `git status` lista los archivos actuales (`CLAUDE.md`, `docs/`, `grafo.json`, `grafo.svg`, `mapa-unlam.svg`, `mapa-unlam.png`, `openspec/`)
- [x] 1.2 Crear `.gitignore` (node_modules, dist, `public/data/`, reportes de Playwright y Vitest, `.env*`, `.DS_Store`) y `.editorconfig` (UTF-8, LF, 2 espacios) y verificar con `git status --ignored` que `node_modules/` y `dist/` quedan ignorados
- [ ] 1.3 Hacer el primer commit con el estado actual del proyecto, crear el repositorio en GitHub y hacer push, y verificar que el repositorio remoto muestra el commit
- [ ] 1.4 Fijar Node 24 LTS con `.nvmrc` y `engines` en `package.json` y verificar que `nvm use` toma la versión y `npm install` avisa si se usa otra

## 2. Aplicación React + Vite + TypeScript

- [x] 2.1 Crear el proyecto con la plantilla React + TypeScript de Vite en la raíz (sin pisar `docs/` ni `openspec/`) y verificar que `npm run dev` levanta la app en el navegador
- [x] 2.2 Activar TypeScript estricto (`strict`, `noUncheckedIndexedAccess`) con un `tsconfig` para la app y otro para `scripts/`, y verificar que `npm run typecheck` pasa sin errores
- [x] 2.3 Reemplazar la pantalla de ejemplo por una mínima con el título "¿Dónde queda?", `lang="es"`, `meta viewport` móvil y `theme-color`, y verificar en `npm run dev` con el emulador de celular que el texto se lee sin zoom
- [x] 2.4 Crear las carpetas `src/datos/`, `src/rutas/`, `src/clima/`, `src/cierres/`, `src/ui/`, `public/data/`, `scripts/` y `tests/e2e/`, cada una con un `README.md` de una línea que diga qué va ahí (según design.md, D3), y verificar que la estructura coincide con la del design
- [x] 2.5 Agregar una regla de ESLint (`no-restricted-imports`) que impida importar React desde `src/datos/`, `src/rutas/`, `src/clima/` y `src/cierres/`, y verificar que un import de prueba de `react` en `src/rutas/` hace fallar `npm run lint`

## 3. Calidad de código

- [x] 3.1 Configurar ESLint (configuración plana) con `typescript-eslint`, `react-hooks`, `jsx-a11y` y `eslint-config-prettier`, y verificar que `npm run lint` pasa sobre el proyecto recién creado
- [x] 3.2 Configurar Prettier y los scripts `format` y `format:check`, y verificar que `npm run format:check` falla con un archivo mal formateado y pasa después de `npm run format`
- [x] 3.3 Definir todos los scripts npm de design.md (D4) y verificar que cada uno corre sin errores en un clon limpio después de `npm ci`

## 4. Tests

- [x] 4.1 Configurar Vitest con entorno `node` por defecto y `jsdom` para archivos de `src/ui/`, más Testing Library y `@testing-library/jest-dom`, y verificar que `npm test` corre
- [x] 4.2 Escribir un test de componente que renderice la pantalla mínima y encuentre el título "¿Dónde queda?" por su rol de encabezado, y verificar que pasa y que falla si se cambia el texto
- [x] 4.3 Configurar Playwright con el proyecto `movil` (Chromium, 390 × 844, `isMobile`, `hasTouch`) contra `npm run preview`, y un proyecto WebKit con el mismo viewport para correr a mano, y verificar que `npm run test:e2e` levanta el preview solo
- [x] 4.4 Escribir un e2e de humo que abra la app, verifique el título y que no hay scroll horizontal en 390 px de ancho, y verificar que pasa en el proyecto `movil`

## 5. Integración continua

- [ ] 5.1 Crear el workflow de GitHub Actions con un job que corra `npm ci`, `lint`, `format:check`, `typecheck`, `test` y `build` en cada push y pull request, y verificar en un PR de prueba que el job aparece y pasa
- [ ] 5.2 Agregar el job `e2e` (depende del anterior, con caché de navegadores de Playwright) que suba el reporte como artefacto cuando falla, y verificar rompiendo a propósito el e2e de humo que el job falla y el artefacto queda disponible
- [ ] 5.3 Proteger la rama `main` para exigir que el CI pase antes de mergear, y verificar que GitHub bloquea el merge de un PR con el CI en rojo

## 6. Hosting estático con HTTPS

- [ ] 6.1 Conectar el repositorio a Netlify con comando `npm run build` y carpeta `dist/`, y verificar que el deploy de `main` queda publicado en una URL `https://`
- [ ] 6.2 Agregar `_redirects` con el fallback de la SPA a `index.html` y `_headers` con caché corta para `/data/*` y larga para los assets con hash, y verificar con `curl -I` que los headers llegan como se configuraron
- [ ] 6.3 Activar las vistas previas por pull request y verificar que un PR de prueba recibe su URL de vista previa
- [ ] 6.4 Documentar en el README la URL pública, cómo levantar el proyecto, los scripts npm y la decisión de no tener backend (con link a este design), y verificar que alguien del equipo lo sigue desde un clon limpio

## 7. Chequeos de integración

- [ ] 7.1 Desde un clon limpio del repositorio, correr `npm ci && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e` y verificar que todo pasa
- [ ] 7.2 Abrir la URL pública desde un celular real con datos móviles y verificar que carga por HTTPS, sin advertencias, y que la pantalla mínima se ve bien en vertical

## Workflow follow-up

- Archivar el cambio con `openspec archive configurar-base-app` cuando todas las tareas estén hechas.
