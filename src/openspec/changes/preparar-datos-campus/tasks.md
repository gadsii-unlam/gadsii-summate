## 1. Fuentes de datos

- [x] 1.1 Crear `datos-fuente/`, mover `grafo.json` desde la raíz y actualizar las referencias en `CLAUDE.md` y el README, y verificar con una búsqueda en el repo que no quedan referencias a la ruta vieja fuera de `docs/`
- [x] 1.2 Crear `datos-fuente/config.json` con `metrosPorPx: 0.35`, `toleranciaOrtogonalPx: 0.6` y los niveles de zoom −2 a 2, y verificar que el pipeline falla con un mensaje claro si falta un campo
- [x] 1.3 Crear `datos-fuente/lugares-curados.json` con su JSON Schema (secciones `edificios`, `lugares`, `referencias`, `otrosPisos`, `pendientes`, `exteriorForzado`) y verificar que el editor marca como error un campo desconocido
- [x] 1.4 Cargar en `pendientes` la lista "A revisar" del `CLAUDE.md` (218, 219, Aula Magna, 340, Call Center, sala bajo el 408, Estudio 1, salas rosas de Artes y Medios, baños de Arquitectura) y verificar que el archivo valida contra el schema
- [x] 1.5 Definir en `src/datos/` los tipos del grafo generado y del catálogo (según design.md, D2 y D6), importables desde `scripts/`, y verificar que `npm run typecheck` pasa en los dos proyectos

## 2. Grafo enriquecido y validaciones

- [x] 2.1 Implementar en `scripts/datos/` la lectura de `grafo.json` y las validaciones de error de design.md (D5): ids únicos, extremos existentes, sin bucles ni aristas repetidas, conexo, sin nodos aislados y ortogonal con 0,6 px, reportando todos los problemas juntos; verificar con tests de Vitest sobre grafos chicos armados a mano que cada caso falla con el id correcto
- [x] 2.2 Recalcular `px` como distancia Manhattan entre extremos y avisar si el `peso` exportado difiere en más de 0,1 px, y verificar con un test que una arista de (100, 200) a (160, 200) mide 60 px
- [x] 2.3 Calcular `m` con `metrosPorPx` redondeado a 0,1 y guardar el factor en el grafo generado, y verificar con un test que 100 px dan 35 m con 0,35 y 30 m con 0,30
- [x] 2.4 Marcar `exterior` en cada arista con la regla de nodo violeta (`depto: "central"`) y las excepciones de `exteriorForzado`, y verificar con el grafo real que salen 113 exteriores y 609 interiores, que `entrada-arquitectura-01`↔`pasillo-central-41` es exterior y que `entrada-salud-02`↔`pasillo-derecho-01` es interior
- [x] 2.5 Implementar los avisos del grafo (nodos en la misma posición, aristas de longitud 0, id de arista con otro formato, puertas con más de una arista) y verificar con el grafo real que el reporte lista los pares 130/130-2 y economicas-19/20 y la arista de longitud 0, y que el build no falla
- [x] 2.6 Escribir `public/data/grafo.json` con el formato de D2 (sin `adyacencia`, con `version` como hash del contenido) y verificar que tiene 685 nodos y 722 aristas y que la `version` no cambia si se corre dos veces sin cambios en las fuentes

## 3. Catálogo de lugares

- [x] 3.1 Implementar la agrupación de puertas por sufijo (D6) con la excepción de números de aula y la agrupación manual, y verificar con tests que Gimnasio tiene 3 puertas, que `estudio-2` es un lugar propio, que `230-3` forma "Aula 230" con aviso, y que con el grafo real salen 272 lugares, 8 de ellos con varias puertas
- [ ] 3.2 Implementar la derivación de nombres con el diccionario de D6 y verificar con un test que compara los 53 nombres no numéricos contra una lista esperada revisada por el equipo (incluye "Lab. de Microscopía", "Salón de las Américas", "Labs. A y B" y "Aula 121")
- [x] 3.3 Implementar edificio (por departamento desde la curación, propio para `servicios`) y categorías por reglas, y verificar con el grafo real los totales de D6 (219 aulas, 13 laboratorios, 8 baños, 8 servicios, 4 auditorios, 20 oficinas, 5 entradas) y que `servicios-teatro` tiene edificio "Teatro"
- [x] 3.4 Agregar los 5 lugares de entrada al campus y marcar las 11 referencias reconocibles iniciales, y verificar con un test que las 5 entradas aparecen con categoría `entrada` y marcadas como referencia
- [x] 3.5 Implementar alias (número de aula más los curados), piso `"PB"` por defecto y la caja de puertas, y verificar con tests que `formacion-continua-232` tiene el alias "232" y que la caja del Gimnasio contiene sus tres puertas
- [x] 3.6 Implementar la fusión con `lugares-curados.json` (nombre, edificio, categoría, alias, puertas) y `otrosPisos` (solo con `verificado: true`), y verificar con tests que un nombre curado pisa al derivado, que un lugar de otro piso sin verificar no aparece y queda en el reporte, y que un acceso inexistente hace fallar el build
- [x] 3.7 Implementar los avisos del catálogo (curaciones sin lugar, nombre repetido en un mismo edificio, puertas con sufijo sin base, pendientes, huecos de numeración) y verificar con el grafo real que los huecos reportados son 10, 205, 250, 264, 307 y 340
- [x] 3.8 Escribir `public/data/lugares.json` con el formato de D6 y verificar que tiene 277 lugares y que todas sus puertas existen en `public/data/grafo.json`

## 4. Plano base y teselas

- [x] 4.1 Implementar el filtro de respaldo que saca de `mapa-unlam.svg` los puntos (relleno `#9ADCFF`/`#C79AFF` con caja de 3 a 7 px) y las aristas (`stroke="#2563EB"`), y verificar que el resultado conserva las formas grandes celestes y no tiene ningún elemento que cumpla el criterio de punto
- [ ] 4.2 Reexportar desde la copia de Figma el frame `mapa-unlam` con `PUNTOS` y `ARISTAS` ocultos como `datos-fuente/mapa-base.svg`, y verificar que pasa el chequeo de plano limpio sin usar el filtro
- [x] 4.3 Implementar el chequeo de alineación (render 4x de `mapa-unlam.svg` y color celeste o violeta en la posición de cada nodo con ±2 px) y verificar que pasan los 685 nodos y que mover un nodo 10 px en un grafo de prueba hace fallar el chequeo
- [x] 4.4 Generar las teselas WebP sin pérdida de los zooms nativos −2 a 2 en `public/data/teselas/<version>/{z}/{x}/{y}.webp` (z de 0 a 4 en la ruta, según el contrato de D8), y verificar que salen 1601 teselas, que la tesela 0/0/0 empieza en el origen del plano y anotar en el design el peso total y el peso hasta el zoom 1
- [x] 4.5 Generar la imagen de respaldo `public/data/mapa-base.webp` a escala 1,5 y verificar que mide ≈ 2381 × 4507 y que no muestra puntos ni aristas
- [ ] 4.6 Revisar a ojo el zoom 2 en un celular 3x sobre Humanidades y Económicas y verificar que las etiquetas de aula se leen sin pixelado

## 5. Reporte, curación inicial y regeneración

- [x] 5.1 Escribir el reporte resumido en consola y completo en `scripts/salida/reporte-datos.md` (ignorado por git), separando errores, avisos e información, y verificar que con el grafo actual el build termina con éxito y el reporte muestra los duplicados, la arista de longitud 0, los pendientes y los huecos
- [ ] 5.2 Enganchar `datos:build` antes de `dev` y `build`, y subir el reporte como artefacto en el CI, y verificar en un PR que el reporte queda descargable y que un grafo con una diagonal hace fallar el job
- [ ] 5.3 Cargar la curación inicial: nombres de edificios, referencias reconocibles, nombres de los baños y de las oficinas con siglas, y verificar revisando cada departamento contra el plano que los nombres visibles coinciden con las etiquetas dibujadas
- [ ] 5.4 Documentar en el README y en `CLAUDE.md` el procedimiento de regeneración de design.md (D9), y verificar que otra persona del equipo lo sigue agregando un punto de pasillo de prueba en un grafo local y obtiene el reporte esperado

## 6. Chequeos de integración

- [x] 6.1 Desde un clon limpio, correr `npm ci && npm run build` y verificar que `dist/data/` contiene `grafo.json`, `lugares.json`, las teselas y la imagen de respaldo, y que el build no falla
- [x] 6.2 Con `npm run preview`, pedir `/data/grafo.json`, `/data/lugares.json` y una tesela del zoom 2 desde el navegador y verificar que responden 200 con el tipo de contenido correcto
- [x] 6.3 Superponer `grafo.svg` sobre las teselas en una página de prueba descartable y verificar a ojo en tres edificios que los nodos caen sobre las puertas y pasillos

## Workflow follow-up

- Archivar el cambio con `openspec archive preparar-datos-campus` cuando todas las tareas estén hechas; eso crea los specs `grafo-campus`, `catalogo-lugares` y `mapa-base` en `openspec/specs/`.
- Pasar a `calcular-ruta-astar` y `construir-interfaz-movil`, que dependen de estos datos.
