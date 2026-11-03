# Mapa UNLaM: navegación entre aulas

## Qué es este proyecto

Una aplicación para orientarse dentro de la UNLaM (Universidad Nacional de La Matanza). El usuario elige un **lugar de origen** y un **lugar de destino** (aulas, laboratorios, baños, oficinas, entradas…), y la app dibuja sobre el plano del campus una **línea con el camino** para llegar.

La base es un plano vectorial del campus (`mapa-unlam.svg`) que trae adentro un **grafo**: cada nodo es un punto (una puerta, un punto de pasillo, una entrada) y las aristas unen puntos vecinos por los que se puede caminar. Calcular la ruta es buscar el camino más corto en ese grafo (A*, en `src/rutas/`). Después la ruta se dibuja como una polilínea sobre el plano.

La app es una SPA en React + Vite + TypeScript, sin backend (ver `README.md`).

## El plano: `mapa-unlam.svg`

Está en la raíz del repo y es la **única fuente** del dibujo y del grafo. El dibujo actual (con la pista de atletismo y la columna oeste del Edificio Sur de 7 aulas) se exportó sin los atributos `data-*` del grafo (los nodos y aristas eran `<path>`), así que `mapa-unlam.svg` combina ese dibujo con el grupo `grafo` del plano anterior, que tenía los mismos nodos y aristas. Mide 2810 × 3745 px (≈ 0,18 m por px, `metrosPorPx` en `datos-fuente/config.json`). El grafo está al final, en el grupo `<g id="grafo">`, con sus propios estilos:

```
grafo
├── aristas
│   ├── aristas-interiores
│   │   └── aristas-edificio-{oeste,este,sur}-{pasillos,puertas}
│   ├── aristas-exteriores (caminos y puertas que dan al exterior)
│   ├── aristas-primer-piso (galería del 1er piso)
│   └── aristas-escaleras (la escalera junto a la Radio)
└── nodos
    ├── nodos-interiores → nodos-edificio-{oeste,este,sur}-{pasillos,puertas}
    ├── nodos-entradas-edificios
    ├── nodos-exteriores (caminos, puertas al exterior, accesos al campus)
    ├── nodos-primer-piso
    └── nodos-escaleras
```

- **Nodos:** `<circle id="…" cx cy>` con `data-tipo`, `data-ambito` (`interior`, `exterior`, `entrada`, `primer-piso`, `escalera`), `data-piso` (0 o 1), `data-nombre` y, en el interior, `data-edificio` (`edificio-oeste`, `edificio-este`, `edificio-sur`). `data-puerta="inferida"` marca una puerta cuya posición se dedujo.
- **Tipos de nodo** (`data-tipo`): `aula`, `laboratorio`, `bano`, `lugar` y `acceso-lugar` son puertas de lugares; `entrada` (de edificio) y `entrada-campus`; `frente-puerta`, `cruce`, `extremo` y `escalera` son puntos de pasillo.
- **Aristas:** `<line x1 y1 x2 y2>` con `data-desde`, `data-hasta` y `data-distancia` (px). En la app el id es `arista__<data-desde>__<data-hasta>`, **no** el `id="arista--…"` de la `<line>`.
- **Ids:** puertas `puerta-aula-121`, `puerta-lab-quimica`, `acceso-buffet`…; pasillos `pasillo-frente-aula-121`, `cruce--<pasillo>--<pasillo>`, `fin-<pasillo>-<lado>`; entradas `entrada-ed-<edificio>-<lugar>` y `entrada-campus-<nombre>`.
- **Edificios:** Edificio Oeste (aulas 1–11, 200, 250, 300), Edificio Este (400, 500, 600 y laboratorios), Edificio Sur (100). La red exterior (caminos, veredas, franjas entre edificios) es el depto `central`.
- **1er piso:** la galería de laboratorios, el Comedor y los salones deportivos (`data-piso="1"`). Se llega solo por la escalera junto a la Radio (`escalera-radio-planta-baja` ↔ `escalera-radio-primer-piso`). Los nodos del 1er piso están dibujados sobre su lugar en el plano.

### Reglas del grafo

- Aristas horizontales o verticales (tolerancia 0,6 px). Un camino que de verdad es diagonal se declara en `diagonalesPermitidas` de `datos-fuente/config.json`. Hoy hay uno: el camino diagonal de la entrada Florencio Varela al Edificio Sur (`arista__cruce-camino-diagonal-franja__cruce-camino-diagonal-vereda`).
- Cada puerta tiene una sola arista, hacia el punto de pasillo de enfrente.
- El grafo tiene que ser conexo y ningún nodo puede quedar sin aristas.
- **Al aire libre:** las aristas de `aristas-exteriores` y la de la escalera. El resto, bajo techo.

## Datos de la app (pipeline)

La app no lee el SVG directo:

1. `npm run datos:importar` lee el grupo `grafo` de `mapa-unlam.svg` y genera:
   - `datos-fuente/grafo.json`: nodos con `tipo` (`puerta`/`pasillo`/`entrada`), `depto`, `piso`, `nombre`, `categoria` y, en las puertas, `sala` (el contorno de la forma del plano que está detrás de la puerta, para resaltar el destino); aristas con `peso` y `exterior`.
   - `datos-fuente/mapa-base.svg`: el plano sin el grafo.
   - `grafo.svg`: solo el grafo, para ver ids.

   La traducción de atributos está en `scripts/datos/importar.ts`. Esos tres archivos no se editan a mano.
2. `npm run datos:build` (corre solo antes de `dev` y `build`):
   - Valida y genera `public/data/`: el grafo con `px`, `m` y `exterior`; el catálogo de lugares; el plano vectorial `mapa-base.svg` con los paths compactados; y su imagen de respaldo.
   - También chequea que `grafo.json` coincida con el plano. Si fallan esos chequeos, hay que volver a correr el importador.
   - Si falla, dice qué nodo o arista corregir.
3. Leer `scripts/salida/reporte-datos.md` y, si hace falta, actualizar:
   - `datos-fuente/lugares-curados.json`: nombres de edificio, alias, lugares de varias puertas, referencias y excepciones.
   - `datos-fuente/entradas.json`: el nombre de cada entrada de edificio en las indicaciones.
   - `datos-fuente/departamentos.json`: el departamento académico de cada aula (por número) y de las oficinas y laboratorios (por id de lugar). El plano nuevo no lo dice; se tomó del plano anterior.

Detalles del catálogo:

- **Ids de lugar:** el id de la puerta sin `puerta-` ni `acceso-` (`aula-121`, `buffet`). Las entradas al campus usan su propio id.
- **Nombre visible:** el `data-nombre` del plano, sin las aclaraciones "(acceso)" y "(1er piso)". La curación lo pisa.
- **Lugares de varias puertas:** se agrupan a mano en `lugares-curados.json`. Hoy son Biblioteca, Gimnasio, Rectorado y el Lab. de Habilidades Clínicas.
- **Departamento y edificio:** la ficha y la búsqueda muestran "Departamento · Edificio · Categoría" ("Derecho y Ciencia Política · Edificio Este · Aula"); las indicaciones nombran el edificio. Buscar "derecho" encuentra las aulas del departamento.
- **Destino en el mapa:** con una ruta, el plano pasa a gris suave y la sala del destino se pinta de rojo, con un punto en la puerta. Sin sala (entradas al campus, Dirección de Pedagogía, Aula 241) queda el pin. `sinSala` en `lugares-curados.json` apaga el resaltado de un lugar; hoy, el Dpto. de Derecho, cuya puerta cae en la celda de al lado.

Los tipos están en `src/datos/tipos.ts`.

## A revisar (dudas para el equipo)

- **Nombres de edificio:** el plano no los nombra. Se usan "Edificio Oeste/Este/Sur" y "Galería del 1er piso" (`edificios` en `lugares-curados.json` y `EDIFICIOS_CORTOS` en `src/rutas/indicaciones.ts`).
- **Escalera de la Radio:** en el plano mide 181 px (≈ 33 m) porque el 1er piso está dibujado más al norte que la planta baja. Además, se tomó como al aire libre.
- **Galería del 1er piso:** se tomó como bajo techo, porque en el plano sus aristas no están en `aristas-exteriores`.
- **Baños del natatorio:** las puertas son de ámbito exterior, pero sus aristas están en el grupo interior del Edificio Este. Se respeta el grupo, así que son tramos bajo techo.
- **Dos aulas 108 en el plano:** la primera de la fila de arriba del Edificio Sur y la primera de la columna oeste. Se tomó como Aula 108 la de la fila de arriba (la que ya estaba); la de la columna no tiene puerta en el grafo. Las puertas del 102 al 107 se movieron a la altura de los rombitos del dibujo nuevo.
- **Posibles aulas faltantes** (números ausentes entre dos aulas existentes): 10, 205 y 264.
- **Nombres poco descriptivos que vienen del plano:** "Lab (1)" y "Lab (2)" en el Edificio Este.
- **Departamentos dudosos:** del plano anterior salen la 501, 502, 503 y 507 en Derecho y la 601 a 612 en Salud. Las aulas 250 y 307, que el plano anterior no tenía, se asignaron por sus vecinas (Arquitectura y Formación Continua). Los laboratorios de la galería del 1er piso, Lab. Web, Lab. C, Aula Magna y los servicios no tienen departamento.
- **Escala:** `metrosPorPx` = 0,18 sale de comparar distancias entre aulas con el plano anterior (0,35 m/px, 1,92 px nuevos por px viejo). Conviene medir un tramo real.

## Plano anterior (Figma)

Hasta octubre de 2026 la app usaba otro plano, hecho en Figma, con el grafo marcado a mano. Ese grafo tenía 687 nodos con ids como `puerta-humanidades-121` y `pasillo-central-NN`, y su historia está en git. Los archivos siguen ahí, pero la app ya no los usa:

| Archivo | fileKey |
|---|---|
| [Mapa UNLaM (original)](https://www.figma.com/design/kuHT6QnIO9qmhceKXTYcyF/Mapa-UNLaM), no modificar | `kuHT6QnIO9qmhceKXTYcyF` |
| [Mapa UNLaM (copia)](https://www.figma.com/design/HjAApNyFMe6qOjAZVcLp1f/Mapa-UNLaM--copia-) | `HjAApNyFMe6qOjAZVcLp1f` |

Se accede con el MCP de Figma (cuenta `woker`). Antes de editar con `use_figma`, cargar el skill `figma:figma-use`.
