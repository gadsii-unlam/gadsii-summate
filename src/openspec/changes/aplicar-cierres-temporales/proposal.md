## Why

Encontrarse un pasillo, una escalera o una puerta cerrada es uno de los problemas que más tiempo les hace perder a los ingresantes. En la encuesta del TP2 (brief v2, "Necesidades, problemas y contexto de uso relevados"), cuatro de cinco encontraron sectores cerrados varias veces: dos dieron la vuelta sin problema, uno tardó bastante en encontrar otro camino y otro tuvo que preguntar. El supuesto 4 del TP1 quedó **confirmado**, y la hipótesis de valor exige llegar "sin intentar pasar por un acceso cerrado" (brief v2, "Hipótesis de valor").

El brief v3 (Scope del MVP y "Qué se construye y qué se simula") define cómo resolverlo en el MVP: **el motor excluye siempre los tramos cerrados**, pero **no hay panel de administración**; los cierres los precarga el equipo a mano antes de la prueba. El brief v4 mantiene esa decisión (cuestiona los reportes colaborativos de cierres, hallazgo 4) y agrega dos correcciones de la evaluación de Bananza:

- **Hallazgo 9:** el destino sin acceso aparecía con un "-"; tiene que decir **"Sin acceso ahora"** para que el usuario conozca el impedimento antes de pedir la ruta.
- **Flujo ajustado, paso 5:** "Excluir siempre los tramos cerrados precargados", también cuando llueve.

El wireframe del TP3 (pantallas P3 y P6) ya mostraba el tramo cerrado marcado en el mapa y un estado "No hay un camino disponible" con el motivo escrito en términos del campus. Este cambio convierte todo eso en conducta concreta, apoyándose en el motor de `calcular-ruta-astar`, que ya acepta un conjunto de tramos excluidos.

## What Changes

- **Archivo de cierres precargados**, versionado en el repo y publicado con la app: cada cierre tiene un id, un motivo, los nodos y/o aristas que cierra y una vigencia opcional (`desde` / `hasta`).
- **Vigencia por fecha y hora del dispositivo:** un cierre solo aplica dentro de su intervalo. Para verificar cierres futuros, el equipo puede simular la fecha con un parámetro de URL (con un aviso visible).
- **Exclusión al rutear:** todos los cierres vigentes se pasan al motor como tramos excluidos, con cualquier criterio y cualquier clima. Cerrar un nodo cierra todas sus aristas.
- **Lugares con varias puertas:** si una puerta está cerrada, la ruta usa otra.
- **"Sin acceso ahora"** para los lugares a los que no se puede llegar desde ninguna entrada del campus.
- **"Sin ruta disponible"** con el motivo del cierre y el destino marcado en el mapa cuando no hay camino.
- **Aviso de desvío:** si la ruta habitual pasaba por un tramo cerrado, el resultado lo dice ("Evitamos un tramo cerrado: …").
- **Tramos cerrados visibles en el mapa**, al estilo de los cortes de Google Maps (línea roja punteada e ícono de paso prohibido), con el motivo al tocarlos.
- **Tolerancia a errores del archivo:** ids desconocidos se ignoran con advertencia en consola; si no se puede descargar el archivo se usa la copia incluida en la app.
- **Procedimiento documentado** para que el equipo cargue y verifique los cierres antes de la prueba con usuarios, más un chequeo automático del archivo en CI.

### Fuera de alcance

- Panel de administración de cierres, autenticación y persistencia en servidor (brief v3, excluido del MVP; disparador de backend según la decisión 2 del plan).
- Reportes colaborativos de cierres con fotos o texto (brief v4, propuesta 4 cuestionada).
- Horarios de atención de los lugares (brief v3, postergado). Un cierre con vigencia no es un horario: es una excepción puntual.
- El componente visual concreto de la lista, la tarjeta de resultado y la capa del mapa: los construyen `construir-interfaz-movil` y `mostrar-ruta-e-indicaciones`. Acá se define la conducta.

## Capabilities

### New Capabilities

- `cierres-temporales`: carga de los cierres precargados, vigencia, exclusión de tramos al calcular rutas, uso de otra puerta, estados "Sin acceso ahora" y "Sin ruta disponible" con motivo, aviso de desvío, tramos cerrados visibles en el mapa y manejo de ids desconocidos.

### Modified Capabilities

Ninguna.

## Impact

- **Datos nuevos:** archivo de cierres publicado como recurso estático (`/data/cierres.json`), inicialmente vacío o con los cierres de ejemplo de la prueba.
- **Código nuevo:** módulo de cierres (carga, validación, vigencia, cálculo de accesibilidad y motivos) y su capa en el mapa; script de validación del archivo para CI.
- **Depende de:** `calcular-ruta-astar` (tramos excluidos y resultado "sin ruta"), `preparar-datos-campus` (ids de nodos y aristas, catálogo de lugares con sus puertas).
- **Lo usan:** `busqueda-de-lugares` (muestra "Sin acceso ahora"), `visualizacion-de-ruta` (aviso de desvío, pantalla sin ruta), `adaptar-ruta-al-clima` (los cierres valen para los dos criterios), `tolerar-senal-irregular` (el archivo se precachea).
- **Documentación:** guía de precarga de cierres para el equipo en `docs/`.
- **Sin backend:** el archivo es estático (decisión 2 del plan).
