## Why

La UNLaM tiene edificios separados por veredas descubiertas: casi cualquier recorrido entre departamentos pasa un tramo al aire libre. Desde el TP1 la propuesta incluye **rutas adaptadas al clima** (brief v1, funcionalidad 5 e "Integraciones previstas": una API de clima para saber si llueve). La encuesta del TP2 confirmó el supuesto 5, pero con un matiz importante (brief v2, "Necesidades, problemas y contexto de uso relevados"): **tres de cinco prefieren desviarse para no mojarse aunque tarden más y dos prefieren el camino más rápido**. Por eso "conviene mostrar las dos opciones y dejar que cada persona elija".

El brief v3 recorta cómo se hace en el MVP: la API meteorológica **se simula** (Scope del MVP y "Qué se construye y qué se simula"), pero la app **sí** consulta un servicio, interpreta lluvia o ausencia de lluvia y adapta el recorrido. En el flujo principal (paso 4): sin lluvia se prioriza la ruta más corta; con lluvia se recomienda la más resguardada y se mantiene disponible la más rápida.

El brief v4 suma una corrección de la evaluación de Bananza (hallazgos 5 y 7): **si falla el servicio de clima simulado, avisar y permitir elegir el criterio de recorrido sin asumir que no llueve**. Y el wireframe del TP3 ya separaba el control del clima simulado como "control del prototipo, no de la interfaz": el moderador de la prueba elige el escenario, el usuario no configura nada.

El motor de `calcular-ruta-astar` ya calcula los criterios `mas-corta` y `resguardada`. Falta saber si llueve y decidir qué mostrar.

## What Changes

- **Servicio de clima simulado** que la app consulta por red como si fuera una API real, con cuatro escenarios: `seco`, `lluvia`, `error` (la respuesta falla) y `lento` (responde lluvia después de unos 3 s).
- **Control del moderador:** el escenario se elige con un parámetro en la dirección (`?clima=lluvia`) o desde un **panel de prueba oculto**; se recuerda durante la sesión del navegador. El usuario de la prueba no ve ese control.
- **Tiempo máximo de 5 s** para la consulta; si se pasa, si no hay red o si la respuesta no es válida, el clima queda "no disponible".
- **Interfaz de servicio intercambiable** para reemplazar la simulación por una API real sin tocar la recomendación (por ejemplo Open-Meteo, que no requiere clave). No se integra en este cambio.
- **Recomendación de ruta según el clima:**
  - Con lluvia: se recomienda la ruta resguardada (`resguardada`, llamada **Techada** si no tiene metros al aire libre y **Más resguardada** si tiene) y la **Más rápida** (`mas-corta`) queda a un toque.
  - Sin lluvia: solo la más rápida.
  - Si las dos coinciden: una sola ruta, indicando que ya es techada (o que es la más resguardada posible).
  - Si el clima no está disponible: aviso y el usuario elige el criterio; nunca se asume que no llueve.
- **Comparación entre alternativas:** minutos extra y metros al aire libre de cada opción, para que la decisión sea informada.
- **Estado del clima a la vista** en el resultado ("Llueve · te recomendamos la ruta más resguardada"), como en el wireframe del TP3.

### Fuera de alcance

- Integración con una API meteorológica real (brief v3 y v4, excluida del MVP). Queda documentado el camino.
- Pronóstico, alertas o lluvia "en la próxima hora".
- Preferencia permanente del usuario ("siempre la más rápida"): con 5 encuestados no hay evidencia suficiente; se decide en cada consulta.
- Cómo se dibujan las rutas, los chips y la tarjeta resumen (`mostrar-ruta-e-indicaciones`). Acá se define qué ruta es la recomendada, cuál es la alternativa y qué datos se comparan.

## Capabilities

### New Capabilities

- `clima-simulado`: consulta del estado del clima a un servicio simulado, escenarios `seco`/`lluvia`/`error`/`lento`, control del moderador (parámetro de URL y panel oculto, persistido en la sesión), tiempo máximo de 5 s y manejo del error.
- `recomendacion-de-ruta`: qué ruta se recomienda y cuál queda como alternativa según el clima, ruta única cuando coinciden, elección manual del criterio cuando el clima falla y comparación de tiempo y metros al aire libre entre alternativas.

### Modified Capabilities

Ninguna.

## Impact

- **Datos nuevos:** respuestas simuladas publicadas como recursos estáticos (`/api/clima/seco.json`, `lluvia.json`, `lento.json`, `error.json`).
- **Código nuevo:** servicio de clima (interfaz + implementación simulada), panel de prueba oculto, lógica de recomendación y orquestación del cálculo (clima + cierres + dos criterios).
- **Depende de:** `calcular-ruta-astar` (los dos criterios y los metros al aire libre) y `aplicar-cierres-temporales` (los cierres valen para las dos alternativas).
- **Lo usan:** `mostrar-ruta-e-indicaciones` (dibuja la recomendada, ofrece la alternativa y muestra la comparación), `tolerar-senal-irregular` (sin red, el clima es "no disponible"; el service worker no debe cachear las respuestas de clima).
- **Sin backend:** el servicio simulado es estático (decisión 2 del plan). Una API real sin clave tampoco lo necesitaría; una con clave secreta sí (proxy serverless), y ese es uno de los disparadores documentados para agregar backend.
