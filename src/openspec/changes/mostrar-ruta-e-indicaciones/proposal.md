## Why

El cálculo de la ruta (`calcular-ruta-astar`) devuelve una secuencia de nodos con distancia, tiempo y metros al aire libre, y la recomendación según el clima (`adaptar-ruta-al-clima`) decide qué ruta se recomienda y cuál queda como alternativa. Pero nada de eso le sirve al Navegante si no lo ve: el brief v3 pone como pasos 5 y 6 del flujo "mostrar el recorrido" dibujado claramente sobre el mapa, con origen y destino identificados, y que "permanezca visible sin requerir actualizaciones continuas" (brief v3, "Flujo principal del MVP").

La evaluación del TP4 agregó dos huecos que este cambio cierra:

- **Hallazgo 3:** "la ruta llega al edificio, pero no orienta hasta el aula". Una línea sobre el mapa no alcanza para un ingresante que no conoce el campus: hacen falta **indicaciones paso a paso** ("salí de Económicas al aire libre", "doblá a la izquierda", "entrá a Salud por la entrada oeste") y, para los lugares de otros pisos, el piso y la escalera con datos verificados (brief v4, "Correcciones que entran en el MVP del TP5").
- **Hallazgo 8:** falta un indicador de cálculo. El usuario tiene que distinguir una espera de un toque que no se registró, así que mostramos "Buscando el camino…" mientras se obtiene la ruta.

Además, el brief v2 mostró que con lluvia la preferencia se divide (tres de cinco prefieren desviarse para no mojarse, dos eligen lo más rápido). Por eso la vista tiene que **mostrar cuánto del recorrido es al aire libre** y dejar cambiar entre las alternativas con un toque. El wireframe del TP3 ya marcaba el tramo descubierto como "una propiedad de la ruta y no del clima": se ve siempre, llueva o no.

La hipótesis de valor exige llegar "sin pedir indicaciones" (brief v2). Este cambio es el que convierte la ruta calculada en algo que se puede seguir caminando.

## What Changes

- **Estado "Buscando el camino…"** en la hoja inferior mientras se obtiene la ruta (cierres, clima y cálculo), sin parpadeo cuando la respuesta es inmediata.
- **Dibujo de la ruta al estilo Google Maps:** polilínea azul `#1A73E8` con borde oscuro; los tramos al aire libre con trazo punteado y una leyenda; círculo azul con borde blanco en el origen y pin rojo en el destino; la alternativa no elegida en gris por debajo, tocable.
- **Encuadre automático** de la ruta completa en la parte del mapa que no tapan la tarjeta superior ni la hoja inferior.
- **Tarjeta resumen** en la hoja: "2 min · 165 m" y "Incluye 60 m al aire libre" o "Todo bajo techo".
- **Chips de alternativas** ("Más resguardada · Recomendada con lluvia", "Más rápida") cuando hay dos rutas distintas; cambiar de chip redibuja la ruta, el resumen y las indicaciones sin volver a calcular.
- **Botón "Indicaciones"** que abre la lista paso a paso, y **"Finalizar viaje"** para cerrar el recorrido (como en el wireframe del TP3).
- **Indicaciones paso a paso** generadas en el dispositivo a partir de la ruta: salir del lugar de origen, seguir N metros, doblar a la izquierda o a la derecha, salir o entrar a un edificio por una entrada con nombre, pasar de un edificio a otro bajo techo y llegar con el lado de la puerta. Distancias redondeadas a 5 m y pasos al aire libre marcados.
- **Texto de piso y escalera** al final de las indicaciones para los lugares de otros pisos, tomado del catálogo (dato curado y verificado; nunca inventado).
- **Tocar un paso** encuadra y resalta ese tramo en el mapa.
- **Nombres visibles de las entradas de edificio** ("entrada oeste", "entrada norte") cargados a mano por el equipo, porque derivarlos de la posición falla en casos reales (ver design.md).

### Fuera de alcance

- Navegación en vivo, seguimiento con GPS o avance automático de pasos (brief v1: no se usa la ubicación del usuario; decisión 13 del plan).
- Indicaciones por voz y recálculo al desviarse (no hay posición del usuario).
- Rutas multipiso: los otros pisos se resuelven con el texto curado del catálogo (decisión 4 del plan).
- Decidir qué ruta se recomienda (lo hace `recomendacion-de-ruta`), dibujar los tramos cerrados y "Sin ruta disponible" (lo hace `cierres-temporales`), el visor, la hoja inferior y el botón recentrar (los hace `construir-interfaz-movil`), y el aviso "Sin conexión" (lo hace `tolerar-senal-irregular`).
- Hora estimada de llegada ("llegás 13:56", presente en el wireframe): queda en Open Questions.

## Capabilities

### New Capabilities

- `visualizacion-de-ruta`: lo que aparece cuando hay una ruta: estado "Buscando el camino…", polilínea, tramos al aire libre diferenciados con leyenda, marcadores de origen y destino, encuadre automático, tarjeta resumen, chips de alternativas, cambio entre alternativas, alternativa en gris y finalizar el viaje.
- `indicaciones-de-llegada`: lista paso a paso generada desde la ruta (salir, seguir, doblar, salir o entrar por una entrada, cambiar de edificio, llegar), distancias redondeadas, pasos al aire libre marcados, texto de piso y escalera para otros pisos y encuadre de un paso al tocarlo.

### Modified Capabilities

Ninguna: `openspec/specs/` está vacío.

## Impact

- **Código nuevo:** `src/rutas/indicaciones.ts` y `src/rutas/tramos.ts` (lógica pura, sin React) y componentes en `src/ui/ruta/` (capa de la ruta en el mapa, tarjeta resumen, chips, lista de indicaciones, estado de espera). Tests unitarios al lado del código y recorridos e2e en `tests/e2e/`.
- **Datos nuevos:** `datos-fuente/entradas.json` con el nombre visible de cada nodo `entrada-*` de edificio, validado en el build de datos de `preparar-datos-campus`.
- **Consume:** el resultado de `calcular-ruta-astar` (nodos, polilínea, distancia, tiempo, metros al aire libre, puertas usadas), el resultado de `recomendacion-de-ruta` (recomendada, alternativa y motivo), el catálogo de `preparar-datos-campus` (nombres de lugares y edificios, piso e indicación de llegada) y el visor y la hoja inferior de `construir-interfaz-movil`.
- **Deja para `tolerar-senal-irregular`:** la ruta mostrada y la alternativa elegida como estado serializable, y el evento "Finalizar viaje" para borrar el recorrido guardado.
- Sin dependencias nuevas: se dibuja con las capas vectoriales de Leaflet que ya usa el visor. Sin backend.
