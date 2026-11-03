## Why

Todo lo que hace *¿Dónde queda?* se apoya en tres datos: el grafo de pasillos para calcular la ruta, la lista de lugares que el usuario puede elegir y el plano sobre el que se dibuja el recorrido. Hoy esos datos existen, pero en el formato en que salieron de Figma, no en el que necesita la app:

- `grafo.json` tiene 685 nodos y 722 aristas, pero no dice qué tramos son exteriores (necesario para la ruta resguardada con lluvia, brief v3, "Scope del MVP") ni da distancias en metros (necesarias para la tarjeta "4 min · 280 m").
- No hay una lista de lugares: los destinos están escondidos en ids como `puerta-derecho-lab-de-microscopia` o `puerta-servicios-gimnasio-3`, sin tildes ni mayúsculas, con lugares de varias puertas mezclados y sin el edificio ni la categoría.
- `mapa-unlam.svg` incluye los puntos de los 685 nodos y 721 aristas de construcción dibujados encima del plano, pesa 1,6 MB y tiene 3737 paths, demasiado para manejarlo con fluidez en un celular.

El brief v4 hace estos datos más urgentes: el hallazgo 12 pide **unificar los nombres** de edificios y lugares en toda la interfaz; los hallazgos 1 y 2 piden **referencias reconocibles** para elegir el origen (entradas, Biblioteca, Buffet); y el hallazgo 3 pide **piso y escalera** para las aulas que no están en planta baja. Además, el grafo tiene casos sin resolver anotados en el `CLAUDE.md` ("A revisar") que no pueden romper la app pero tampoco pueden perderse de vista.

Sin este cambio, el A\* (`calcular-ruta-astar`) y la interfaz (`construir-interfaz-movil`) no tienen sobre qué trabajar.

## What Changes

- Un **pipeline de datos** que corre en el build: lee el grafo exportado de Figma, lo valida y genera los datos que consume la app.
- **Grafo enriquecido:** cada arista con su longitud en px, su distancia en metros (con un factor de conversión configurable) y la marca `exterior` (una arista es exterior si uno de sus extremos es un nodo violeta de la red de veredas). Hoy salen 113 aristas exteriores y 609 interiores.
- **Validaciones que frenan el build** si el grafo está roto: no conexo, aristas en diagonal (más de 0,6 px de desvío), nodos sin aristas, ids repetidos o aristas que apuntan a nodos inexistentes.
- **Reporte de casos a revisar que no frena el build:** nodos duplicados en la misma posición, aristas de longitud 0, puertas que faltan según el `CLAUDE.md` y huecos en la numeración de aulas.
- **Catálogo de lugares** derivado de las puertas: un lugar por aula o espacio, con nombre visible, edificio, categoría, puertas, alias de búsqueda, piso e indicación de llegada. Salen 272 lugares de las 283 puertas (8 con varias puertas) más las 5 entradas al campus como referencias de origen.
- Un **archivo de nombres curados a mano** que pisa lo derivado automáticamente (tildes, abreviaturas, alias, referencias reconocibles, lugares de otros pisos con su indicación verificada).
- **Plano base** sin puntos ni aristas, en el mismo sistema de coordenadas que el grafo, servido como teselas raster por niveles de zoom y con una imagen única de respaldo.
- Documentación de **cómo regenerar los datos** cuando el equipo cambia el grafo en Figma.

### Fuera de alcance

- El cálculo de rutas (A\*) y los criterios `mas-corta` / `resguardada`: es `calcular-ruta-astar`.
- Los cierres temporales: es `aplicar-cierres-temporales`.
- El visor del mapa (gestos, zoom, límites): es `construir-interfaz-movil`.
- Agregar puntos o aristas en Figma, resolver los casos "A revisar" o sumar puntos de otros pisos (multipiso queda como trabajo futuro). Este cambio los reporta, no los corrige.
- Horarios de atención y "servicio más cercano" (brief v3, excluidos del MVP).

## Capabilities

### New Capabilities

- `grafo-campus`: carga y validación del grafo de pasillos del campus (conexo, ortogonal, sin nodos aislados, ids únicos), reporte de casos a revisar, clasificación interior/exterior de cada tramo y distancias en metros.
- `catalogo-lugares`: qué es un lugar del campus y cómo se presenta: nombre visible, edificio, categoría, puertas, alias de búsqueda, referencias reconocibles para el origen, piso e indicación de llegada para otros pisos, y nombres unificados en toda la interfaz.
- `mapa-base`: el plano del campus que ve el usuario, sin elementos de construcción, alineado con las coordenadas del grafo y nítido al hacer zoom.

### Modified Capabilities

Ninguna (no hay specs previos).

## Impact

- **Archivos fuente:** `grafo.json` pasa a `datos-fuente/` junto con el plano base reexportado de Figma y el archivo de nombres curados. Se actualizan las referencias en `CLAUDE.md`.
- **Código nuevo:** scripts del pipeline en `scripts/`, tipos compartidos en `src/datos/`.
- **Datos generados:** `public/data/` (grafo, lugares, teselas, imagen de respaldo). No se versionan; se regeneran en cada build.
- **Dependencias de desarrollo:** un rasterizador de SVG y un procesador de imágenes para las teselas, y un ejecutor de TypeScript para Node.
- **Build y CI:** `npm run build` falla si el grafo no valida; el reporte de casos a revisar queda en la salida del CI.
- **Equipo:** cada cambio en Figma (puntos, aristas, nombres de aulas) requiere regenerar los datos con un comando; lo que no esté curado a mano se muestra con un nombre derivado.
