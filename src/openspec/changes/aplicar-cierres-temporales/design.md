## Context

- El motor de `calcular-ruta-astar` recibe `excluidos: { nodos, aristas }` y devuelve `sin-ruta` con motivo (`origen-sin-puertas`, `destino-sin-puertas`, `sin-camino`). No sabe nada de cierres.
- Los ids de nodos son los de `grafo.json` (`entrada-salud-02`, `pasillo-central-67`, `puerta-servicios-gimnasio-2`…) y los de aristas tienen la forma `arista__<nodoA>__<nodoB>`, iguales a los nombres de las capas del grupo `ARISTAS` en Figma.
- El brief v3 deja afuera el panel de administración: los cierres los carga el equipo antes de la prueba. No hay backend (decisión 2 del plan): el archivo se publica como recurso estático junto con la app y se pide por red, como haría con un servicio real.
- Casos reales que sirven de ejemplo y de test:
  - `entrada-salud-02` es el paso interior entre Salud y Derecho. Si se cierra, Aula 511 → Lab. de Microscopía pasa de 483 px (169 m, todo bajo techo) a 560 px (196 m, con 63 m por la vereda).
  - `pasillo-artes-y-medios-06` es el único acceso a Estudio 2. Si se cierra, Estudio 2 queda sin acceso.
  - El Gimnasio tiene tres puertas; si se cierra `puerta-servicios-gimnasio-2`, desde el Aula 121 se entra por la puerta 3 (536 px en vez de 518 px).
  - `entrada-central-principal` tiene una sola arista (`arista__entrada-central-principal__pasillo-central-67`): cerrarla deja aislada la entrada principal.

## Goals / Non-Goals

**Goals:**

- Que ninguna ruta pase por un tramo cerrado vigente, nunca.
- Que el usuario sepa **antes** de pedir la ruta si un lugar no tiene acceso y, cuando no hay camino, **por qué**.
- Que los cierres se vean en el mapa como en Google Maps, para entender por qué la ruta da una vuelta (nota del wireframe P3).
- Que el equipo pueda cargar y verificar cierres sin tocar código y sin riesgo de romper la app con un error de tipeo.

**Non-Goals:**

- Panel de administración, cuentas, reportes de usuarios.
- Cierres parciales por sentido de circulación o por tipo de usuario.
- Recalcular automáticamente una ruta ya mostrada cuando un cierre empieza o termina durante el recorrido.

## Decisions

### 1. Formato del archivo de cierres

Un JSON publicado en `/data/cierres.json` (fuente en `public/data/cierres.json`, versionado en el repo):

```json
{
  "version": 1,
  "actualizado": "2026-11-02T18:00:00-03:00",
  "cierres": [
    {
      "id": "obra-paso-salud-derecho",
      "motivo": "Obra en el paso entre Salud y Derecho",
      "nodos": ["entrada-salud-02"],
      "desde": "2026-11-03T07:00:00-03:00",
      "hasta": "2026-11-14T23:00:00-03:00"
    },
    {
      "id": "vereda-entrada-principal",
      "motivo": "Vereda en reparación frente a la entrada principal",
      "aristas": ["arista__pasillo-central-65__pasillo-central-67"]
    },
    {
      "id": "escalera-artes-y-medios",
      "motivo": "Escalera de Artes y Medios cerrada por mantenimiento",
      "nodos": ["pasillo-artes-y-medios-06"],
      "hasta": "2026-11-05T13:00:00-03:00"
    }
  ]
}
```

- `id` (obligatorio, único): para trazar advertencias y para el aviso de desvío.
- `motivo` (obligatorio): texto corto en términos del campus, que se muestra tal cual al usuario. Si falta, se usa "Cerrado temporalmente" y se advierte.
- `nodos` y `aristas` (al menos uno con elementos): qué se cierra.
- `desde` / `hasta` (opcionales): fechas ISO 8601. Sin `desde`, vigente desde siempre; sin `hasta`, vigente hasta que se saque del archivo.
- Una arista se puede escribir en cualquier sentido (`arista__A__B` o `arista__B__A`): se normaliza al id del grafo.

**Alternativas:** cerrar por "zona" o por aula (más cómodo para cargar, pero ambiguo: ¿qué pasillos cierra "Salud"?); YAML (más legible, pero agrega un parser y es más propenso a errores de indentación); un archivo por cierre (complica el pedido por red).

### 2. Cerrar un nodo

Cerrar un nodo equivale a cerrar **todas sus aristas** (el motor ya lo hace así con `excluidos.nodos`). Si el nodo es una puerta, esa puerta no se puede usar ni para salir ni para entrar. Cerrar una entrada de edificio (`entrada-*`) corta el paso por esa entrada sin tener que listar sus aristas. Es la forma recomendada para "puerta cerrada" o "escalera cerrada"; cerrar aristas sueltas sirve para tramos de pasillo o de vereda.

### 3. Vigencia con el reloj del dispositivo

- Un cierre está vigente si `desde ≤ ahora < hasta` (`desde` inclusivo, `hasta` exclusivo).
- Fechas con zona horaria explícita (`-03:00`) se respetan; sin zona, se interpretan en la hora local del dispositivo. La guía de precarga pide siempre `-03:00`.
- Se evalúa al cargar el archivo, en cada cálculo de ruta y cada 60 s para la capa del mapa y los estados "Sin acceso ahora". Una ruta ya dibujada no se recalcula sola (no-goal), pero el próximo cálculo usa la vigencia actualizada.
- **Fecha simulada para verificar:** con `?ahora=2026-11-05T10:00-03:00` la app usa esa fecha en lugar del reloj y muestra una etiqueta visible "Fecha simulada: 05/11 10:00" para que nunca quede activa por error en la prueba. Persiste en `sessionStorage` igual que el escenario de clima.

**Alternativas:** hora del servidor (no hay servidor; además, sin señal no se podría consultar); ignorar la vigencia y que el equipo edite el archivo el día de la prueba (más trabajo y propenso a olvidos).

### 4. Carga: archivo por red con respaldo incluido en la app

- Al iniciar, la app pide `/data/cierres.json` (timeout 5 s).
- La misma versión del archivo se incluye en el bundle al compilar (import estático del JSON). Si el pedido falla, no es JSON válido o no tiene la forma esperada, se usa la copia incluida y se advierte en consola. Como precargar cierres implica publicar la app de nuevo, la copia incluida siempre coincide con la última precarga.
- Así nunca hay un estado "sin cierres" que pudiera mandar a alguien por un acceso cerrado (lo que la hipótesis de valor quiere evitar).
- `tolerar-senal-irregular` precachea el archivo en el service worker con estrategia network-first.

**Alternativas:** solo por red, y si falla avisar "No pudimos cargar los cierres" (deja una ventana de error en la que la ruta podría pasar por un cierre); solo incluido en el bundle (pierde el pedido por red que deja la app lista para un servicio real, decisión 2 del plan).

### 5. Errores del archivo: ignorar lo inválido, nunca frenar la app

- **Id de nodo o arista desconocido:** se ignora ese id con `console.warn("[cierres] id desconocido: … en el cierre …")`; el resto del cierre se aplica.
- **Fecha inválida:** el cierre se considera vigente (preferimos evitar un tramo de más a mandar a alguien por uno cerrado) y se advierte.
- **Cierre sin nodos ni aristas válidos:** se descarta con advertencia.
- **Chequeo en CI:** un script valida el archivo contra `grafo.json` (ids existentes, fechas válidas, `hasta` posterior a `desde`, ids de cierre únicos) y **falla** el pipeline. En tiempo de ejecución la app es tolerante; antes de publicar, el chequeo es estricto, porque el archivo lo carga el equipo a mano.

### 6. "Sin acceso ahora"

Un lugar está **sin acceso ahora** cuando ninguna de sus puertas abiertas se puede alcanzar desde ninguna entrada al campus abierta (`entrada-central-principal`, `-oeste`, `-peron-1`, `-peron-2`, `-la-paz`) con los cierres vigentes.

- Se calcula con un recorrido en anchura sobre el grafo sin los tramos cerrados, partiendo de todas las entradas al campus a la vez: O(nodos + aristas), una vez por cada cambio de vigencia, no por cada búsqueda.
- La lista de lugares (`busqueda-de-lugares`) muestra "Sin acceso ahora" en vez del guion del wireframe (brief v4, hallazgo 9). El lugar se puede seguir eligiendo: lleva a "Sin ruta disponible" con el motivo, porque saber dónde queda ya resuelve parte de la consulta (nota del wireframe P6).
- Ejemplo: con `pasillo-artes-y-medios-06` cerrado, Estudio 2 queda "Sin acceso ahora".

**Alternativa:** marcar sin acceso solo si todas las puertas están cerradas. No detecta lugares aislados por un pasillo cerrado, como Estudio 2.

### 7. "Sin ruta disponible" y su motivo

Cuando el motor devuelve `sin-ruta`:

1. Se identifica el lado aislado: si el destino está sin acceso, el destino; si no, el origen.
2. Se recorre en anchura la zona alcanzable desde las puertas abiertas de ese lado y se juntan los cierres vigentes que tocan su borde (nodos cerrados vecinos, aristas cerradas con un extremo adentro) o que cierran sus puertas.
3. El mensaje usa esos motivos: "Los accesos a Estudio 2 están cerrados: Escalera de Artes y Medios cerrada por mantenimiento." Si hay más de dos, se muestran dos y "y N cierres más".

La pantalla mantiene el destino en el panel y marcado en el mapa y ofrece "Elegir otro destino" y "Volver al mapa" (wireframe P6). El componente lo construye `mostrar-ruta-e-indicaciones`; este cambio entrega el estado y el texto.

### 8. Aviso de desvío por cierre

Después de calcular la ruta con los cierres, se calcula la misma consulta **sin** exclusiones (un A\* extra, pocos milisegundos). Si esa ruta usa algún nodo o arista cerrado, el resultado lleva un aviso "Evitamos un tramo cerrado: <motivo>". Le explica al usuario que ya conoce el camino habitual por qué la app lo manda por otro lado (brief v2: uno tardó bastante en encontrar otro camino y otro tuvo que preguntar).

**Alternativa:** sin aviso (el usuario ve la vuelta y no entiende por qué; el wireframe P3 ya pedía que "el mapa muestre por qué el camino da esa vuelta").

### 9. Tramos cerrados en el mapa, estilo corte de Google Maps

- **Arista cerrada:** línea roja punteada (`#D93025`, 4 px, guiones de 6 px) sobre el tramo, con un ícono de paso prohibido (círculo rojo con barra blanca, objetivo táctil ≥ 44 px) en el punto medio.
- **Nodo cerrado:** el mismo ícono sobre el nodo y sus aristas en rojo punteado.
- Solo se dibujan los cierres **vigentes**. Se ven siempre, haya ruta o no.
- Tocar el ícono abre una burbuja con el motivo y, si tiene `hasta`, "Cerrado hasta el 14/11 a las 23:00".
- La capa va por encima del plano y por debajo de la polilínea de la ruta. El color rojo no es la única señal (punteado + ícono), por accesibilidad.

La capa de Leaflet la implementa `construir-interfaz-movil` / `mostrar-ruta-e-indicaciones` con estos datos: segmentos en coordenadas del mapa, posición del ícono, motivo y vigencia.

### 10. Procedimiento de precarga para la prueba

Se documenta en `docs/cierres.md`:

1. **Relevar** los cierres reales el día anterior a la prueba (recorrer el campus, sacar foto y anotar el motivo y hasta cuándo).
2. **Ubicar los ids:** abrir la copia de Figma (`HjAApNyFMe6qOjAZVcLp1f`), seleccionar el punto o la arista del tramo y copiar el nombre de la capa (es el id). Alternativa: abrir `grafo.svg` en el navegador e inspeccionar el `id`.
3. **Preferir cerrar nodos** (la puerta, la entrada o el punto del pasillo) antes que aristas sueltas.
4. **Editar** `public/data/cierres.json` con motivo en lenguaje del campus y fechas con `-03:00`.
5. **Validar:** `npm run validar-cierres` (también corre en CI).
6. **Verificar en la vista previa** con `?ahora=<fecha y hora de la prueba>`: el tramo se ve cerrado en el mapa, una ruta que lo cruzaba ahora lo evita con el aviso de desvío y los lugares aislados dicen "Sin acceso ahora".
7. **Publicar** y, el día de la prueba, abrir la app en un celular sin `?ahora` y confirmar que los cierres se ven (si el service worker sirvió una versión vieja, recargar).

## Risks / Trade-offs

- [El reloj del celular puede estar mal configurado y aplicar o no un cierre fuera de horario] → La mayoría de los celulares sincroniza la hora con la red; la guía recomienda vigencias con margen y, para la prueba, cierres sin `hasta` cuando sea posible.
- [Un error de tipeo en un id hace que un cierre no se aplique] → Chequeo estricto en CI y advertencia en consola; el paso 6 del procedimiento verifica visualmente cada cierre.
- [Cerrar un nodo de vereda muy conectado puede aislar mucho más de lo que se quería] → El paso 6 revisa qué lugares quedan "Sin acceso ahora"; el script de validación lista esos lugares como información.
- [El aviso de desvío duplica el cálculo] → Es un A\* más de pocos milisegundos; se omite si no hay cierres vigentes.
- [Un service worker con un archivo viejo podría ignorar un cierre nuevo] → Estrategia network-first para el archivo (en `tolerar-senal-irregular`) y copia incluida en cada build nuevo.

## Migration Plan

El archivo arranca sin cierres (`"cierres": []`): la app se comporta igual que sin este cambio. Para la prueba se cargan los cierres reales siguiendo el procedimiento. Revertir es dejar la lista vacía y publicar.

## Open Questions

- Si en el futuro hay un panel de administración, el respaldo pasa a ser "la última versión descargada" y hará falta un aviso al usuario cuando no se pueda actualizar. Diferible hasta que exista backend.
- ¿Conviene que un cierre pueda marcar una escalera del primer piso (Humanidades) cuando haya pisos? Diferible hasta multipiso.
