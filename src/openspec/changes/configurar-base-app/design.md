## Context

*¿Dónde queda?* es una app web para celular que calcula la ruta más corta entre dos lugares del campus de la UNLaM y la dibuja sobre el plano. El brief v3 define el MVP (selección de origen y destino, cálculo y dibujo de la ruta, exclusión de tramos cerrados precargados, clima simulado) y el brief v4 suma las correcciones del TP5 (referencias reconocibles, indicaciones hasta el aula, tolerancia a cortes de señal, "Buscando el camino…").

Punto de partida concreto:

- El directorio del proyecto **no es un repositorio git**. Tiene `CLAUDE.md`, `docs/` (enunciados, entregas, brief, wireframe del TP3), `openspec/`, y los datos exportados de Figma: `grafo.json` (685 nodos, 722 aristas, 322 KB), `grafo.svg`, `mapa-unlam.svg` (1,6 MB, 3737 paths) y `mapa-unlam.png` (render 4x, 6350 × 12019).
- `src/` y `scripts/` existen pero están vacíos.
- El equipo son cinco estudiantes; el código tiene que ser fácil de leer y de probar, y la app tiene que poder mostrarse en una prueba con usuarios desde el celular de cada uno.

Este cambio arma la base sobre la que se construyen los otros siete cambios. No agrega conducta para el usuario (por eso no tiene specs).

## Goals / Non-Goals

**Goals:**

- Un repositorio git con una app React + Vite + TypeScript que compila, se prueba y se publica sola.
- Una estructura de carpetas por dominio que les diga a los cambios 2 a 8 dónde va cada cosa.
- Scripts npm, lint, formato y tests iguales para todo el equipo, y un CI que los haga cumplir.
- Una URL pública con HTTPS para probar en el celular y, más adelante, para que funcione el service worker.
- Dejar decidido y argumentado si el MVP necesita backend.

**Non-Goals:**

- Funcionalidades de la app (llegan en los cambios siguientes).
- El pipeline de datos del campus (es `preparar-datos-campus`).
- PWA, service worker y caché sin conexión (es `tolerar-senal-irregular`).
- Backend, base de datos, autenticación o panel de administración.

## Decisions

### D1. ¿Hace falta backend? No para el MVP

El usuario pidió revisar esta pregunta. La analizamos necesidad por necesidad del MVP (brief v3 y v4):

| Necesidad del MVP | ¿Qué haría un backend? | ¿Cómo se resuelve sin backend? |
|---|---|---|
| Calcular la ruta (A\*) | Calcular en el servidor y devolver la polilínea. | El grafo es chico (685 nodos, 722 aristas, ~20 KB comprimido). A\* con heurística Manhattan tarda menos de 5 ms en un celular. Calcular en el dispositivo además funciona sin señal. |
| Datos del campus (grafo, lugares, plano) | Servirlos desde una API. | Son datos que cambian solo cuando el equipo edita Figma. Se generan en el build y se publican como archivos estáticos versionados. |
| Cierres temporales | Guardarlos en una base y exponer un ABM. | El brief v3 deja afuera el panel de administración: "los tramos cerrados se precargan manualmente antes de la prueba". Un JSON estático versionado en el repo alcanza; cambiarlo es un commit y un deploy (un par de minutos). |
| Clima | Consultar una API meteorológica real escondiendo la clave. | El brief v3 decide simular la API. Los escenarios (`seco`, `lluvia`, `error`, `lento`) se sirven como archivos estáticos pedidos por red, así que los errores de conexión son reales. |
| Cuentas, historial, preferencias | Guardarlos por usuario. | No hay cuentas en el MVP. Lo poco que se recuerda (recientes, último origen, escenario de clima de la prueba) vive en el navegador. |
| Señal irregular (brief v2; brief v4, hallazgos 5 y 7) | Un backend **empeora** esto: cada cálculo depende de la red. | Con todo en el dispositivo, una vez cargada la app se puede rutear sin conexión. |

**Conclusión:** el MVP es una SPA estática. Todo lo que hoy haría un backend se resuelve con archivos estáticos y cálculo en el navegador, y eso además responde mejor al hallazgo de señal irregular.

**Para que el cambio a un servicio real sea barato**, los datos "dinámicos" se piden por red aunque sean estáticos, con la misma forma que tendría una API: los cierres en `/data/cierres.json` y el clima simulado en una ruta tipo `/api/clima/<escenario>.json` (la forma exacta la define `adaptar-ruta-al-clima`). El código de `src/clima/` y `src/cierres/` consume una URL; el día que exista un servicio real, cambia la URL y no la app.

**Disparadores para agregar backend** (cualquiera de estos reabre la decisión):

1. **API de clima real con clave secreta.** La clave no puede estar en el bundle del navegador. Se resuelve con **una función serverless** (Netlify Functions o equivalente) que hace de proxy: guarda la clave como variable de entorno, consulta la API y cachea la respuesta unos minutos para no gastar cuota. La app solo cambia la URL de `/api/clima/...` a la función.
2. **Panel de administración de cierres** (funcionalidad 4 del brief v1, postergada en v3). Requiere **persistencia** (una base o un almacenamiento tipo KV) y **autenticación** del administrador. Sería un servicio chico con su propio cambio de OpenSpec; la app seguiría leyendo cierres desde una URL.
3. **Telemetría de la prueba con usuarios.** Si se quiere medir sin un observador (tiempo hasta llegar, rutas pedidas, errores de clima), hace falta un endpoint que reciba eventos. Puede ser una función serverless que escriba en una planilla o en un servicio de analítica respetuoso de la privacidad.
4. **Reportes colaborativos de cierres** (brief v4, propuesta 4, postergada): mismo caso que el panel, más moderación.

**Alternativas consideradas:**

- *Backend Node/Express con API REST desde el día uno:* agrega un servidor que mantener y pagar, un punto de falla con la red del campus y trabajo de deploy, sin que ninguna funcionalidad del MVP lo necesite. Descartada.
- *Backend-as-a-service (Firebase, Supabase) para los cierres:* resuelve persistencia y auth, pero el MVP no tiene quién edite los cierres desde la app. Queda como opción natural para el disparador 2.

### D2. Stack: React + Vite + TypeScript, SPA estática

- **React** porque la interfaz tiene mucho estado compartido (origen, destino, ruta, alternativas, clima, bottom sheet) y el equipo lo conoce. Para el mapa se usará react-leaflet (lo decide `construir-interfaz-movil`).
- **Vite** por el arranque rápido, el build optimizado y porque `public/` se sirve tal cual (útil para `public/data/`). Tiene un plugin de PWA maduro para el cambio 8.
- **TypeScript en modo estricto** (`strict`, `noUncheckedIndexedAccess`) porque los datos del grafo se indexan por id todo el tiempo y un id mal escrito es el error más probable.

*Alternativas:* Next.js o Remix (pensados para render en servidor, que no usamos); Svelte o Vue (igual de válidos, pero el equipo tiene más experiencia con React); JavaScript sin tipos (más rápido al principio, más errores con ids de nodos).

### D3. Estructura de carpetas por dominio

```
/
├── datos-fuente/          ← fuentes que el equipo mantiene a mano (las crea preparar-datos-campus)
├── scripts/               ← pipeline de datos (Node + TypeScript), corre en el build, no en el navegador
├── public/
│   └── data/              ← datos generados que consume la app (no se versionan)
├── src/
│   ├── datos/             ← carga y tipos de grafo, lugares y plano
│   ├── rutas/             ← A*, criterios de ruta, indicaciones (lógica pura, sin React)
│   ├── clima/             ← consulta del clima simulado
│   ├── cierres/           ← carga y aplicación de cierres
│   ├── ui/                ← componentes React (mapa, búsqueda, bottom sheet, ayuda)
│   ├── App.tsx
│   └── main.tsx
├── tests/e2e/             ← recorridos Playwright
├── docs/                  ← documentación del TP (ya existe)
└── openspec/              ← specs y cambios (ya existe)
```

Reglas: `src/rutas/`, `src/clima/`, `src/cierres/` y `src/datos/` no importan React (se testean con Vitest sin DOM). Solo `src/ui/` depende de React. Los tests unitarios van al lado del código (`*.test.ts`). `scripts/` puede importar tipos de `src/datos/` para que el formato generado y el que lee la app sean el mismo.

*Alternativa:* carpetas por tipo técnico (`components/`, `hooks/`, `utils/`). Descartada porque cada cambio de OpenSpec toca un dominio, y por dominio el impacto de cada cambio queda en una carpeta.

### D4. Scripts npm

| Script | Qué hace |
|---|---|
| `dev` | Servidor de desarrollo de Vite. |
| `build` | Chequeo de tipos y build de producción en `dist/`. |
| `preview` | Sirve `dist/` para probar el build (lo usa Playwright). |
| `lint` / `lint:fix` | ESLint sobre `src/`, `scripts/` y `tests/`. |
| `format` / `format:check` | Prettier. |
| `typecheck` | `tsc --noEmit` para app y scripts. |
| `test` / `test:watch` | Vitest. |
| `test:e2e` | Playwright contra `preview`. |

`preparar-datos-campus` agrega `datos:build` y lo engancha como paso previo de `dev` y `build`.

### D5. Tests: Vitest + Testing Library + Playwright móvil

- **Vitest** comparte la configuración de Vite (alias, TypeScript) y es rápido. Entorno `node` para la lógica y `jsdom` para componentes.
- **Testing Library** para probar componentes como los usa una persona (por rol y texto visible, en español), no por detalles internos.
- **Playwright** con un proyecto `movil`: viewport 390 × 844, `isMobile`, `hasTouch`, escala 3, Chromium. Es el tamaño de un celular de gama media actual y obliga a probar con toques. Un proyecto WebKit con el mismo viewport queda configurado para correr a mano (Safari en iPhone).

*Alternativas:* Jest (más configuración con Vite y ESM); Cypress (más pesado y con emulación táctil más limitada).

### D6. Lint y formato: ESLint + Prettier

ESLint con configuración plana, reglas recomendadas de TypeScript (`typescript-eslint`), `react-hooks` y `jsx-a11y` (la interfaz tiene que cumplir objetivos táctiles y contraste, conviene detectar problemas de accesibilidad temprano). Prettier se encarga solo del formato y ESLint no opina de formato (`eslint-config-prettier`). `.editorconfig` para fin de línea LF y UTF-8 (los nombres tienen tildes).

### D7. CI con GitHub Actions

Un workflow en cada push y pull request:

1. `npm ci` con caché de npm.
2. `npm run lint`, `npm run format:check`, `npm run typecheck`.
3. `npm test`.
4. `npm run build` (cuando exista, incluye `datos:build`, que falla si los datos no validan).
5. Job `e2e` (depende del anterior): instala Chromium de Playwright con caché, corre `npm run test:e2e` y sube el reporte como artefacto si falla.

La rama principal queda protegida: no se mergea si el CI falla. Node fijado a la LTS vigente (24) con `.nvmrc` y `engines`.

### D8. Hosting estático con HTTPS: Netlify (recomendado)

El service worker del cambio 8 exige HTTPS, y la prueba con usuarios necesita una URL que se abra desde cualquier celular.

- **Netlify (elegido):** HTTPS automático, deploy desde `main`, **vista previa por pull request** (útil para que el equipo y el moderador prueben antes de mergear), archivo `_headers` para controlar caché de `/data/` y `_redirects` para el fallback de la SPA. Si se activa el disparador 1 de D1, las funciones serverless están en el mismo lugar.
- *Vercel:* equivalente en todo lo anterior; cualquiera de los dos sirve.
- *GitHub Pages:* gratis y en el mismo lugar que el repo, pero publica bajo `/<repo>/` (obliga a configurar `base` y complica el alcance del service worker), no permite headers propios y no tiene vistas previas por PR. Queda como plan B.

El build es un `dist/` estático, así que cambiar de proveedor no toca el código.

### D9. Git

`git init` con rama `main`, `.gitignore` (node_modules, dist, reportes de Playwright, `public/data/` generado, `.env*`) y un primer commit con el estado actual del proyecto. Commits chicos asociados a tareas de OpenSpec; pull requests para cada cambio.

`mapa-unlam.png` (1,7 MB) y `mapa-unlam.svg` (1,6 MB) entran al repo: son fuentes del plano y no cambian seguido. Si en el futuro hay muchos renders pesados, se evalúa Git LFS.

## Risks / Trade-offs

- [Riesgo] Sin backend, cambiar un cierre requiere un commit y un deploy → Mitigación: en el MVP los cierres se cargan antes de la prueba (brief v3); el deploy automático tarda pocos minutos. Si hace falta cambiarlos en vivo, es el disparador 2 de D1.
- [Riesgo] Servir el clima simulado como archivo estático puede ocultar problemas que aparecerían con una API real (latencia, formatos, cuotas) → Mitigación: los escenarios `error` y `lento` simulan fallas y demoras; la URL es configurable para pasar a una función proxy.
- [Riesgo] El CI con e2e puede volverse lento → Mitigación: e2e en un job aparte con caché de navegadores y un solo proyecto (Chromium móvil) en CI.
- [Riesgo] Dependencia de un proveedor de hosting gratuito → Mitigación: el build es estático y portable; GitHub Pages como plan B documentado.
- [Riesgo] Emular un celular en Playwright no reproduce la red del campus ni un Safari real → Mitigación: el cambio 8 agrega pruebas con red cortada; la prueba con usuarios se hace en celulares reales.

## Migration Plan

1. `git init`, primer commit con el estado actual y push a un repositorio nuevo de GitHub.
2. Crear la app y la configuración en una rama, abrir PR, verificar que el CI pasa y mergear.
3. Conectar el repo a Netlify y verificar el primer deploy en la URL HTTPS.

Si hay que volver atrás, el primer commit conserva el estado previo intacto.

## Open Questions

- Nombre definitivo del repositorio y de la URL pública (por ejemplo `donde-queda-unlam`). Diferible hasta conectar el hosting.
- Si el equipo prefiere Vercel en lugar de Netlify por cuentas que ya tenga. No cambia el diseño.
