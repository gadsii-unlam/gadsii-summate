# scripts: pipeline de datos en Node + TypeScript (se ejecuta con tsx en el build, no en el navegador).

- `datos/build.ts`: `npm run datos:build` (fuentes de `datos-fuente/` → `public/data/` y `scripts/salida/reporte-datos.md`).
- `datos/importar-plano.ts`: `npm run datos:importar` (lee el grupo `grafo` de `mapa-unlam.svg` y genera `datos-fuente/grafo.json`, `datos-fuente/mapa-base.svg` y `grafo.svg`; la traducción de atributos está en `datos/importar.ts`).
