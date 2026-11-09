## Why

Los cinco encuestados del TP2 llevan siempre el celular, pero los cinco se conectan con datos móviles de **señal irregular** (brief v2, "Perfil del usuario real"). El mismo relevamiento concluye que "la información del recorrido debería poder seguir consultándose aunque la conexión se corte por un momento" (brief v2, "Necesidades, problemas y contexto de uso relevados"). La hipótesis de valor se mide "usando la conexión disponible en el campus" (brief v2 y v4), así que una app que se queda en blanco cuando se corta la señal falla justo en la prueba.

La evaluación del TP4 lo marcó como problema (brief v4, hallazgos 5 y 7, "Correcciones que entran en el MVP del TP5"):

- Mostrar "Sin conexión" y permitir reintentar.
- Conservar el mapa y la ruta ya cargados durante el recorrido; si todavía no hay ruta, mantener disponible el mapa.
- Si falla el servicio de clima simulado, avisar y permitir elegir el criterio de recorrido sin asumir que no llueve.

El flujo ajustado del TP5 lo repite en los pasos 4 ("si falla la conexión, informar y permitir reintentar sin borrar la información ya cargada") y 6 ("mantener disponible el recorrido ya cargado durante el desplazamiento").

La arquitectura ya va en esa dirección: no hay backend, el A\* corre en el navegador y los datos del campus son archivos estáticos (decisión 2 del plan; design de `configurar-base-app`). Lo que falta es que esos archivos **queden guardados en el dispositivo**, que la app **arranque sin red** y que una recarga o un corte no le borren al usuario lo que estaba mirando.

## What Changes

- **App instalable y precacheada (PWA):** un service worker guarda la app, el grafo, el catálogo, la copia de los cierres y el plano en los niveles de zoom de vista general. Después de la primera visita, la app abre sin conexión.
- **Plano sin conexión:** los niveles de zoom de detalle se guardan a medida que se ven. Al mostrar una ruta, se descargan en segundo plano las partes del plano que la cubren. Si falta una parte, se ve el nivel general ampliado en lugar de un hueco gris.
- **Estrategia por recurso:**
  - Cierres: primero la red y, si falla, la última copia guardada, con aviso de que pueden no estar actualizados.
  - Clima: siempre a la red y nunca desde la caché. Si no hay red, es un error de clima y el usuario elige el criterio.
- **Cálculo de ruta 100 % local**, también sin conexión.
- **Aviso "Sin conexión" con "Reintentar"** que no borra el origen, el destino, la ruta ni el mapa. Al volver la conexión, los datos se actualizan solos, pero la ruta en pantalla no se cambia sin que el usuario lo acepte.
- **Recorrido guardado en el dispositivo:** origen, destino, alternativa elegida y última ruta sobreviven a una recarga o a que el sistema cierre la pestaña, durante un tiempo de vigencia. "Finalizar viaje" lo borra.
- **Actualización de versión:** cuando hay una versión nueva de la app o de los datos, aparece "Hay una versión nueva" con "Actualizar", sin interrumpir un recorrido en curso.
- **Instalación opcional** en la pantalla de inicio (Android e iOS), ofrecida en la ayuda y nunca en el primer uso ni durante un recorrido.
- **Pruebas e2e en modo sin conexión** con Playwright.

### Fuera de alcance

- Primera visita sin conexión: sin haber cargado la app nunca, no hay nada guardado que mostrar.
- Descarga completa del plano en todos los niveles de zoom por adelantado (ver design.md, Open Questions).
- Sincronización en segundo plano, notificaciones push y cuentas.
- Reportes colaborativos de cierres sin conexión (brief v4, propuesta 4, postergada).
- Lógica del clima y de la recomendación cuando el clima falla: la definen `clima-simulado` y `recomendacion-de-ruta`. Este cambio solo garantiza que, sin red, se llegue a ese estado de error.

## Capabilities

### New Capabilities

- `funcionamiento-sin-conexion`: app instalable y precacheada, mapa y ruta consultables sin red, cálculo sin conexión con los últimos cierres guardados, clima sin red tratado como error de clima, aviso "Sin conexión" con "Reintentar", recorrido conservado al recargar, aviso de versión nueva sin interrumpir e instalación opcional.

### Modified Capabilities

Ninguna: `openspec/specs/` está vacío.

## Impact

- **Dependencias nuevas:** `vite-plugin-pwa` (genera el service worker con Workbox y el manifiesto).
- **Código nuevo:** configuración de PWA en `vite.config.ts`, `src/ui/conexion/` (aviso "Sin conexión", aviso de versión nueva, sugerencia de instalación), `src/datos/persistencia.ts` (guardar y restaurar el recorrido) y precarga de teselas de la ruta. Tests e2e en `tests/e2e/sin-conexion/`.
- **Toca:** `src/cierres/` (copia de respaldo embebida y fecha de la copia usada), el arranque de la app (restaurar el recorrido antes de pintar) y la hoja de resultado (evento "Finalizar viaje" de `mostrar-ruta-e-indicaciones`).
- **Datos:** necesita que `preparar-datos-campus` publique los datos con hash en el nombre y una `versionDatos`. Si no la publica, este cambio la agrega al manifiesto de datos.
- **Hosting:** HTTPS ya resuelto en Netlify (`configurar-base-app`). Hay que agregar headers para que `sw.js` y `index.html` no queden en la caché HTTP (`Cache-Control: no-cache`) y para que los archivos con hash sean `immutable`.
- **Almacenamiento en el dispositivo:** unos 1,5 MB en Cache Storage al instalar, hasta unos 4 MB con el plano de detalle visitado, y menos de 5 KB en `localStorage`.
