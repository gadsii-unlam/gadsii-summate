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
| T2 | Salió de la Biblioteca y la clase se pasó al Aula 418. La entrada del Edificio Este por la que pasa la ruta más corta está cerrada y señalizada con cinta; no se le menciona. | M2 y M1 |
| T3 | Se le pide que imagine que llueve fuerte (no llovía ese día): está en el Buffet y tiene que llegar al Aula 108. En la aplicación, el equipo activa el clima simulado en lluvia sin que el usuario lo vea. | M1 y alternativa según el clima |

Elegimos recorridos que no son iguales en todos los casos: con el motor del MVP comprobamos que el cierre de T2 obliga a un desvío (de 185,5 m a 238 m) y que en T3 la ruta resguardada difiere de la más corta (254 m contra 211 m). Una primera elección de T3 (Aula 120) se descartó porque ambas rutas coincidían y no habría probado nada.

**Qué se observa:** dónde duda, se equivoca, pide ayuda o hace algo distinto de lo esperado; en T2, si ve el cierre y si camina el desvío; en T3, qué ruta elige con lluvia; si le alcanza la indicación hasta la puerta del aula.

**Cómo se registra:** notas con la hora de un cronómetro. En cada tarea se anotan tres momentos (entrega del celular, aparición de la ruta en pantalla y llegada a la puerta), y se sigue al usuario a distancia anotando por dónde camina y cada fricción con su hora. El equipo lee las situaciones y no ayuda.

**Qué se pregunta al final**, sin ofrecer opciones: cómo llegó, cómo decidió el camino, por qué fue por ese camino, si hubo un momento en que no supo qué hacer, qué esperaba que hiciera la aplicación, cómo resolvió la última vez que se perdió y cómo lo resolvería hoy, y qué haría la próxima vez.

## 4. Prueba con usuarios

Participan U1, U2 y U3, los mismos del TP2. Las sesiones se hicieron en el campus: U1 el 28/10 a las 17:00, U3 el 28/10 a las 18:00 y U2 el 30/10 a las 17:00. Las fechas de la cátedra se movieron respecto de las del enunciado, por eso la prueba quedó después del límite original. Se aplican las reglas del enunciado: el equipo observa y no ayuda, y se registra lo que el usuario hace, no solo lo que dice. La evidencia se versiona en `docs/evidencia/tp5/`:

- [`sesion-U1.md`](../evidencia/tp5/sesion-U1.md), [`sesion-U2.md`](../evidencia/tp5/sesion-U2.md) y [`sesion-U3.md`](../evidencia/tp5/sesion-U3.md): notas de cada sesión, con horas y frases textuales.
- [`registro.md`](../evidencia/tp5/registro.md): tiempos y resultado por usuario y tarea.
- [`fricciones.md`](../evidencia/tp5/fricciones.md): cada duda, error o pedido de ayuda con su hora, y la lista de problemas que el TP4 anticipó.

## 5. Las dos capas

Resultado contra el criterio escrito en el punto 1 (detalle en [`registro.md`](../evidencia/tp5/registro.md)):

| | Resultado | Condición para sostener | ¿Se cumple? |
| --- | --- | --- | --- |
| M1: llegaron solos a las tres tareas | 1 de 3 (U1) | al menos 2 | No. Cumple la condición de **refutación** (como máximo 1 de 3). |
| M2: caminaron el desvío en T2 sin acercarse al cierre | 1 de 3 (U1) | al menos 2 | No. La refutación por M2 tampoco se cumple: U2 y U3 terminaron tomando el desvío y ninguno dijo haber visto el cierre y elegido su camino. |

Según el punto 1, «cualquier otro resultado no confirma la hipótesis»; acá además M1 la refuta. Cada afirmación va con la observación que la sostiene (punto 8).

### Capa de usabilidad — ¿el MVP funciona bien?

**¿Completaron el flujo y con cuánta fricción?** Los tres llegaron a la puerta en las tres tareas (9 de 9) y ocho de nueve sin pedir indicaciones. La excepción es U3 en T1: preguntó a una persona del campus dónde quedaba el 255 (U3, T1, 18:06:15, «¿Sabés dónde está el 255?») y llegó a las 18:08:30, con 8:30 en total. Todos los demás tiempos van de 3:20 a 5:10. Los tres obtuvieron la ruta sin ayuda: apareció a los 35, 50 y 70 segundos de entregarles el celular en T1 (U1, U2 y U3).

La fricción se concentró en dos lugares:

1. **Del edificio al aula (hallazgo #3 del TP4): apareció con 2 de 3.** U1 leyó la indicación de piso y llegó en 4:05 (U1, T1, 17:04:50). U2 subió por la escalera más cercana sin leerla y tuvo que volver a mirar el celular en el primer rellano (U2, T1, 17:03:30). U3 entró por la entrada indicada y siguió de largo por el pasillo (U3, T1, 18:03:40, «Esto no es.» a las 18:04:20), dio una vuelta completa mirando los carteles (18:05:00) y terminó preguntando (18:06:15). Al final lo confirmaron con sus palabras: U2, «En el piso del 255, un poquito.»; U3, «Que me dijera más claro en qué piso.»
2. **El cierre en T2 (hallazgo #4 del TP4): apareció con 2 de 3.** U1 lo vio en el mapa (U1, T2, 17:14:45, «Ah, hay algo cerrado.») y siguió el desvío sin acercarse a la entrada (17:15:10). U2 empezó a caminar sin mirar el mapa en detalle (U2, T2, 17:14:30) y llegó a unos 3 m de la cinta que señalizaba el cierre (17:15:40, «Uy, esto está cerrado.»). U3 caminó hacia la entrada y se acercó a la cinta (U3, T2, 18:19:50, «Ah, acá hay cinta.»). Ninguno pasó la cinta.

**¿Aparecieron los demás problemas del TP4?** Solo hay observación de tres más: U2 tocó varios botones del panel sin escribir nada y preguntó «¿Para qué es este botón?» (U2, T1, 17:00:15 y 17:00:20, primer uso); U3 tuvo un corte de señal de unos 20 s (U3, T1, 18:02:00) y la ruta ya cargada siguió a la vista; y en T3 U2 tocó la alternativa más rápida y volvió a la recomendada (U2, T3, 17:26:30). No se anotó nada sobre «Buscando el camino…», «Sin acceso ahora», cambio de origen ni sobre si abrieron la ayuda: queda como «no se observó» en [`fricciones.md`](../evidencia/tp5/fricciones.md).

**¿Aparecieron otros?** No se anotó ningún problema que el TP4 no hubiera anticipado. Lo no previsto fue la causa del problema del cierre, que se desarrolla en el punto 9.

### Capa de negocio — ¿la hipótesis se sostiene?

Se contrasta con el criterio del punto 1 y con lo que contestaron sobre su problema real.

- **Contra el criterio:** la hipótesis queda refutada por M1 (1 de 3 llega solo a todos los destinos) y no confirmada por M2.
- **Su problema real (pregunta 6 de la sesión):** antes, U1 llamó a un compañero, U2 preguntó en el pasillo y U3 preguntó. Con la aplicación, U1 dijo «Hoy no necesité a nadie.» y U2 «Hoy no hizo falta.», y ninguno de los dos pidió ayuda en las tres tareas; U3 dijo «Hoy también terminé preguntando una vez.» (T1, 18:06:15). Dos de tres resolvieron solos lo que antes resolvían preguntando.
- **Qué harían la próxima vez (pregunta 7):** los tres dijeron que usarían la aplicación (U1: «La busco en la aplicación antes de salir.»; U2: «La aplicación, pero fijándome más en el piso.»; U3: «Usaría la aplicación y, si me pierdo adentro, preguntaría.»). Es lo que dijeron; lo que hicieron es lo que pesa: ocho de nueve tareas sin ayuda.
- **Lluvia simulada (T3):** no llovía ese día; se les pidió imaginarlo y la aplicación mostraba el escenario de lluvia. Los tres caminaron la ruta resguardada. Solo U2 lo explicó como cambio de hábito: «Yo siempre voy por lo más corto, pero hoy no, con esta lluvia no.» (U2, T3, 17:26:45), y en el TP2 había dicho preferir el camino más rápido. U1 («Era la que salía primero») y U3 («Porque era la que salía») siguieron la recomendada sin considerar la otra, así que en esos dos casos no hay evidencia de valor de la alternativa por clima, solo de que la recomendación por defecto no los molestó.
- **Dónde está el problema:** el tramo que se sigue bien es el exterior (los tres siguieron la línea hasta el edificio sin pedir ayuda); el tramo que falla es el último, dentro del edificio, hasta la puerta del aula.

Con tres usuarios no hay significancia estadística: esto es aprendizaje, no medición.

## 6. Pivotar o perseverar

**Decisión: pivotar, con un pivote de necesidad del consumidor.**

**Fundamento.**

- El criterio del punto 1, escrito antes de la prueba, dice que si falla M1 se pivota y que el tipo es de necesidad del consumidor. M1 falló (1 de 3).
- Falló en el paso que el punto 1 describe como «obtiene la ruta correcta pero no la puede seguir»: los tres obtuvieron la ruta (35 a 70 segundos en T1) y las dificultades fueron después, dentro del edificio (U2, T1, 17:03:30; U3, T1, 18:03:40 a 18:06:15).
- Lo que las personas pidieron al final no fue una ruta mejor por el campus, sino claridad sobre el piso (U2 y U3, preguntas finales). Eso sugiere que la necesidad no es «ver una ruta dibujada» (supuesto 2 del TP1), sino llegar a la puerta del aula, incluida la parte interior.

**Nueva hipótesis.** Creemos que los ingresantes y estudiantes de primer año de la UNLaM llegan al edificio sin dificultad con una ruta en el mapa, y que el tiempo se les pierde al orientarse dentro del edificio (piso, pasillo y puerta del aula). Nuestra solución sería una guía de llegada que los lleve de la entrada del edificio hasta la puerta del aula, y que el cierre se muestre antes de empezar a caminar.

**Lo que la evidencia no permite afirmar.**

- Son tres usuarios.
- M1 es sensible a dónde empieza el reloj. Los minutos totales se cuentan desde que se entrega el celular. Si se contaran desde que aparece la ruta, U2 en T1 sería 4:20 y U3 en T2 sería 4:30, y M1 daría 2 de 3. No se cambia el criterio porque se escribió antes de la prueba y un criterio ajustado después no mide nada; se deja dicho. Lo que no cambia con ninguna forma de medir: U3 pidió ayuda en T1.
- Por eso la decisión no se apoya solo en el número de M1, sino en el patrón: dos de tres tuvieron dificultad en el mismo lugar (dentro del edificio) y lo nombraron al final.

**Qué evidencia cambiaría la decisión.** Si en una segunda prueba, con la indicación de piso más visible, los usuarios llegan solos sin dificultad dentro del edificio, el problema era de interfaz y no de necesidad: se vuelve a perseverar con la ruta actual.

## 9. El resultado que no esperábamos

El resultado más alejado de lo previsto fue **por qué U2 y U3 llegaron hasta la cinta en T2**. El TP4 anticipaba que el cierre podía no verse en el mapa (hallazgo #4), y el criterio del punto 1 se preparó para un usuario que lo viera y eligiera su camino. Lo que se observó fue otra cosa: la ruta con el desvío estaba en pantalla y los dos empezaron a caminar antes de leerla.

- U2 «empezó a caminar sin mirar el mapa en detalle» a las 17:14:30 y se detuvo a unos 3 m de la cinta a las 17:15:40. Explicó: «Primero fui por el camino más directo, que es el que yo conozco. Después vi que la aplicación daba la vuelta.»
- U3 llegó a la cinta a las 18:19:50 y dijo: «No me fijé en lo rojo hasta que ya estaba ahí.»

Con eso el problema no es que el cierre no se muestre ni que lo vean y lo ignoren: es que quien conoce el camino, o cree conocerlo, camina primero y mira después. U2 lo pidió con sus palabras: «Que me avisara más fuerte lo del cierre.»

**Qué hicimos con eso.** Lo cargamos como hallazgo nuevo sobre cómo se usa el mapa, y cambia dos cosas en este informe: la lectura de M2 (punto 10) y la nueva hipótesis del punto 6, que incluye mostrar el cierre antes de empezar a caminar.

También hubo un resultado a favor que no estaba previsto: U2 había dicho en el TP2 que prefería el camino más rápido y con la lluvia simulada fue por la resguardada (U2, T3, 17:26:45). Es un solo caso y con lluvia imaginada, no real: indica que la recomendación por clima puede cambiar una preferencia declarada, pero no que lo haga cuando llueve de verdad.

## 10. La métrica que podría estar mintiendo

**M2, el seguimiento del desvío.**

Mirado a simple vista, el resultado parece tranquilizador: en T2 nadie pasó por el tramo cerrado (los tres «No» en `registro.md`) y los tres terminaron caminando el desvío. Pero U2 y U3 se detuvieron frente a la cinta (U2, T2, 17:15:40; U3, T2, 18:19:50), la cinta que señalizaba el cierre en el lugar, no una decisión que les haya llevado la aplicación. U3 lo dijo: «No me fijé en lo rojo hasta que ya estaba ahí.» Si el cierre del campus no tuviera cinta, el mismo comportamiento los habría llevado al tramo cerrado.

Lo que protege contra esa lectura es que el criterio exige caminar el desvío **sin acercarse** al cierre, lo que da 1 de 3 y no 3 de 3. Quien lea «nadie pasó por el tramo cerrado» sin esa condición se queda con una conclusión que la hipótesis no justifica.

M1 tiene un problema distinto y menor: depende de dónde empieza el reloj (punto 6), y con otro punto de partida el resultado pasaría de 1 de 3 a 2 de 3.
