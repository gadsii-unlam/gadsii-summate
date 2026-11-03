## 1. Grafo ruteable

- [x] 1.1 Definir los tipos `Criterio`, `ConsultaRuta`, `ResultadoRuta` y `GrafoRuteable` en el módulo de rutas según el design (decisión 9) y verificar que `tsc --noEmit` pasa sin errores.
- [x] 1.2 Implementar la preparación del grafo ruteable a partir del grafo cargado por `preparar-datos-campus`: coordenadas en centésimas de px enteras, longitud de cada arista como `|dx| + |dy|` entero (más sus `puntos` si los hubiera), flag `exterior` y adyacencia ordenada por id; verificar con un test que las 722 aristas quedan cargadas y que la suma de longitudes es 2 084 179 centésimas.
- [x] 1.3 Agregar los chequeos de carga: cada arista ortogonal, longitud recalculada igual a `peso` ± 0,06 px y longitud total menor que K = 10⁷; verificar con tests que un grafo con una arista diagonal o con un peso incoherente produce un error con el id de la arista.

## 2. Cola de prioridad

- [x] 2.1 Implementar un heap binario mínimo con comparador `(f, h, id)` e inserción perezosa y verificar con tests que extrae en orden correcto 10 000 elementos aleatorios con semilla y que los empates salen por `h` y luego por id.

## 3. Búsqueda A\*

- [x] 3.1 Implementar la heurística Manhattan al conjunto de puertas destino (mínimo de las distancias) en centésimas enteras y verificar con un test que, para todas las aristas y una muestra de 50 destinos, se cumple `h(u) ≤ longitud(u,v) + h(v)`.
- [x] 3.2 Implementar A\* multi-origen y multi-destino con conjunto cerrado y costos por criterio (`mas-corta`: K·longitud + exterior; `resguardada`: interior + K·exterior; la heurística de `mas-corta` multiplicada por K) y verificar con los casos reales del design (Aula 121 → Aula 110: 240,88 px; Aula 309 → Aula 103 resguardada: 1505,23 px con 261,09 px afuera; Gimnasio por la puerta 2).
- [x] 3.3 Implementar la exclusión de nodos y aristas (un nodo excluido anula sus aristas y no puede ser puerta de origen ni de destino) y verificar con tests que al excluir `entrada-salud-02` la ruta Aula 511 → Lab. de Microscopía mide 560,23 px y que al excluir `puerta-servicios-gimnasio-2` la ruta entra por la puerta 3.
- [x] 3.4 Implementar los resultados especiales `mismo-lugar`, `sin-ruta` (con motivo `origen-sin-puertas`, `destino-sin-puertas` o `sin-camino`) y `consulta-invalida` y verificar con tests cada caso (Estudio 2 con `pasillo-artes-y-medios-06` excluido da `sin-camino`; las tres puertas del Gimnasio excluidas dan `destino-sin-puertas`; `puerta-humanidades-999` da consulta inválida).

## 4. Resultado de la ruta

- [x] 4.1 Construir la secuencia de nodos y aristas, las puertas usadas y la polilínea sin puntos repetidos consecutivos y verificar con tests que empieza en la puerta de origen, termina en la de destino y todos sus tramos son ortogonales (incluido un recorrido que pasa por `pasillo-economicas-19`/`20`).
- [x] 4.2 Calcular distancia en px y en metros con `METROS_POR_PX`, metros al aire libre y tiempo (`max(1, round(m / 1,2 / 60))`) y verificar con tests que Aula 121 → Lab. de Microscopía da 1056,2 px, ≈ 370 m y 5 min, y que Entrada principal → Aula 121 informa 266,25 px afuera.

## 5. Optimalidad, determinismo y rendimiento

- [x] 5.1 Escribir un Dijkstra de referencia solo para tests (con costo simple y con costo lexicográfico exterior/distancia) y verificar que A\* coincide en distancia y exterior para los 39 903 pares de puertas con ambos criterios (o, si el test supera 30 s en CI, en una muestra fija con semilla de al menos 5 000 pares más los casos del design).
- [x] 5.2 Escribir el test de admisibilidad: para una muestra de destinos, `h(n) ≤ distancia real` de Dijkstra para todos los nodos, y verificar que pasa.
- [x] 5.3 Escribir el test de determinismo (misma consulta con las aristas mezcladas en 100 órdenes distintos) y verificar que la secuencia de nodos es idéntica en todos.
- [x] 5.4 Escribir el test de rendimiento (promedio de 1 000 consultas aleatorias con ambos criterios) y verificar que queda por debajo de 5 ms en CI.
- [x] 5.5 Documentar en el README del módulo de rutas la interfaz de `calcularRuta`, los criterios y por qué la heurística es admisible, y verificar que los ejemplos del README coinciden con los tests.

## 6. Integración

- [x] 6.1 Exponer la función de cálculo y el grafo ruteable ya preparado desde el módulo de datos de la app (preparado una sola vez al cargar) y verificar con un test de integración que una consulta con el `grafo.json` real devuelve la ruta Entrada principal → Aula 121 esperada.
- [x] 6.2 Correr `npm run lint`, `npm run test` y `npm run build` y verificar que pasan sin errores ni advertencias nuevas.

## Workflow follow-up

- Archivar el cambio con `openspec archive calcular-ruta-astar` cuando esté implementado y verificado.
