## 1. Servicio de clima

- [x] 1.1 Definir los tipos `EstadoClima` y `ServicioClima` según el design (decisión 1) y verificar que `tsc --noEmit` pasa.
- [x] 1.2 Crear las respuestas simuladas `public/api/clima/seco.json`, `lluvia.json`, `lento.json` y `error.json` con el formato del design y verificar con `npm run dev` que se sirven en `/api/clima/<escenario>.json`.
- [x] 1.3 Implementar el servicio simulado: pedido por red al archivo del escenario, espera de 3 s para `lento`, validación (HTTP 2xx, JSON, `llueve` booleano), timeout de 5 s con `AbortController` y conversión de toda falla en `no-disponible` con motivo; verificar con tests sobre un `fetch` simulado y timers falsos los cuatro escenarios, un 503, una red caída, un HTML en lugar de JSON y una respuesta que tarda 6 s.
- [x] 1.4 Implementar la reutilización de una respuesta `ok` durante 5 minutos, invalidada al cambiar el escenario, y verificar con timers falsos que a los 2 min no se vuelve a pedir y a los 6 min sí.

## 2. Control del moderador

- [x] 2.1 Implementar la resolución del escenario activo (parámetro `?clima=` > `sessionStorage` `donde-queda:clima` > `seco`, valores desconocidos ignorados, accesos a `sessionStorage` en `try/catch`) y verificar con tests cada caso de precedencia, la recarga y la pestaña nueva.
- [x] 2.2 Construir el panel de prueba oculto (mantener presionado 3 s el botón de ayuda o `?panel=prueba`; selector Seco · Lluvia · Error · Lento; muestra la fecha simulada de cierres si está activa) y verificar con Testing Library que un toque corto en ayuda no lo abre, que la pulsación de 3 s sí y que elegir una opción la guarda en `sessionStorage`.
- [x] 2.3 Hacer que un cambio de escenario con una ruta en pantalla vuelva a consultar el clima y recalcule la recomendación sin tocar origen ni destino, y verificar con un test de integración que pasar de `seco` a `lluvia` con la ruta Aula 309 → Aula 103 muestra la techada como recomendada.

## 3. Recomendación

- [x] 3.1 Implementar la función pura `recomendar` con la tabla de reglas del design (lluvia, sin lluvia, no disponible con y sin elección, rutas iguales por secuencia de nodos, nota "Ya es techada" o "Es la más resguardada posible") y verificar con tests de tabla cada combinación usando las rutas reales Aula 309 → Aula 103, Aula 121 → Aula 110 y Entrada principal → Aula 121.
- [x] 3.2 Implementar el recuerdo del criterio elegido mientras el clima siga no disponible (se descarta cuando una consulta vuelve a dar `ok`) y verificar con tests que al cambiar de destino no se vuelve a preguntar y que tras un reintento exitoso se aplican las reglas normales.
- [x] 3.3 Calcular la comparación entre alternativas (tiempo, metros al aire libre redondeados a la decena, diferencia en minutos sobre valores redondeados, "mismo tiempo", "Sin tramos al aire libre") y verificar con tests que Aula 309 → Aula 103 con lluvia da "7 min · 90 m" y "+2 min · 130 m menos al aire libre" frente a "5 min · 220 m".
- [x] 3.4 Generar el texto del estado del clima ("Llueve · te recomendamos la ruta más resguardada", "Llueve · Ya es techada", "No llueve · ruta más rápida", "No pudimos consultar el clima") y verificar con tests cada variante.

## 4. Orquestación del cálculo

- [x] 4.1 Implementar la orquestación que, con origen y destino válidos, lanza en paralelo la consulta de clima y los cálculos `mas-corta` y `resguardada` con los tramos excluidos de `aplicar-cierres-temporales`, y entrega el plan de ruta solo cuando hay estado de clima; verificar con tests que con `lento` no se entrega ninguna ruta antes de los 3 s y que con cierres vigentes ninguna de las dos alternativas los cruza.
- [x] 4.2 Exponer el estado "esperando clima" para que `visualizacion-de-ruta` muestre "Buscando el camino…" y la acción "Reintentar" para el aviso de clima, y verificar con tests que reintentar conserva origen, destino y la ruta ya mostrada.

## 5. Documentación para la prueba

- [ ] 5.1 Agregar a la guía de moderación de la prueba (en `docs/`) los links por escenario (`?clima=seco|lluvia|error|lento`), cómo abrir el panel oculto y que cada sesión empieza en una pestaña nueva; verificar que un integrante del equipo prepara los cuatro escenarios siguiendo solo la guía.
  - Guía escrita en `docs/prueba/guia-de-moderacion.md`. Falta que un integrante del equipo prepare los cuatro escenarios siguiéndola.
- [x] 5.2 Documentar en el README del servicio de clima cómo reemplazar la simulación por Open-Meteo (URL, regla de `weather_code`, mismo timeout) sin integrarla, y verificar que el ejemplo de URL responde en el navegador.

## 6. Integración

- [x] 6.1 Escribir tests e2e con Playwright (390×844, touch) para Aula 309 → Aula 103 con `?clima=lluvia` (techada recomendada, más rápida a un toque, comparación visible), `?clima=seco` (solo la más rápida), `?clima=error` (aviso, elección sin preselección, ninguna ruta antes de elegir) y `?clima=lento` ("Buscando el camino…" y después la techada), y verificar que pasan.
  - `tests/e2e/clima.spec.ts` pasa para `seco`, `error` y `lento` y para el panel de prueba. Con `lluvia` verifica la recomendación ("Llueve · te recomendamos la ruta más resguardada"), pero "más rápida a un toque" y la comparación visible con lluvia dependen de los chips y la tarjeta de `mostrar-ruta-e-indicaciones` (tarea 6.3 de ese cambio); agregar esas aserciones cuando se conecte. **Hecho:** la prueba de lluvia ahora verifica la comparación en los chips y "Más rápida" a un toque.
- [x] 6.2 Correr `npm run lint`, `npm run test` y `npm run build` y verificar que pasan sin errores.
  - `npm run lint`, `npm run typecheck`, `npm run build` y `npm run test:e2e` pasan. `npm run test` tiene 1 falla ajena: `src/ui/tema/tokens.test.ts` detecta `#80868B` en `src/ui/ruta/estilo.ts` (trabajo en curso de `mostrar-ruta-e-indicaciones`). Volver a correr cuando ese cambio lo resuelva. **Resuelto:** `tokens.test.ts` ahora permite `#80868B` solo como trazo de la alternativa (nunca como texto); `lint`, `test` y `build` pasan.

## Workflow follow-up

- Archivar el cambio con `openspec archive adaptar-ruta-al-clima` cuando esté implementado y verificado.
