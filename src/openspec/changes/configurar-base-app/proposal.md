## Why

Hoy el proyecto tiene los datos del campus (`grafo.json`, `grafo.svg`, `mapa-unlam.svg`) y la documentación del producto, pero no tiene una aplicación donde construir nada: no hay proyecto web, ni tests, ni integración continua, ni un lugar donde publicarla, y el directorio ni siquiera es un repositorio git. Los siete cambios siguientes (datos, A\*, cierres, clima, interfaz, ruta e indicaciones, señal irregular) necesitan una base común y acordada para no tomar cada uno decisiones de estructura por su cuenta.

Además, el usuario pidió revisar explícitamente si el MVP necesita un backend. La respuesta condiciona todo lo demás (dónde corre el A\*, cómo se sirven los cierres y el clima simulado, dónde se publica la app), así que tiene que quedar decidida y argumentada antes de empezar.

El brief v3 ("Scope del MVP" y "Qué se construye y qué se simula") define un alcance chico: interfaz web móvil, mapa y motor de rutas, cierres precargados a mano y clima simulado. El brief v2 ("Perfil del usuario real") y el v4 (hallazgos 5 y 7) agregan que los cinco usuarios usan el celular con datos móviles de señal irregular. Esta base tiene que servir a ese contexto: una app web liviana, pensada primero para el celular y que no dependa de un servidor para calcular la ruta.

## What Changes

- Inicializar el repositorio git, con `.gitignore`, versión de Node fijada y README con cómo levantar el proyecto.
- Crear la aplicación con React + Vite + TypeScript (modo estricto) como SPA estática, con una pantalla mínima "¿Dónde queda?" en español y viewport móvil.
- Definir la estructura de carpetas por dominio (`src/datos/`, `src/rutas/`, `src/clima/`, `src/cierres/`, `src/ui/`), `public/data/` para los datos que consume la app y `scripts/` para el pipeline de datos.
- Configurar la calidad de código: ESLint + Prettier, chequeo de tipos y scripts npm uniformes (`dev`, `build`, `preview`, `lint`, `format`, `typecheck`, `test`, `test:e2e`).
- Configurar los tests: Vitest + Testing Library para unidades y componentes, y Playwright emulando un celular (390×844, táctil) para recorridos de punta a punta.
- Configurar la integración continua con GitHub Actions: lint, tipos, tests unitarios, build y e2e en cada push y pull request.
- Publicar la app en un hosting estático con HTTPS (requisito del service worker que llega en `tolerar-senal-irregular`), con despliegue automático desde la rama principal y vistas previas por pull request.
- Documentar en `design.md` la decisión **"¿Hace falta backend?"**: no para el MVP, con los disparadores concretos que justificarían agregarlo después.

### Fuera de alcance

- Cualquier funcionalidad de la app (mapa, búsqueda, rutas, clima, cierres): llega en los cambios 2 a 8.
- El pipeline de datos en sí (lectura de `grafo.json`, catálogo de lugares, teselas del plano): es `preparar-datos-campus`. Acá solo se reserva su lugar (`scripts/`, `public/data/`).
- La configuración de PWA y service worker: es `tolerar-senal-irregular`.
- Backend, base de datos, cuentas de usuario y panel de administración.

## Capabilities

### New Capabilities

Ninguna. Este cambio es de infraestructura y herramientas: no agrega conducta observable para el usuario, por eso tiene `skip_specs: true`. Las decisiones quedan en `design.md`.

### Modified Capabilities

Ninguna.

## Impact

- **Repositorio:** pasa a ser un repo git con historial; los archivos actuales (`CLAUDE.md`, `docs/`, `grafo.json`, `grafo.svg`, `mapa-unlam.svg`, `mapa-unlam.png`, `openspec/`) entran en el primer commit.
- **Dependencias nuevas (desarrollo y ejecución):** React, Vite, TypeScript, Vitest, Testing Library, jsdom, Playwright, ESLint, Prettier. Las librerías de mapa (Leaflet) y de PWA las agregan los cambios que las necesitan.
- **Servicios externos:** GitHub (repositorio y Actions) y un hosting estático con HTTPS (Netlify recomendado). Sin costos para el tamaño del proyecto.
- **Equipo:** todos trabajan con los mismos scripts npm y el CI bloquea los merges que no pasan lint, tests o build.
