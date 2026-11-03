# TP5 — Construcción del MVP, prueba y aprendizaje

**Equipo Summate** — Agasi Alejo, Huergo Estefanía, Naspleda Julián, Panigazzi Agustín, Rios Cristian.
**Repositorio:** <https://github.com/gadsii-unlam/gadsii-summate> (carpeta `src/` para el MVP, `docs/evidencia/tp5/` para la evidencia).
**MVP funcionando:** <https://donde-queda.donde-queda.workers.dev>

## 1. Métricas y criterio de éxito

### Hipótesis que se pone a prueba

Es la hipótesis de valor del TP2 (brief v2, sostenida sin cambios en v3 y v4):

> Creemos que los ingresantes y estudiantes de primer año de la UNLaM tienen el problema de no encontrar con rapidez aulas y sectores cuando todavía no conocen el campus o un recorrido habitual está cerrado, lo que puede hacerles perder entre cinco y diez minutos y llegar tarde. Nuestra solución es _¿Dónde queda?_, una aplicación web para celular que muestra en el mapa una ruta clara desde un punto de partida hasta el destino, que contempla cierres y ofrece alternativas según el clima.


### Métricas accionables

#### M1 — Llegada autónoma con la aplicación

**Qué es:** cuántos de los tres usuarios llegan solos a cada destino que se les pide durante la prueba, usando la aplicación. Llegar solo (**llegada autónoma**) es llegar a la puerta del aula en 5 minutos o menos, sin pedir indicaciones y sin tomar el tramo cerrado.

**Por qué es accionable:** es la traducción directa de lo que la hipótesis promete. Cuando falla, el registro de la sesión dice **en qué paso** falló, y cada paso lleva a una decisión distinta:

| Si M1 falla porque… | Lo que hacemos |
| --- | --- |
| El usuario no logra obtener la ruta correcta (no reconoce el origen, no encuentra el destino). | Corregir la selección de origen y destino. Es un problema de usabilidad. |
| Obtiene la ruta correcta pero no la puede seguir (se pierde entre el edificio y el aula, no entiende el mapa). | Revisar la forma de guiar (indicaciones de llegada, legibilidad del mapa). Si persiste, corresponde un **pivote de necesidad del consumidor**: el usuario es el correcto, pero lo que necesita no es una ruta dibujada (supuesto 2 del TP1) sino otra forma de orientarse, que se define con lo que se observe en la prueba (punto 6). |
| Sigue la ruta pero tarda más de 5 minutos. | Revisar si el umbral es realista para el campus antes de concluir sobre la hipótesis. |
| Cumple todo. | Sostener la promesa central y pasar a lo que mide M2. |

#### M2 — Seguimiento del desvío ante un cierre

**Qué es:** cuántos de los tres usuarios caminan el desvío que les muestra la aplicación cuando el camino directo está cerrado. Cada usuario hace un recorrido así: el equipo marca como cerrado un tramo del camino más corto y la aplicación propone otro. Se observa si el usuario sigue ese otro camino o va por el directo hasta toparse con el cierre.

**Por qué es accionable:** "contempla cierres" es lo que distingue a _¿Dónde queda?_ de un plano cualquiera. En el TP2, cuatro de cinco usuarios encontraron accesos cerrados varias veces; uno tardó bastante en encontrar otro camino y otro tuvo que preguntar. Según lo que haga el usuario, la decisión es distinta:

| Si en el recorrido con cierre el usuario… | Lo que hacemos |
| --- | --- |
| Camina el desvío sin acercarse al cierre. | Los cierres aportan valor: perseverar. Lo próximo a construir es el panel de administración de cierres, que el TP3 dejó fuera del MVP. |
| No lo camina porque no vio el cierre o no entendió por qué la ruta daba la vuelta. | Es un problema de usabilidad: hacer más visible el cierre. La hipótesis no se descarta. |
| Vio el cierre y el desvío, y aun así fue por su camino. | Los cierres no le aportan valor. Si se repite, corresponde un **pivote de zoom-in**: quedarse sólo con la ruta hasta el aula. |

### Métrica vanidosa

**Cantidad de instalaciones de la aplicación en el celular.**

Contar cuántas personas instalan la aplicación en la pantalla de inicio del celular parece medir adopción, pero no dice nada sobre la hipótesis:

- Instalarla depende de que el usuario quiera tenerla a mano, no de que la aplicación le haya resuelto el problema.
- Un usuario puede instalarla y perderse igual, y otro puede llegar al aula sin instalarla nunca.
- Es el mismo caso que las descargas de una aplicación: el número sólo crece y no mide uso real. Lo que la hipótesis promete es llegar, y eso lo miden M1 y M2.

### Criterio de éxito

Escrito antes de la prueba, sobre los tres usuarios.

**La hipótesis se sostiene si se cumplen las dos condiciones:**

1. **(M1)** Al menos **2 de los 3 usuarios** llegan solos a **todos** los destinos que se les piden.
2. **(M2)** Al menos **2 de los 3 usuarios** caminan el desvío en el recorrido con cierre, sin acercarse al tramo cerrado.

**La hipótesis queda refutada si se cumple cualquiera de estas:**

- **(M1)** Como máximo **1 de los 3 usuarios** llega solo a todos los destinos que se le piden.
- **(M2)** **Ninguno** de los tres camina el desvío, y al menos dos de ellos dicen, al terminar el recorrido, que vieron el cierre en la aplicación y eligieron igual su propio camino.

**Si se refuta, se pivota** (punto 6). El tipo de pivote depende de qué métrica falló: si falla M1, de necesidad del consumidor; si falla M2, de zoom-in.

**Cualquier otro resultado no confirma la hipótesis.** No se la da por sostenida; se analiza por capas (punto 5) para separar lo que es un problema de la interfaz de lo que es un problema de la propuesta.

> Por qué 2 de 3: el criterio original exigía 4 de 5, es decir el 80 %. Con tres personas no hay forma de pedir exactamente eso: 2 de 3 es el 67 % y 3 de 3 es el 100 %. Elegimos 2 de 3 porque exigir 3 de 3 haría que un solo usuario atípico (por ejemplo, alguien que ya conocía el edificio por otra razón) defina el resultado.

## 2. Construcción del MVP

Se construyó el alcance del TP3 con las correcciones del TP4 que el equipo aceptó llevar (brief v4). El código está en `src/` y su guía en [`src/README.md`](../../src/README.md). Las decisiones estructurales que tomó la herramienta están en `docs/prompts.md` y en los `design.md` de cada change de OpenSpec (`src/openspec/changes/`): sin backend, React + Vite + TypeScript, datos del campus como JSON estáticos generados desde el plano, ruta con A\*, PWA para la señal irregular y clima simulado por parámetro. Los cierres se cargan a mano (`src/public/data/cierres.json`), como se decidió en el TP3.

## 3. Preparación de la sesión

El guion completo está en [`docs/evidencia/tp5/guion-sesion.md`](../evidencia/tp5/guion-sesion.md). Resumen:

**Tareas** (situaciones, en este orden para los tres usuarios):

| Tarea | Situación | Mide |
| --- | --- | --- |
| T1 | Primer día de una materia en el Aula 255; entró por la entrada principal y la clase empieza en 10 minutos. | M1, primer uso sin explicación |
| T2 | Salió de la Biblioteca y la clase se pasó al Aula 418. La entrada del Edificio Este por la que pasa la ruta más corta está cerrada y señalizada; no se le menciona. | M2 y M1 |
| T3 | Llueve fuerte, está en el Buffet y tiene que llegar al Aula 108. | M1 y alternativa según el clima |

Elegimos recorridos que no son iguales en todos los casos: con el motor del MVP comprobamos que el cierre de T2 obliga a un desvío (de 185,5 m a 238 m) y que en T3 la ruta resguardada difiere de la más corta (254 m contra 211 m). Una primera elección de T3 (Aula 120) se descartó porque ambas rutas coincidían y no habría probado nada.

**Qué se observa:** dónde duda, se equivoca, pide ayuda o hace algo distinto de lo esperado; en T2, si ve el cierre y si camina el desvío; en T3, qué ruta elige con lluvia; si le alcanza la indicación hasta la puerta del aula.

**Cómo se registra:** notas con la hora de un cronómetro. En cada tarea se anotan tres momentos (entrega del celular, aparición de la ruta en pantalla y llegada a la puerta), y se sigue al usuario a distancia anotando por dónde camina y cada fricción con su hora. El equipo lee las situaciones y no ayuda.

**Qué se pregunta al final**, sin ofrecer opciones: cómo llegó, cómo decidió el camino, por qué fue por ese camino, si hubo un momento en que no supo qué hacer, qué esperaba que hiciera la aplicación, cómo resolvió la última vez que se perdió y cómo lo resolvería hoy, y qué haría la próxima vez.

## 4. Prueba con usuarios

Participan U1, U2 y U3, los mismos del TP2. Se aplican las reglas del enunciado: el equipo observa y no ayuda, y se registra lo que el usuario hace, no solo lo que dice. La evidencia se versiona en `docs/evidencia/tp5/`:

- [`sesion-U1.md`](../evidencia/tp5/sesion-U1.md), [`sesion-U2.md`](../evidencia/tp5/sesion-U2.md) y [`sesion-U3.md`](../evidencia/tp5/sesion-U3.md): notas de cada sesión, con horas y frases textuales.
- [`registro.md`](../evidencia/tp5/registro.md): tiempos y resultado por usuario y tarea.
- [`fricciones.md`](../evidencia/tp5/fricciones.md): cada duda, error o pedido de ayuda con su hora, y la lista de problemas que el TP4 anticipó.

## 5. Las dos capas

_Se redacta con los registros de la sesión. Cada afirmación va con la observación que la sostiene (punto 8)._

**Capa de usabilidad — ¿el MVP funciona bien?**

| Pregunta | Qué se contesta con `registro.md` y `fricciones.md` |
| --- | --- |
| ¿Completaron el flujo y con cuánta fricción? | Llegadas autónomas por tarea, tiempos y fricciones por usuario. |
| ¿Aparecieron los problemas que el TP4 anticipó? | Lista de `fricciones.md`: cuáles aparecieron, con quién y en qué momento. |
| ¿Aparecieron otros? | Fricciones marcadas «Nuevo (no anticipado)». |

**Capa de negocio — ¿la hipótesis se sostiene?** Se contrasta con el criterio del punto 1: M1 (al menos 2 de 3 llegan solos a todos los destinos) y M2 (al menos 2 de 3 caminan el desvío), más lo que contestaron sobre su problema real (preguntas 6 y 7).

## 6. Pivotar o perseverar

_Se decide con el resultado del punto 5._ Según el punto 1: si falla M1, el pivote es de necesidad del consumidor; si falla M2, de zoom-in; si se sostiene, se persevera y se define qué construir primero (por ejemplo el panel de administración de cierres, que el TP3 dejó afuera).

## 7. Brief de Producto — versión 5

Se actualiza `docs/brief.md` con el párrafo de cambios, lo aprendido, el estado de la hipótesis y la decisión. El brief ya tiene una versión 4 (TP4), por lo que esta es la versión 5.

## 8. Anclaje

Cada conclusión del punto 5 se acompaña de la observación de la sesión: quién, en qué momento y qué hizo. Forma: «conclusión — U_, T_, hh:mm:ss: qué hizo», con la hora anotada en la sesión.

## 9. El resultado que no esperábamos

_Se redacta con la sesión._

## 10. La métrica que podría estar mintiendo

_Se redacta con la sesión._

## 11. Sobre el uso de IA en este trabajo

**Se delegó:** la construcción del MVP, con Claude Code y el flujo de OpenSpec (un change por parte del alcance), y ayuda de redacción y de armado de los documentos de evidencia. Las decisiones estructurales que tomó la herramienta quedaron anotadas en `docs/prompts.md` y en los `design.md`.

**No se delegó:** las métricas y el criterio de éxito (punto 1, escritos y commiteados antes de construir), el diseño de las tareas de la sesión, la observación, la interpretación de los resultados y la decisión de pivotar o perseverar. La IA no estuvo en la sala: todo lo que se concluya tiene que poder rastrearse hasta algo que pasó en la sesión.

El registro completo está en `docs/prompts.md`.
