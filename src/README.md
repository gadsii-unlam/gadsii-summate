# Summate

Integrantes: Agasi Alejo, Huergo Estefanía, Naspleda Julián, Panigazzi Agustín, Rios Cristian

Producto: ¿Dónde queda?, una aplicación web que calcula y muestra la ruta más corta entre dos puntos del campus de la UNLaM.

Segmento de la comunidad UNLaM: Ingresantes y estudiantes de primer año que todavía no conocen bien la distribución del campus.

## La app

SPA estática con React + Vite + TypeScript, pensada primero para el celular. No tiene backend: la ruta se calcula en el navegador y los datos (grafo, lugares, cierres, clima simulado) se publican como archivos estáticos. La decisión y los casos que justificarían agregar un backend están en [`openspec/changes/configurar-base-app/design.md`](openspec/changes/configurar-base-app/design.md) (D1, "¿Hace falta backend?").

**URL pública:** <https://donde-queda.donde-queda.workers.dev> (Cloudflare Workers).

### Cómo levantar el proyecto

Requisitos: Node 24 LTS (está fijado en `.nvmrc`; con nvm alcanza con `nvm use`).

```sh
npm ci
npx playwright install chromium webkit   # solo para los tests e2e
npm run dev                              # http://localhost:5173
```

### Scripts npm

| Script                            | Qué hace                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run datos:build`             | Pipeline de datos: valida el grafo y genera `public/data/` (ver "Datos del campus").              |
| `npm run datos:importar`          | Lee el grafo del plano (`mapa-unlam.svg`) y regenera `datos-fuente/grafo.json` y `mapa-base.svg`. |
| `npm run dev`                     | `datos:build` y servidor de desarrollo de Vite.                                                   |
| `npm run build`                   | `datos:build`, chequeo de tipos y build de producción en `dist/`.                                 |
| `npm run preview`                 | Sirve `dist/` para probar el build.                                                               |
| `npm run lint` / `lint:fix`       | ESLint sobre `src/`, `scripts/` y `tests/`.                                                       |
| `npm run format` / `format:check` | Prettier (escribe / solo revisa).                                                                 |
| `npm run typecheck`               | `tsc` para la app, los scripts y la configuración.                                                |
| `npm test` / `test:watch`         | Vitest (lógica en entorno node, componentes de `src/ui/` en jsdom).                               |
| `npm run test:e2e`                | Playwright, proyecto `movil` (Chromium, 390 × 844, táctil). Levanta el build con `preview` solo.  |
| `npm run test:e2e:sin-conexion`   | Solo la suite sin conexión (`tests/e2e/sin-conexion/`), con su propio build en el puerto 4183.    |

El proyecto WebKit (Safari en iPhone) se corre a mano: `npx playwright test --project=webkit`.

### Estructura

| Carpeta                                                  | Qué va                                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/datos/`, `src/rutas/`, `src/clima/`, `src/cierres/` | Lógica pura, sin React (ESLint lo impide).                             |
| `src/conexion/`                                          | Sin conexión: estado de la red, reintentar, recorrido guardado (pura). |
| `src/ui/`                                                | Componentes React.                                                     |
| `public/data/`                                           | Datos generados que consume la app (no se versionan).                  |
| `datos-fuente/`                                          | Fuentes del pipeline de datos (se versionan).                          |
| `scripts/`                                               | Pipeline de datos (Node + TypeScript, se corre con `tsx`).             |
| `tests/e2e/`                                             | Recorridos Playwright.                                                 |

Los tests unitarios van al lado del código (`*.test.ts`, `*.test.tsx`).

### Datos del campus

El plano es `mapa-unlam.svg` (raíz del repo): el dibujo del campus (2810 × 3745 px, ≈ 0,18 m por px) con el grafo de navegación adentro, en el grupo `<g id="grafo">`. Cada nodo es un `<circle>` con `data-tipo`, `data-ambito`, `data-piso`, `data-nombre` y `data-edificio`, y cada arista una `<line>` con `data-desde` y `data-hasta`. `npm run datos:importar` lo pasa a `datos-fuente/`.

`npm run datos:build` (corre solo antes de `dev` y `build`) lee las fuentes de `datos-fuente/`, valida el grafo y escribe en `public/data/` los datos que usa la app. Si el grafo está roto (no conexo, aristas en diagonal que no están permitidas, nodos sin aristas, ids repetidos, aristas hacia nodos que no existen, plano base con el grafo adentro, o `grafo.json` desactualizado respecto de `mapa-unlam.svg`) termina con error y el build se frena. Los casos dudosos no frenan: van al reporte `scripts/salida/reporte-datos.md` (en el CI queda como artefacto `reporte-datos`).

| Fuente (`datos-fuente/`) | Qué es                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| `grafo.json`             | Nodos (con piso, nombre y categoría del plano) y aristas. Lo genera `npm run datos:importar`.     |
| `mapa-base.svg`          | Plano sin el grupo `grafo`. También lo genera `npm run datos:importar`.                           |
| `lugares-curados.json`   | Nombres de edificio, alias, lugares de varias puertas, referencias, pendientes y excepciones.     |
| `entradas.json`          | Nombre de cada entrada de edificio para las indicaciones ("por la entrada norte").                |
| `departamentos.json`     | Departamento académico de cada aula (por número) y de otros lugares (por id), del plano anterior. |
| `config.json`            | `metrosPorPx`, tolerancia de aristas rectas, diagonales permitidas y escala del respaldo.         |
| `*.schema.json`          | JSON Schema de los anteriores (el editor marca los campos desconocidos).                          |

| Generado (`public/data/`) | Tipo (`src/datos/tipos.ts`) | Qué tiene                                                                 |
| ------------------------- | --------------------------- | ------------------------------------------------------------------------- |
| `grafo.json`              | `GrafoCampus`               | Nodos y aristas con `px`, `m` y `exterior`; `metrosPorPx` y `version`.    |
| `lugares.json`            | `CatalogoLugares`           | Lugares con nombre, edificio, categoría, puertas, caja, alias, piso, etc. |
| `plano.json`              | `PlanoBase`                 | Versión del plano, tamaño, URL del SVG y del respaldo.                    |
| `mapa-base.svg`           | —                           | Plano vectorial que dibuja la app (paths con coordenadas relativas).      |
| `mapa-base.webp`          | —                           | Imagen única de respaldo a escala 1, por si el SVG no se puede mostrar.   |

#### Cuando el equipo cambia el plano o el grafo

1. Editar `mapa-unlam.svg` (o reemplazarlo por un plano nuevo con la misma estructura): nodos como `<circle>` y aristas como `<line>` dentro de `<g id="grafo">`, ids únicos y aristas horizontales o verticales. Un camino que de verdad es diagonal se declara en `diagonalesPermitidas` de `datos-fuente/config.json`.
2. Correr `npm run datos:importar`: regenera `datos-fuente/grafo.json`, `datos-fuente/mapa-base.svg` y `grafo.svg` (solo el grafo, para ver los ids). No editar esos archivos a mano.
3. Correr `npm run datos:build`. Si falla, el mensaje dice qué nodo o arista corregir en el plano. Para probar un grafo sin tocar el del repo: `npm run datos:build -- --fuentes=<carpeta> --salida=<carpeta> --sin-plano`.
4. Leer el reporte (`scripts/salida/reporte-datos.md`): lugares con nombre derivado, curaciones sin lugar (un id que cambió en el plano cambia el id del lugar), posibles aulas faltantes.
5. Actualizar `datos-fuente/lugares-curados.json` y `datos-fuente/entradas.json` si hace falta y commitear plano, fuentes y curación en el mismo PR. El CI vuelve a validar y el deploy publica los datos con otra `version`.

### Integración continua y hosting

- GitHub Actions (`.github/workflows/ci.yml`) corre lint, formato, tipos, tests y build en cada push y pull request, y después los e2e. El reporte de datos del campus queda siempre como artefacto (`reporte-datos`); si fallan los e2e, también el de Playwright.
- Cloudflare Workers (`wrangler.toml`, assets estáticos) publica `dist/` con HTTPS: `npm run build && npx wrangler deploy` (la primera vez, `npx wrangler login`). `public/_headers` tiene la caché y `not_found_handling = "single-page-application"` hace el fallback de la SPA.

### Funcionamiento sin conexión (service worker)

La app es una PWA (`vite-plugin-pwa`, configuración en `scripts/pwa/opciones.ts`):

- **Precache** al instalar (≈ 2,3 MB sin comprimir; el SVG del plano viaja comprimido, ≈ 230 KB con gzip): la app, los íconos, el manifiesto, el grafo, el catálogo, la descripción del plano, el plano vectorial (`mapa-base.svg`) y la imagen de respaldo. Sin conexión el plano entero se ve nítido en cualquier zona y zoom.
- **Cierres**: primero la red (4 s) y si no la última copia guardada; la app avisa "Cierres sin actualizar desde las HH:MM".
- **Clima**: siempre a la red, nunca de la caché.
- **Versión nueva**: queda en espera y la app ofrece "Actualizar" solo sin un recorrido en pantalla.

En desarrollo (`npm run dev`) el service worker está apagado: para probarlo, `npm run build` y `npm run preview`.

#### Plan de salida

Si un service worker publicado causa problemas (por ejemplo, deja a los usuarios con una versión rota en caché), se publica un build que lo desactiva:

1. Compilar con `PWA_AUTODESTRUIR=1 npm run build` (si el deploy se arma en Cloudflare desde el repositorio: agregar la variable de build `PWA_AUTODESTRUIR` = `1` en _Settings → Build_ del Worker y volver a publicar).
2. Ese build reemplaza `sw.js` por uno que borra todas las cachés, se desregistra y recarga las pestañas abiertas. La app sigue funcionando, solo con red. El usuario no tiene que hacer nada: pasa en la próxima visita, porque `sw.js` se sirve con `Cache-Control: no-cache`.
3. Cuando se corrige el problema, se quita la variable y se publica de nuevo: el service worker nuevo se registra como en una primera visita.

El test `plan de salida` de `tests/e2e/sin-conexion/servidor.spec.ts` comprueba los pasos 1 y 2 en una vista previa local.
