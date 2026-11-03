## Why

El brief v3 define el flujo principal del MVP como una sola tarea hecha desde el celular: abrir la app, ver el mapa, indicar origen y destino y obtener la ruta sin pasos de más (brief v3, "Flujo principal del MVP"). Para eso prioriza tres atributos: **eficiencia**, **tasa de errores** y **facilidad de aprendizaje** (brief v3, "Atributos de usabilidad priorizados"). Hoy existen los datos del campus (`preparar-datos-campus`) pero no hay una pantalla donde una persona pueda usarlos.

La evaluación del TP4 mostró que pocos toques no alcanzan si el usuario parte de un origen equivocado, no entiende qué hacer la primera vez o ve nombres distintos en el mapa y en la lista (brief v4, "Correcciones que entran en el MVP del TP5", hallazgos 1, 2, 6, 9, 10, 11 y 12). Todas esas correcciones caen en la capa de interfaz.

Tomamos como referencia fuerte a Google Maps: mapa a pantalla completa, barra "¿A dónde vas?", ficha del lugar en una hoja inferior y panel "Cómo llegar" con origen y destino apilados. Lo elegimos porque es un patrón que el segmento ya usa en el celular (brief v2: los cinco encuestados llevan siempre el celular). Reusar lo que ya conocen ayuda a la facilidad de aprendizaje sin agregar tutoriales, que el brief v4 posterga (propuesta 6). Que el patrón resulte familiar es un supuesto que se observa en la prueba del TP5.

## What Changes

- **Visor del mapa a pantalla completa** sobre el plano del campus, con pellizcar para hacer zoom, doble toque, arrastre con inercia, límites del campus, encuadre inicial de la zona de edificios y botón para recentrar.
- **Estructura de pantalla tipo Google Maps:** tarjeta de búsqueda flotante arriba, chips de referencias, botones flotantes circulares y una **hoja inferior** con tres alturas (colapsada, media y expandida). En escritorio la hoja pasa a ser un panel lateral izquierdo.
- **Búsqueda de lugares** a pantalla completa. Es tolerante a tildes y mayúsculas, encuentra por número de aula, nombre, alias o edificio, ordena los resultados de forma predecible, muestra el edificio y el estado "Sin acceso ahora", y guarda los destinos recientes en el dispositivo.
- **Ficha del lugar** en la hoja inferior, con nombre, edificio y botón "Cómo llegar".
- **Panel "Cómo llegar"** con origen (círculo) y destino (pin) apilados y un botón para intercambiarlos. El último origen aparece como sugerencia que hay que confirmar (hallazgo 1), hay referencias reconocibles para elegir el origen (hallazgo 2) y la ruta se pide sola cuando los dos datos son válidos (brief v3, paso 2). Cambiar el origen conserva el destino y sin destino no se calcula nada (hallazgo 11).
- **Ayuda contextual:** una indicación de primer uso mientras no haya destinos recientes (hallazgo 10), ayuda breve junto a los controles y un botón para volver a abrirla (hallazgo 6).
- **Navegación con el botón Atrás:** cada capa (búsqueda, ficha, panel) se cierra con el Atrás del navegador o de Android, como en Google Maps.
- **Tokens visuales** (paleta, tipografía, radios, espaciado, sombras), objetivos táctiles de al menos 44 px, contraste WCAG AA y áreas seguras de iOS.

### Fuera de alcance

- Dibujo de la ruta, tarjeta resumen, alternativas e indicaciones paso a paso: los hace `mostrar-ruta-e-indicaciones`. Acá solo queda reservado su lugar en la hoja inferior.
- Cálculo de la ruta (`calcular-ruta-astar`), cierres (`aplicar-cierres-temporales`) y clima (`adaptar-ruta-al-clima`). Esta interfaz muestra el estado "Sin acceso ahora" y pide la ruta, pero no decide ninguna de las dos cosas.
- Funcionamiento sin conexión y conservar la selección al recargar (`tolerar-senal-irregular`).
- Ubicación GPS del usuario (brief v1), elegir un punto libre tocando el mapa (brief v4, propuesta 2 postergada), servicio más cercano y horarios (brief v3), tutoriales extensos (brief v4, propuesta 6) y modo oscuro.
- Logos, nombre o marca de Google: la inspiración es de interacción, no de identidad.

## Capabilities

### New Capabilities

- `visor-de-mapa`: el mapa a pantalla completa con sus gestos, límites, encuadre inicial, botón recentrar, marcador del lugar elegido y rendimiento, más la estructura de la pantalla: hoja inferior de tres alturas, panel lateral en escritorio y cierre de capas con Atrás.
- `busqueda-de-lugares`: barra flotante "¿A dónde vas?", búsqueda tolerante, orden y contenido de los resultados, estado "Sin acceso ahora", recientes, chips de referencias, sin resultados, ficha del lugar y nombres iguales en toda la interfaz.
- `seleccion-de-recorrido`: panel "Cómo llegar" con origen y destino visibles y editables, último origen como sugerencia a confirmar, referencias reconocibles, intercambiar, pedido automático de la ruta, conservación del destino y casos sin destino u origen igual al destino.
- `ayuda-contextual`: indicación de primer uso, ayuda breve junto a los controles, leyenda de símbolos y botón para volver a abrir la ayuda.

### Modified Capabilities

Ninguna: `openspec/specs/` está vacío.

## Impact

- **Código nuevo:** `src/ui/` (mapa, hoja inferior, búsqueda, panel "Cómo llegar", ayuda, tema y estado de pantalla) y `src/busqueda/` (normalización e índice, lógica pura sin React). Tests unitarios y de componentes al lado del código, y recorridos e2e en `tests/e2e/`.
- **Dependencias nuevas:** `leaflet` y `react-leaflet` (decisión del plan compartido, punto 11). Íconos SVG embebidos, sin fuentes web ni librerías de componentes.
- **Consume** de `preparar-datos-campus`: el catálogo de lugares (nombre visible, edificio, categoría, puertas, alias, referencias) y las teselas del plano base.
- **Deja puntos de integración** para `aplicar-cierres-temporales` (estado de acceso de cada lugar), `calcular-ruta-astar` y `mostrar-ruta-e-indicaciones` (pedido de ruta y lugar en la hoja), `adaptar-ruta-al-clima` (aviso de clima) y `tolerar-senal-irregular` (estado serializable para restaurarlo).
- **Almacenamiento local:** destinos recientes, último origen y si se cerró la indicación de primer uso (`localStorage`, siempre tolerante a fallas).
- Sin backend ni cambios de hosting.
