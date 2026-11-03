## Why

El corazón de _¿Dónde queda?_ es responder "¿cómo llego desde acá hasta allá?" con un camino correcto y corto. El brief v1 (sección 3, funcionalidad 1) define el producto como "calcular la ruta más corta disponible" entre dos lugares del campus, y el brief v3 (Scope del MVP y "Qué se construye y qué se simula") deja el motor de rutas como una de las dos piezas que **no** se simulan: es lo que pone a prueba la hipótesis de valor (llegar en menos de cinco minutos sin pedir indicaciones).

Con el cambio `preparar-datos-campus` ya tenemos el grafo del campus (685 nodos, 722 aristas, todas horizontales o verticales, conexo) y el catálogo de lugares. Falta la pieza que, dado un origen y un destino, devuelve el recorrido. La cátedra y el equipo pidieron explícitamente que el cálculo use **A\***, y además necesitamos dos criterios desde el primer día:

- **Más corta**, el criterio por defecto (brief v3, flujo principal, paso 4: "si no llueve, prioriza la ruta más corta").
- **Resguardada**, que minimiza los metros al aire libre para el caso de lluvia (brief v1, funcionalidad 5; brief v2: 3 de 5 encuestados prefieren desviarse para no mojarse).

También hay que resolver bien los lugares con más de una puerta (Gimnasio, Buffet, Labs de Idiomas, Aula 230, Sector Administrativo): el usuario elige "Gimnasio", no "la puerta 2 del Gimnasio", y la app tiene que llevarlo por la puerta que más le convenga.

Este cambio construye esa pieza como una función pura y bien testeada, sin pantallas, para que los cambios siguientes (cierres, clima, interfaz, ruta e indicaciones) la usen sin tener que entender el algoritmo.

## What Changes

- Motor de cálculo de rutas con **A\*** sobre el grafo del campus, con heurística de distancia Manhattan (admisible y consistente porque todas las aristas son ortogonales y el peso es su longitud).
- Dos criterios: `mas-corta` (menor distancia; a igual distancia, menos metros al aire libre) y `resguardada` (menos metros al aire libre; a igualdad, menor distancia total).
- Origen y destino como **conjuntos de puertas**: la ruta sale por la puerta de origen y entra por la puerta de destino que den el mejor recorrido.
- Recepción de un conjunto de **tramos excluidos** (nodos y aristas) que el motor no puede usar. El motor no sabe de dónde vienen: los cierres los aporta `aplicar-cierres-temporales`.
- Resultado completo: secuencia de nodos y aristas, polilínea en coordenadas del mapa, distancia en px y metros, tiempo estimado, metros al aire libre, puertas usadas y criterio aplicado; o "sin ruta" con el lado que quedó aislado; o "mismo lugar" si origen y destino coinciden.
- Resultados **deterministas**: la misma consulta devuelve siempre la misma ruta, aunque haya empates.
- Batería de tests que compara A\* contra un Dijkstra de referencia en todos los pares de puertas del campus y verifica la heurística arista por arista.

### Fuera de alcance

- Cómo se dibuja la ruta, las alternativas en pantalla y las indicaciones paso a paso (`mostrar-ruta-e-indicaciones`).
- Qué criterio se recomienda según el clima (`adaptar-ruta-al-clima`).
- Leer, validar y aplicar el archivo de cierres (`aplicar-cierres-temporales`).
- Rutas entre pisos: solo hay planta baja (decisión 4 del plan). Multipiso queda como trabajo futuro.
- Servicio más cercano ("ir al baño más cerca"), postergado por el brief v3. El motor multi-destino lo deja preparado, pero no se expone.
- Navegación en vivo o GPS (brief v1, integraciones: no se usa la ubicación del usuario).

## Capabilities

### New Capabilities

- `calculo-de-rutas`: cálculo con A\* de la ruta óptima entre dos conjuntos de puertas según el criterio `mas-corta` o `resguardada`, respetando tramos excluidos, con resultado determinista que incluye nodos, polilínea, distancia, tiempo y metros al aire libre, y casos "sin ruta" y "mismo lugar".

### Modified Capabilities

Ninguna.

## Impact

- **Código nuevo:** módulo de rutas en el front (A\*, cola de prioridad, construcción del resultado) y sus tests unitarios con Vitest. No se toca la interfaz.
- **Depende de:** `preparar-datos-campus` (grafo cargado y validado, clasificación `exterior` de cada arista, constante `METROS_POR_PX`, catálogo con las puertas de cada lugar).
- **Lo usan:** `aplicar-cierres-temporales` (pasa los tramos excluidos), `adaptar-ruta-al-clima` (pide los dos criterios y los compara), `mostrar-ruta-e-indicaciones` (dibuja la polilínea y arma los pasos desde la secuencia de nodos).
- **Sin backend:** el cálculo corre en el navegador (decisión 2 del plan); con 685 nodos tarda pocos milisegundos y funciona sin conexión.
