## Context

- `calcular-ruta-astar` devuelve, para cada criterio, la secuencia de nodos, la distancia, el tiempo estimado y los metros al aire libre (`exteriorM`). Una arista es exterior si uno de sus extremos es un nodo violeta (`depto: "central"`).
- `aplicar-cierres-temporales` entrega los tramos excluidos vigentes, que se aplican a los dos criterios.
- No hay backend (decisión 2 del plan). El servicio de clima simulado se publica como archivos estáticos y se pide por red, para que los errores de conexión sean reales y la app quede lista para un servicio real.
- Datos reales sobre los 39 903 pares de puertas: en 15 909 la ruta resguardada coincide con la más corta; en el resto es en mediana 1,38 veces más larga. Ejemplos (0,35 m/px, 1,2 m/s):

| Origen → destino | Más rápida | Resguardada | Lo que se muestra con lluvia |
|---|---|---|---|
| Aula 121 → Aula 110 (Humanidades) | 1 min · 0 m afuera | igual | una ruta, "Ya es techada" |
| Entrada principal → Aula 121 | 3 min · 93 m afuera | igual | una ruta, "Es la más resguardada posible" |
| Aula 309 (Económicas) → Aula 103 (Humanidades) | 5 min · 220 m afuera | 7 min · 91 m afuera | Más resguardada recomendada (+2 min, 130 m menos afuera); Más rápida a un toque |
| Aula 121 → Lab. de Microscopía (Derecho) | 5 min · 259 m afuera | 14 min · 133 m afuera | Más resguardada recomendada (+9 min); Más rápida a un toque |

## Goals / Non-Goals

**Goals:**

- Probar la adaptación al clima sin depender de un servicio externo (brief v3).
- Que el moderador pueda poner cada escenario de forma rápida y repetible durante la prueba, sin que el usuario lo note.
- Recomendar sin imponer: la mayoría prefiere no mojarse (3 de 5) pero una parte importante prefiere la más rápida (2 de 5).
- Nunca asumir que no llueve cuando el clima falla (brief v4, hallazgos 5 y 7).
- Dejar la puerta abierta a una API real cambiando una sola pieza.

**Non-Goals:**

- Integrar una API real, pronóstico o alertas.
- Guardar una preferencia permanente del usuario.
- Umbrales de lluvia (llovizna vs. tormenta): el servicio responde llueve sí o no.

## Decisions

### 1. Interfaz del servicio de clima

```ts
type EstadoClima =
  | { tipo: 'ok'; llueve: boolean; descripcion: string; fuente: 'simulado' | 'real'; obtenidoEn: string }
  | { tipo: 'no-disponible'; motivo: 'timeout' | 'red' | 'respuesta-invalida' };

interface ServicioClima {
  consultar(signal?: AbortSignal): Promise<EstadoClima>;
}
```

- La recomendación solo conoce `EstadoClima`. Cambiar de servicio simulado a real es cambiar la implementación que se inyecta al iniciar la app.
- La función nunca rechaza la promesa: todo error se convierte en `no-disponible` con su motivo, así la interfaz no tiene ramas de excepción.

**Alternativa:** que la recomendación lea directamente un flag global `llueve`. Más simple, pero no permite probar el error ni el timeout y acopla la UI a la simulación.

### 2. Servicio simulado como recursos estáticos pedidos por red

Cada escenario es un archivo en `/api/clima/<escenario>.json` (fuente en `public/api/clima/`):

```json
{ "fuente": "simulado", "escenario": "lluvia", "llueve": true,
  "descripcion": "Lluvia", "actualizado": "2026-11-05T10:00:00-03:00" }
```

| Escenario | Qué pide | Qué pasa |
|---|---|---|
| `seco` | `seco.json` | `llueve: false` |
| `lluvia` | `lluvia.json` | `llueve: true` |
| `lento` | `lento.json` | la implementación simulada espera 3 s antes de pedirlo; responde `llueve: true` para ejercitar la espera y el caso más completo |
| `error` | `error.json` | el archivo contiene `{ "error": "servicio no disponible" }`, sin `llueve`: la validación lo rechaza y el resultado es `no-disponible` (`respuesta-invalida`) |

- Validación de la respuesta: HTTP 2xx, JSON válido y `llueve` booleano. Cualquier otra cosa (incluido el `index.html` que algunos hostings devuelven ante rutas inexistentes) es `respuesta-invalida`.
- Un hosting estático no puede devolver un 503 ni demorar la respuesta; por eso `error` usa un cuerpo inválido y `lento` una espera en el cliente. Los casos de 5xx, red caída y timeout real se cubren con tests sobre un `fetch` simulado.
- El service worker (`tolerar-senal-irregular`) debe tratar `/api/clima/*` como solo red, sin caché: sin conexión, el clima es `no-disponible` (motivo `red`).

**Alternativas:** devolver el escenario en memoria sin red (no ejercita fallas reales); un mock server tipo MSW en producción (agrega un service worker extra que compite con el de la PWA); una función serverless (requiere backend, descartado).

### 3. Control del moderador

- **Parámetro de URL** `?clima=seco|lluvia|error|lento`: es la forma de preparar cada sesión de prueba (el moderador abre el link correspondiente).
- **Panel de prueba oculto:** se abre manteniendo presionado 3 s el botón flotante de ayuda o con `?panel=prueba`. Tiene un selector de cuatro opciones (Seco · Lluvia · Error · Lento), muestra el escenario activo y, si está activa, la fecha simulada de `aplicar-cierres-temporales`. Se cierra con un botón o tocando afuera. No aparece en la ayuda ni en el flujo del usuario (wireframe del TP3: "control del prototipo, no de la interfaz").
- **Persistencia:** el escenario elegido se guarda en `sessionStorage` (clave `donde-queda:clima`), así sobrevive a recargas durante la sesión de prueba y se borra al cerrar la pestaña. Precedencia: parámetro de URL > `sessionStorage` > `seco` por defecto. Las lecturas y escrituras van en `try/catch` (navegación privada).
- **Cambio en caliente:** si el moderador cambia el escenario con una ruta en pantalla, se vuelve a consultar el clima y se recalcula la recomendación sin tocar origen ni destino.

**Alternativas:** control visible en la interfaz (el usuario lo usaría y se pierde la prueba); `localStorage` (el escenario quedaría pegado entre sesiones de prueba con distintos usuarios); solo URL (obliga a recargar para cambiar en medio de la prueba).

### 4. Cuándo se consulta y timeout de 5 s

- Se consulta el clima **cada vez que se calcula una ruta** (brief v3, flujo paso 3). Una respuesta `ok` se reutiliza durante 5 minutos para los cálculos siguientes, salvo que cambie el escenario. Con señal irregular, esto evita esperar al clima en cada cambio de destino.
- La consulta se corta a los **5 s** con `AbortController` y queda `no-disponible` (`timeout`). `lento` (3 s) entra en el tiempo; un servicio real que tarde más cae en el flujo de error.
- Mientras se espera, la interfaz muestra "Buscando el camino…" (`visualizacion-de-ruta`). **No** se dibuja una ruta provisoria más corta para después cambiarla: sería asumir que no llueve.
- Los dos A\* (y el de desvío por cierres) corren en paralelo con la consulta; tardan milisegundos.

**Alternativa:** consultar una sola vez al abrir la app. Más simple, pero la prueba puede durar más que la lluvia y el moderador no podría cambiar el escenario sin recargar.

### 5. Reglas de recomendación (función pura)

```ts
type PlanDeRuta = {
  principal: ResultadoRuta | null;      // null mientras el usuario no elige (clima no disponible)
  alternativa: ResultadoRuta | null;
  etiquetaPrincipal: 'Más rápida' | 'Techada' | 'Más resguardada'; // 'Techada' solo si exteriorM = 0
  notaRutaUnica?: 'Ya es techada' | 'Es la más resguardada posible';
  estadoClima: 'llueve' | 'no-llueve' | 'no-disponible';
  requiereEleccion: boolean;
};
function recomendar(clima: EstadoClima, corta: ResultadoRuta, resguardada: ResultadoRuta,
                    criterioElegido?: Criterio): PlanDeRuta;
```

| Clima | Rutas distintas | Rutas iguales |
|---|---|---|
| Llueve | principal = resguardada, alternativa = Más rápida | una sola, con nota |
| No llueve | principal = Más rápida, sin alternativa | una sola |
| No disponible, sin elección | `requiereEleccion`, ninguna dibujada, se muestran las dos opciones con su comparación | una sola, con nota y el aviso de clima |
| No disponible, con elección | principal = la elegida, alternativa = la otra | una sola |

- **Iguales** = misma secuencia de nodos. La nota es "Ya es techada" si `exteriorM = 0` y "Es la más resguardada posible" si la ruta igual pasa por la vereda (decir "techada" con 93 m al aire libre sería falso).
- **Sin lluvia, sin alternativa:** es la decisión del plan y del wireframe ("sin lluvia el control no existe, porque no hay una segunda opción que ofrecer"). La ruta igual informa sus metros al aire libre.
- **Clima no disponible:** aviso "No pudimos consultar el clima. ¿Cómo querés ir?" con las dos opciones, "Reintentar" y ninguna preseleccionada. La elección se recuerda durante la sesión mientras el clima siga fallando, para no preguntar en cada destino. Si un reintento responde bien, se aplican las reglas normales.
- **Los cierres valen para las dos alternativas:** las dos rutas se calculan con los mismos tramos excluidos.

**Alternativas:** sin lluvia mostrar también la techada como alternativa (más opciones, más carga cognitiva para un ingresante apurado; el brief v3 prioriza eficiencia); con clima no disponible usar la más corta por defecto (es exactamente lo que el brief v4 pide no hacer); con clima no disponible recomendar la techada "por las dudas" (impone un desvío que puede ser de +9 min sin evidencia).

### 6. Comparación entre alternativas

- Para cada opción: tiempo estimado y metros al aire libre, redondeados a la decena (0 m se muestra como "Sin tramos al aire libre").
- Para la resguardada, además, la diferencia con la Más rápida: "+2 min · 130 m menos al aire libre". La diferencia de minutos se calcula entre los valores ya redondeados que ve el usuario; si da 0, "mismo tiempo".
- Ejemplo con lluvia, Aula 309 → Aula 103: "Más resguardada · 7 min · 90 m al aire libre (+2 min, 130 m menos al aire libre)" y "Más rápida · 5 min · 220 m al aire libre".
- El texto exacto, los chips y la tarjeta los define `mostrar-ruta-e-indicaciones`; esta capability entrega los números.

### 7. Estado del clima a la vista

El resultado muestra una línea corta con el clima y el criterio, como el chip del wireframe del TP3: "Llueve · te recomendamos la ruta más resguardada" (o "Llueve · Ya es techada" / "Llueve · Es la más resguardada posible" si hay una sola ruta), "No llueve · ruta más rápida" o "No pudimos consultar el clima". Así el criterio no aparece como sorpresa y el usuario entiende por qué la ruta da una vuelta.

### 8. Camino a una API real (no se integra)

Ejemplo: **Open-Meteo**, sin clave y con CORS habilitado, se podría llamar directo desde el navegador:

`https://api.open-meteo.com/v1/forecast?latitude=-34.67&longitude=-58.56&current=precipitation,weather_code&timezone=America/Argentina/Buenos_Aires`

`llueve = precipitation > 0 || weather_code ∈ {51–67, 80–82, 95–99}` (lloviznas, lluvias, chaparrones y tormentas). Se implementaría como otra clase de `ServicioClima` con el mismo timeout y validación. Una API con clave secreta requeriría una función serverless como proxy con caché (disparador de backend de la decisión 2 del plan).

## Risks / Trade-offs

- [La ruta techada puede ser un desvío desproporcionado: Aula 121 → Lab. de Microscopía +9 min para ahorrar ≈ 126 m de vereda; Lab. 1 de Derecho → Banco +7 min para ahorrar ≈ 26 m] → Se recomienda, no se impone: la comparación muestra los minutos extra y la más rápida está a un toque. Un umbral de desvío queda como pregunta abierta para decidir con datos de la prueba.
- [El nombre "Techada" promete un recorrido 100 % bajo techo, pero a veces solo reduce la vereda] → La resguardada se llama "Techada" solo con 0 m al aire libre y "Más resguardada" en los demás casos (regla compartida con `mostrar-ruta-e-indicaciones`); con ruta única se usa "Es la más resguardada posible" cuando hay tramos afuera.
- [El moderador olvida el escenario activo entre usuarios] → `sessionStorage` se borra al cerrar la pestaña; el panel muestra el escenario activo; la guía de la prueba indica abrir cada sesión con el link `?clima=…`.
- [Un usuario descubre el panel oculto] → El gesto es poco probable (3 s sobre ayuda) y el panel no rompe nada; se puede desactivar en un build para producción real.
- [La respuesta reutilizada 5 min puede quedar vieja si empieza a llover] → Con el servicio simulado no aplica (cambiar el escenario invalida la caché); con una API real, 5 min es menor que la resolución típica de los datos de precipitación actuales.
- [El service worker podría cachear el clima y ocultar un error] → Requisito explícito para `tolerar-senal-irregular`: `/api/clima/*` solo red.

## Migration Plan

Se agrega detrás del cálculo de ruta: antes de este cambio la app muestra solo `mas-corta`. Con el escenario por defecto (`seco`) el comportamiento visible es el mismo. Para revertir, inyectar un servicio que siempre responda `llueve: false`.

## Open Questions

- ¿Hace falta un umbral de desvío máximo (por ejemplo, no recomendar la techada si suma más de 5 min y ahorra menos de 50 m de vereda)? Se decide con lo que se observe en la prueba con lluvia simulada.
- ¿Conviene un quinto escenario "sin respuesta" que supere los 5 s para probar el timeout con usuarios? Hoy se cubre con tests; se agrega si el moderador lo necesita.
