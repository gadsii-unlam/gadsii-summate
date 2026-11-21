# Brief de Producto

<!-- Versión 1 — TP1. Cada versión siguiente abre con un párrafo de qué cambió y por qué. -->

## Versión 1 — TP1 (25/08/2026)

**Qué cambió respecto de la versión anterior y por qué:** esta es la primera versión del brief, así que no hay una anterior con la cual compararla. Nace en el TP1 y consolida las definiciones tomadas en ese trabajo práctico: el segmento de la comunidad UNLaM al que apuntamos, el producto (nombre, problema y destinatarios), sus funcionalidades core, las integraciones previstas, los grupos de usuarios con el primario elegido y la lista de supuestos con el supuesto crítico identificado. Se escribe ahora porque el TP1 es el primer momento en el que el equipo cerró una definición de producto lo bastante estable como para registrarla, y queda como base para medir la evolución en los TPs siguientes.

---

### 1. Segmento elegido

**Segmento:** ingresantes y estudiantes de primer año de la UNLaM, es decir, personas que están cursando el Curso de Ingreso o sus primeras materias y que todavía no conocen bien la distribución del campus.

**Tamaño estimado:** entre 30.000 y 35.000 personas por año, tomando como referencia los más de 27.000 aspirantes que hacen el Curso de Ingreso y los aproximadamente 7.000 a 9.000 estudiantes que efectivamente empiezan a cursar sus carreras.

**Por qué elegimos este segmento:**

- Es el grupo con más dificultades durante los primeros meses: cuando recibe un número de aula o el nombre de un sector, muchas veces no sabe dónde queda ni cuál es la mejor forma de llegar. Un estudiante avanzado ya conoce los edificios, pasillos y recorridos habituales.
- Durante las primeras semanas todavía no conocen a demasiadas personas dentro de la Universidad, así que ante una duda no siempre tienen un compañero a quien preguntarle y terminan consultando a otras personas que encuentran en el lugar o buscando por su cuenta.
- Es un problema que se repite todos los años: la dificultad disminuye a medida que los estudiantes aprenden a ubicarse, pero vuelve a aparecer con cada nueva camada de ingresantes.
- Aunque perderse en el campus parezca un problema menor, puede derivar en llegar tarde a una clase o evaluación por no encontrar el aula, o demorar más de lo esperado en encontrar algún sector.
- El equipo pasó por esa etapa y reconoce la desorientación inicial como algo normal y generalizado. A diferencia de los estudiantes avanzados o del personal, los ingresantes tienen que aprender desde cero cómo moverse dentro de la UNLaM.

### 2. Producto

**Nombre:** _¿Dónde queda?_ — la pregunta reproduce la expresión cotidiana que usa una persona cuando necesita encontrar un aula, una dependencia o un servicio dentro del campus.

**Qué es:** una aplicación web de orientación dentro del campus de la Universidad Nacional de La Matanza.

**Problema que resuelve:** la dificultad de orientarse en el campus cuando no se conoce con precisión la ubicación de las aulas, los pasillos, las dependencias administrativas o los servicios disponibles. Esa desorientación genera demoras, recorridos innecesarios, llegadas tarde a una clase o trámite y dependencia de indicaciones informales que no siempre son claras ni están actualizadas.

**A quién se lo resuelve:** principalmente a estudiantes del Curso de Ingreso y de primer año, porque son quienes tienen menos familiaridad con la distribución del campus y necesitan aprender rápido cómo desplazarse entre aulas, oficinas y servicios. También puede resultar útil para otros integrantes o visitantes de la comunidad universitaria, pero el diseño y la validación inicial se concentran en el segmento elegido.

**Respuesta concreta:** el usuario selecciona un punto de partida y un destino sobre el mapa, y la aplicación calcula y dibuja el recorrido más corto disponible. Si el destino corresponde a una categoría con varias ubicaciones —por ejemplo, baños o máquinas expendedoras—, el sistema elige la alternativa accesible más cercana y muestra cómo llegar.

### 3. Funcionalidades core

1. **Mapa interactivo del campus y cálculo de la ruta más corta.** El usuario selecciona el aula, pasillo o sector desde el cual comienza y el lugar al que quiere llegar; la aplicación calcula la ruta más corta disponible entre ambos puntos y la dibuja sobre el mapa.
2. **Consulta de puntos de interés y su estado de atención.** El mapa permite seleccionar lugares relevantes —centro de estudiantes, comedor, Dirección de Alumnos, teatro y biblioteca— y ver si están abiertos o cerrados según el día, la hora y el horario de atención registrado.
3. **Búsqueda del servicio disponible más cercano.** El usuario indica una necesidad sin elegir una ubicación específica (por ejemplo "ir al baño" o "buscar una máquina expendedora"); la aplicación identifica la alternativa más cercana a través de los pasillos disponibles y traza la ruta más corta para llegar.
4. **Administración de caminos temporalmente no disponibles.** Un usuario administrador marca pasillos, accesos o sectores cerrados por refacciones u otra causa; las rutas dejan de pasar por esos lugares y utilizan recorridos alternativos disponibles.
5. **Rutas adaptadas a las condiciones climáticas.** Cuando la información meteorológica indica lluvia, la aplicación evita los pasillos y sectores exteriores y recomienda la ruta interior más corta. Si no llueve, también puede considerar los recorridos exteriores disponibles.

### 4. Integraciones previstas

**API de clima.** La aplicación consulta las condiciones meteorológicas actuales del campus para saber si está lloviendo.

- **Uso de la información climática:** cuando la API informa lluvia, la aplicación evita los pasillos y sectores exteriores (siempre que sea posible) y recomienda la ruta interior más corta disponible. Cuando no llueve, considera tanto recorridos interiores como exteriores, respetando siempre los tramos que el administrador haya marcado como cerrados.
- **Por qué es necesaria:** la aplicación no puede saber por sí sola si está lloviendo en el campus. La API permite adaptar la ruta a las condiciones reales del momento, sin requerir sensores propios ni usar la ubicación GPS del usuario.

### 5. Grupos de usuarios y usuario primario

- **Navegante.** Alumnos que necesitan orientarse dentro del campus, especialmente ingresantes y estudiantes de primer año que todavía no conocen bien la ubicación de las aulas y los recorridos disponibles. Se relacionan directamente con el problema porque deben desplazarse desde un punto de partida hasta el aula o sector que buscan. Los motiva obtener una ruta clara y actualizada, llegar a destino con mayor rapidez y evitar depender de indicaciones de terceros.
- **Administrador.** Persona autorizada para configurar el mapa del campus y mantener actualizada la disponibilidad de sus recorridos. Su relación con el problema consiste en registrar cierres, refacciones u otras situaciones que impidan circular por determinados tramos. Lo motiva poder habilitar o deshabilitar esos tramos de forma sencilla, para que las rutas calculadas sean válidas y no dirijan a los alumnos por sectores no disponibles.

**Usuario primario elegido: Navegante**, con foco en los ingresantes y estudiantes de primer año que conforman el segmento. Lo elegimos porque es el grupo que experimenta de manera directa y frecuente la dificultad de orientarse en el campus y el principal beneficiario de la propuesta: la utilidad del producto depende, ante todo, de que estos alumnos puedan elegir un punto de partida y encontrar una ruta comprensible y confiable hasta el aula o sector deseado.

> **Aclaración:** esta elección de usuario primario es **todavía hipotética**. Se apoya en la definición de producto y en la experiencia del equipo, pero aún no fue validada con usuarios reales. Se confirmará o se corregirá con el relevamiento y las entrevistas de los TPs siguientes.

### 6. Supuestos

| #               | Supuesto                                                                                                                                                 | Cómo se comprobaría                                                                                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 (crítico)** | Los ingresantes y estudiantes de primer año tienen dificultades para encontrar aulas, dependencias y servicios durante sus primeras semanas en la UNLaM. | Entrevistas a U1, U2 y U3 y una prueba de recorrido en la que relaten o evidencien desorientación, demoras, pedidos de indicaciones o recorridos equivocados.                       |
| 2               | Una ruta dibujada resulta más útil para este grupo que consultar solamente un mapa estático del campus.                                                  | Ofrecer ambas alternativas en una prueba y registrar cuál es más usada.                                                                                                             |
| 3               | La mayoría de los usuarios del segmento lleva un teléfono celular con acceso a Internet mientras se desplaza por el campus.                              | Preguntar a U1, U2 y U3 qué dispositivo usan habitualmente y verificar en los recorridos de prueba que puedan abrir la aplicación web y consultar una ruta en el momento.           |
| 4               | Los cierres temporales de pasillos o accesos pueden volver incorrecta una ruta conocida y necesitan reflejarse en la aplicación.                         | Relevar cierres o desvíos ocurridos en el campus y consultar a usuarios y personal si esas situaciones generan recorridos fallidos o pedidos de indicaciones.                       |
| 5               | Cuando llueve, los usuarios prefieren una ruta interior aunque sea más larga que el recorrido exterior más corto.                                        | Presentar a U1, U2 y U3 ambos recorridos en un escenario de lluvia y registrar su elección y el motivo; luego contrastar el comportamiento en una prueba realizada con lluvia real. |

El **supuesto 1 es el crítico**: si no se verifica, el problema que da origen al producto no existe con la relevancia que le atribuimos y toda la propuesta pierde sentido. Por eso es el primero que se pone a prueba en el relevamiento.

# Brief de Producto — versión 2

**Qué cambió respecto de la versión 1 y por qué:** en la primera versión habíamos armado el perfil del Navegante a partir de lo que nosotros suponíamos. Para esta versión usamos las respuestas de una encuesta hecha a cinco ingresantes y estudiantes de primer año de la UNLaM. Con esos resultados pudimos describir mejor al usuario, saber en qué momentos tiene problemas para ubicarse y revisar los supuestos del TP1. El problema principal se mantiene porque cuatro de las cinco personas encuestadas tuvieron dificultades para encontrar aulas o sectores. También encontramos dos cuestiones que no habíamos tenido en cuenta: la señal de Internet dentro del campus es irregular y no todos eligen el mismo tipo de camino cuando llueve.

## Perfil del usuario real

El usuario principal sigue siendo un ingresante o estudiante de primer año que todavía no conoce bien el campus. La diferencia es que ahora el perfil está basado en las respuestas de U1 a U5, disponibles en la [encuesta](<evidencia/tp2/Encuesta%20sobre%20orientación%20en%20el%20campus%20%E2%80%94%20UNLaM(1-5).xlsx>) y en el [resumen de resultados](evidencia/tp2/Resultados_Forms.pdf).

De las cinco personas encuestadas, tres van al campus entre una y dos veces por semana y dos van entre tres y cuatro veces. Ninguna respondió que va todos los días. El promedio de dificultad para orientarse fue de 6 sobre 10.

A cuatro les pasó entre dos y seis veces no encontrar un aula o sector. La última vez que tuvieron ese problema perdieron entre cinco y diez minutos, y todos habían llegado tarde al menos una vez por no encontrar el lugar. A la quinta persona no le había pasado. Esto muestra que no todos se pierden con la misma frecuencia, pero que el problema existe. Además, los cinco llevan siempre el celular y se conectan con datos móviles de señal irregular.

## Necesidades, problemas y contexto de uso relevados

La principal necesidad es encontrar un aula o sector rápido y tener indicaciones claras para llegar. También necesitan saber por dónde seguir si encuentran un pasillo, una escalera o una puerta cerrada. Como la señal no es buena, la información del recorrido debería poder seguir consultándose aunque la conexión se corte por un momento.

El problema no es solamente no saber dónde queda un lugar. Cuatro usuarios perdieron entre cinco y diez minutos la última vez que les pasó y los cuatro habían llegado tarde por ese motivo. También cuatro encontraron sectores cerrados varias veces. Dos pudieron dar la vuelta sin problemas, uno tardó bastante en encontrar otro camino y otro tuvo que preguntarle a alguien.

Hoy resuelven estas situaciones de distintas maneras. Tres usaron el mapa de la Universidad y otra persona lo conocía, aunque nunca lo había usado. También buscan carteles, consultan la web de la UNLaM o WhatsApp, preguntan a otras personas o caminan hasta encontrar el lugar. Esto muestra que tienen información disponible, pero que muchas veces necesitan combinar varios recursos para poder llegar.

La aplicación se usaría desde el celular mientras el estudiante se mueve por el campus, por ejemplo antes de una clase, un examen o un trámite. En esos momentos puede tener poco tiempo, encontrarse con un camino cerrado o estar bajo la lluvia. Sobre este último punto, tres usuarios prefieren desviarse para no mojarse aunque tarden un poco más, mientras que dos prefieren llegar por el camino más rápido. Por eso conviene mostrar las dos opciones y dejar que cada persona elija.

## Hipótesis de valor

Creemos que los ingresantes y estudiantes de primer año de la UNLaM tienen problemas para encontrar aulas y sectores cuando todavía no conocen bien el campus o cuando un camino que conocen está cerrado. Esto puede hacer que pierdan entre cinco y diez minutos y que lleguen tarde. Nuestra solución es _¿Dónde queda?_, una aplicación web para celular que muestra una ruta desde el punto de partida hasta el destino, tiene en cuenta los sectores cerrados y permite elegir entre un camino rápido y otro más resguardado cuando llueve.

Sabremos que la propuesta funciona si, en una prueba con al menos cinco usuarios del grupo principal, cuatro logran llegar a un destino en menos de cinco minutos, sin pedir indicaciones y sin intentar pasar por un acceso cerrado, usando la conexión disponible en el campus.

## Estado de los supuestos del TP1

| #               | Supuesto del TP1                                                                                                                                         | Estado                   | Evidencia                                                                                                                                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 (crítico)** | Los ingresantes y estudiantes de primer año tienen dificultades para encontrar aulas, dependencias y servicios durante sus primeras semanas en la UNLaM. | **Confirmado**           | A U1, U2, U3 y U4 les pasó entre dos y seis veces. La última vez perdieron entre cinco y diez minutos y todos habían llegado tarde al menos una vez. A U5 no le había pasado.                                                           |
| 2               | Una ruta dibujada resulta más útil para este grupo que consultar solamente un mapa estático del campus.                                                  | **No se pudo comprobar** | Tres usuarios habían usado el mapa institucional y uno lo conocía, pero en la encuesta no comparamos el mapa con una ruta dibujada. Por eso todavía no podemos confirmar ni descartar este supuesto.                                    |
| 3               | La mayoría lleva un teléfono celular con acceso a Internet mientras se desplaza por el campus.                                                           | **Confirmado**           | Los cinco llevan siempre el celular y tienen datos móviles. Los cinco también dijeron que la señal es irregular.                                                                                                                        |
| 4               | Los cierres temporales de pasillos o accesos pueden volver incorrecta una ruta conocida y necesitan reflejarse en la aplicación.                         | **Confirmado**           | Cuatro de cinco encontraron sectores cerrados varias veces. Uno tardó bastante en encontrar otro camino y otro tuvo que preguntar. Todavía falta probar con el prototipo si mostrar esos cierres resuelve el problema.                  |
| 5               | Cuando llueve, los usuarios prefieren una ruta interior aunque sea más larga que el recorrido exterior más corto.                                        | **Confirmado**           | Tres de cinco prefieren desviarse aunque tarden un poco más. Los otros dos eligen el camino más rápido, así que la preferencia existe pero no es igual para todos. Además, la respuesta no se comprobó en una situación de lluvia real. |

Con los resultados de la encuesta no se cayó ninguno de los supuestos del TP1. El supuesto 2 quedó pendiente porque no hicimos la comparación necesaria para comprobarlo. Tampoco agregamos supuestos nuevos: la señal irregular y las distintas preferencias cuando llueve son hallazgos del relevamiento.

# Brief de Producto — versión 3

**Qué cambió respecto de la versión 2 y por qué:** la versión 2 dejó cerrado el perfil del usuario real y la hipótesis de valor, pero todavía describía el producto con las cinco funcionalidades completas del TP1. En esta versión recortamos esa definición a lo que efectivamente vamos a construir para ponerla a prueba: definimos el scope del MVP, separamos qué se construye de qué se simula, describimos el flujo principal de punta a punta y elegimos los atributos de usabilidad que vamos a priorizar. El cambio se hace ahora porque el TP3 es el momento en el que pasamos de la definición del problema al diseño de la interacción, y necesitamos un alcance chico y suficiente para validar la hipótesis con usuarios reales. Las decisiones nuevas más importantes son tres: la API de clima se simula en lugar de integrarse, el panel de administración de cierres queda afuera (los tramos cerrados se precargan a mano) y las funcionalidades de servicio más cercano y horarios de puntos de interés se posponen. Nada de esto reemplaza a las versiones anteriores: el segmento, el problema, el usuario primario y los supuestos siguen vigentes tal como quedaron en las versiones 1 y 2.

## Scope del MVP

El MVP se acota a lo mínimo necesario para probar la hipótesis de valor de la versión 2: que un ingresante o estudiante de primer año pueda llegar a un destino del campus desde el celular, en poco tiempo, sin pedir indicaciones y sin ser dirigido por un acceso cerrado.

| Incluido en el MVP                                                  | Para qué parte de la hipótesis sirve                                                                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Selección de origen y destino desde el celular.                     | Permite plantear el recorrido concreto que el usuario necesita resolver.                                                            |
| Cálculo y dibujo de una ruta clara sobre el mapa.                   | Prueba si las indicaciones permiten llegar sin ayuda y dentro del tiempo definido.                                                  |
| Exclusión de tramos cerrados al calcular la ruta.                   | Permite verificar que el usuario no sea dirigido por un acceso no disponible.                                                       |
| Consulta de una API meteorológica simulada y adaptación de la ruta. | Permite probar la propuesta de ofrecer un recorrido más resguardado cuando llueve sin depender todavía de un servicio externo real. |

| Excluido del MVP                                                   | Por qué se excluye                                                                                                                                       |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conexión real con una API meteorológica externa.                   | Para el MVP se simulan respuestas de lluvia y ausencia de lluvia; así se prueba la adaptación de la ruta sin depender de la disponibilidad del servicio. |
| Búsqueda del servicio más cercano y horarios de puntos de interés. | Amplía los casos de uso, pero no es necesaria para probar que el usuario llegue a un destino asignado.                                                   |
| Panel de administración de cierres.                                | Los tramos cerrados se precargan manualmente antes de la prueba. El MVP debe respetarlos al calcular, pero no necesita una interfaz para gestionarlos.   |

## Qué se construye y qué se simula

| Elemento                                 | Se construye                                                                                               | Se simula / se resuelve a mano                                     | Por qué                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Interfaz web móvil                       | Pantallas y controles para elegir origen, destino y solicitar la ruta.                                     | No se simula.                                                      | Es el componente de software propio con el que interactúa el usuario.                              |
| Mapa y motor de rutas                    | Cálculo del recorrido y representación visual sobre el mapa.                                               | No se simula.                                                      | Permite evaluar si la ruta guía al usuario.                                                        |
| Cierres temporales                       | El algoritmo evita los tramos marcados como no disponibles.                                                | El equipo precarga los cierres; no hay panel administrador.        | Se construye el comportamiento que recibe el Navegante; sólo se simula la gestión previa del dato. |
| API meteorológica y adaptación climática | La aplicación consulta un servicio simulado, interpreta lluvia o ausencia de lluvia y adapta el recorrido. | Se simula la respuesta del servicio externo para ambos escenarios. | Permite evaluar la adaptación climática antes de integrar la API real.                             |

## Flujo principal del MVP

El flujo central se concentra en una única tarea: obtener y seguir una ruta válida hasta un destino del campus desde el celular.

1. **Abrir la aplicación.** El Navegante accede a la aplicación web móvil y visualiza el mapa junto con los campos de origen y destino.
2. **Indicar el recorrido.** Selecciona el punto desde el que parte y el aula o sector al que necesita llegar. La opción para calcular se habilita cuando ambos datos son válidos.
3. **Solicitar la ruta.** La aplicación consulta los cierres precargados y el servicio meteorológico simulado antes de calcular el recorrido.
4. **Adaptar la recomendación.** El motor excluye siempre los tramos cerrados. Si no llueve, prioriza la ruta más corta; si llueve, recomienda la más resguardada y mantiene disponible la alternativa más rápida.
5. **Mostrar el recorrido.** La ruta elegida se dibuja claramente sobre el mapa, con origen y destino identificados.
6. **Seguir la ruta y llegar.** Una vez cargado el recorrido, permanece visible sin requerir actualizaciones continuas.

## Atributos de usabilidad priorizados

Se priorizan eficiencia, tasa de errores y facilidad de aprendizaje, porque son los atributos que inciden directamente en la hipótesis de valor y en el contexto relevado en el TP2.

| Atributo priorizado          | Justificación a partir del TP2                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Eficiencia**               | Cuatro de los cinco usuarios perdieron entre cinco y diez minutos la última vez que no encontraron un destino y todos ellos llegaron tarde al menos una vez. Además, la consulta puede ocurrir antes de una clase, examen o trámite, con poco margen de tiempo. Por eso el recorrido debe obtenerse con pocos pasos para el usuario y permitir llegar rápidamente, como establece la hipótesis.     |
| **Tasa de errores**          | Cuatro usuarios encontraron pasillos, escaleras, puertas o sectores cerrados; uno tardó bastante en hallar otra ruta y otro tuvo que preguntar. El MVP debe prevenir la selección incompleta de origen o destino y, sobre todo, evitar que la ruta conduzca por un tramo cerrado. Llegar sin pedir ayuda ni intentar usar un acceso no disponible forma parte del criterio de validación.           |
| **Facilidad de aprendizaje** | El usuario primario está formado por ingresantes y estudiantes de primer año que todavía no conocen el campus. Los recursos actuales son dispersos y, ante una duda, combinan mapa institucional, carteles, web, WhatsApp, otras personas o prueba y error. La aplicación debe entenderse en el primer uso, desde el celular y sin capacitación: elegir origen, elegir destino y solicitar la ruta. |

# Brief de Producto — versión 4

**Qué cambió respecto de la versión 3 y por qué:** en el TP4 recibimos la evaluación de Bananza sobre el wireframe de _¿Dónde queda?_ y respondimos sus observaciones. La devolución mostró que resolver la consulta con pocos toques no alcanza si el usuario parte de un origen equivocado, no sabe cómo llegar desde el edificio hasta el aula o pierde la información por un corte de señal. Esta versión incorpora las correcciones que llevaremos al TP5, las propuestas que cuestionamos y las mejoras que quedan para después. Mantenemos el segmento, la hipótesis de valor y los atributos priorizados; ajustamos la interacción dentro del alcance del MVP. Son cambios previstos para su construcción y prueba, no resultados ya validados con usuarios.

## Evaluación recibida y relación con el usuario

Bananza valoró la eficiencia del mapa con panel y el cálculo sin un botón adicional, pero señaló riesgos en la prevención de errores y en la facilidad de aprendizaje. Los hallazgos se relacionan con los datos del TP2: cuatro de cinco usuarios tuvieron dificultades para encontrar aulas o sectores, perdieron entre cinco y diez minutos y llegaron tarde al menos una vez; los cinco declararon datos móviles con señal irregular. Además, cuatro encontraron accesos cerrados en varias oportunidades.

Tomamos como referencia el informe de Bananza y la respuesta del equipo en el punto 6 del [TP4](entregas/TP4-Summate.docx). Los números de hallazgo que siguen corresponden a ese informe. La evaluación que realizamos sobre Followare forma parte del TP4, pero los ajustes de este brief se refieren a nuestro producto.

## Correcciones que entran en el MVP del TP5

| Hallazgos de Bananza | Cambio previsto | Por qué lo incorporamos |
| --- | --- | --- |
| **1 y 2 — Origen precargado y dificultad para reconocer el punto de partida.** | Mostrar el último origen como una sugerencia que debe confirmarse en el mismo panel antes de calcular. Agregar referencias reconocibles, como biblioteca y comedor, a la selección del origen. | Un ingresante puede no conocer los nombres del campus. Ahorrar un toque no compensa comenzar desde un lugar incorrecto. |
| **3 — La ruta llega al edificio, pero no orienta hasta el aula.** | Agregar, para las aulas incluidas en la prueba, la entrada, el piso y la escalera o ascensor que corresponda, con datos verificados. | La hipótesis exige llegar al destino sin pedir indicaciones; llegar solamente al edificio deja parte de la tarea sin resolver. |
| **5 y 7 — Falta de respuesta ante problemas de conexión.** | Mostrar “Sin conexión” y permitir reintentar. Conservar el mapa y la ruta ya cargados durante el recorrido; si aún no hay ruta, mantener disponible el mapa. Si falla el servicio de clima simulado, avisar y permitir elegir el criterio de recorrido sin asumir que no llueve. | La señal irregular fue declarada por los cinco usuarios. El recorrido debe seguir siendo consultable ante un corte momentáneo. |
| **8 — Falta de un indicador de cálculo.** | Mostrar “Buscando el camino…” mientras se obtiene la ruta. | El usuario necesita distinguir una espera de una acción que no se registró. |
| **9 — Destino sin acceso identificado con “-”.** | Reemplazar el guion por “Sin acceso ahora” en la lista de destinos. | Permite conocer el impedimento antes de intentar obtener el recorrido. |
| **6 y 10 — Ayuda y primer uso insuficientes.** | Incluir ayuda breve junto a los controles y una indicación inicial cuando todavía no haya destinos recientes. | La facilidad de aprendizaje no puede depender de un historial que el usuario nuevo todavía no tiene. |
| **11 — Cambio de origen que altera el destino o genera una ruta no solicitada.** | Mantener visible el destino al cambiar el origen. Si no hay destino elegido, volver al inicio sin calcular una ruta al Aula 4. | El recorrido debe responder a la selección del usuario y conservar su contexto. |
| **12 — Nombres inconsistentes entre el mapa y la lista.** | Unificar los nombres de edificios y lugares en toda la interfaz. | Las referencias deben permitir reconocer el mismo destino sin interpretaciones adicionales. |

## Propuestas cuestionadas y mejoras postergadas

**Reportes colaborativos de cierres (4).** Aceptamos que la información sobre cierres debe reflejarse en las rutas, pero no incorporaremos reportes con fotos y texto en este MVP. El TP2 muestra el problema de los accesos cerrados, pero no relevó disposición a reportarlos ni cómo validar esos avisos. La señal irregular también limita el envío de imágenes. Para el TP5 mantenemos la decisión del TP3: el equipo precarga los cierres y el motor excluye esos tramos. El reporte colaborativo queda pendiente de validación posterior.

**Sección de tutoriales (6).** Aceptamos la falta de orientación, pero cuestionamos que requiera severidad 3 y una sección de guías extensas. El TP2 muestra consultas con poco margen de tiempo y no aporta evidencia de que un tutorial sea necesario. Primero incorporaremos ayuda breve en contexto y comprobaremos si permite completar la tarea. Las guías extensas quedan postergadas hasta contar con esa evidencia.

**Selección de un punto libre sobre el mapa (2).** Para el TP5 sumaremos referencias reconocibles a la selección del origen. La posibilidad de tocar cualquier punto del mapa queda para después, según lo que observemos al probar si esas referencias alcanzan para ubicarse.

También se mantienen las exclusiones de la versión 3: API meteorológica real, panel de administración de cierres, búsqueda del servicio más cercano y horarios de puntos de interés.

## Flujo principal ajustado para el TP5

1. **Abrir la aplicación.** Mostrar el mapa, los campos de origen y destino y una indicación breve si es el primer uso.
2. **Indicar el recorrido.** Elegir el origen entre referencias reconocibles o confirmar el último sugerido, y seleccionar el destino. Ambos datos permanecen visibles y editables.
3. **Obtener la ruta.** Con origen confirmado y destino válido, calcular automáticamente, consultar los cierres precargados y el clima simulado, y mostrar el estado de espera.
4. **Resolver la espera o el fallo.** Si falla la conexión, informar y permitir reintentar sin borrar la información ya cargada. Si falla la consulta climática, permitir elegir el criterio de recorrido.
5. **Seguir el recorrido.** Mostrar la ruta y las indicaciones de llegada al aula o sector. Con lluvia, recomendar la alternativa resguardada y mantener disponible la más rápida. Excluir siempre los tramos cerrados precargados.
6. **Corregir sin perder el contexto.** Permitir cambiar el origen conservando el destino. Sin destino elegido, volver al inicio sin generar una ruta. Mantener disponible el recorrido ya cargado durante el desplazamiento.

## Aprendizaje y validación pendiente

Aprendimos que la eficiencia se mide en el recorrido completo, no solamente en los toques necesarios para dibujar una ruta. Un origen equivocado o una llegada incompleta puede devolver el tiempo que ahorramos en la interfaz. Por eso conservamos el mapa con panel, pero reforzamos la prevención de errores y la comprensión del primer uso.

La hipótesis de valor no cambia: en una prueba con al menos cinco usuarios del grupo primario, cuatro deberán llegar a un destino asignado en menos de cinco minutos, sin pedir indicaciones ni intentar pasar por un acceso cerrado, usando la conectividad disponible en el campus. En el TP5 observaremos especialmente si reconocen el origen, comprenden las indicaciones hasta el aula y pueden continuar consultando el recorrido ante una interrupción de señal. La evaluación heurística permite anticipar problemas; la prueba con usuarios sigue pendiente.

# Brief de Producto — versión 5

**Qué cambió respecto de la versión 4 y por qué:** la versión 4 reunía correcciones previstas para el MVP, sin validar con usuarios. En el TP5 construimos el MVP, lo probamos con U1, U2 y U3 —tres de los cinco usuarios del TP2— y lo medimos contra el criterio de éxito que escribimos y commiteamos antes de la prueba. El resultado cambia la versión anterior en tres puntos: la hipótesis de valor queda refutada según ese criterio, porque solo 1 de 3 llegó solo a todos los destinos; decidimos pivotar con un pivote de necesidad del consumidor, que agrega una nueva hipótesis de valor; y el supuesto 2 del TP1 pasa de «no se pudo comprobar» a «sostenido en parte». Mantenemos el segmento (ingresantes y estudiantes de primer año), el problema de fondo y las exclusiones de la versión 3. No reemplazamos las versiones anteriores: la hipótesis de las versiones 2 a 4 queda escrita como la que se puso a prueba.

## Qué se construyó y qué se probó

Se construyó el alcance del TP3 con las correcciones del TP4 que aceptamos llevar, sin panel de administración de cierres, con el clima simulado y los cierres cargados a mano, como estaba previsto. El cierre de T2 se cargó para la prueba y se retiró después, por eso el archivo de cierres versionado quedó vacío. La prueba se hizo en el campus: U1 y U3 el 28/10 y U2 el 30/10. Cada usuario resolvió tres tareas planteadas como situaciones: T1 (entrada de Florencio Varela → Aula 255), T2 (Biblioteca → Aula 418, con la entrada del Edificio Este cerrada y señalizada con una cinta que colocó el equipo) y T3 (Buffet → Aula 108, con lluvia imaginada por el usuario y el clima simulado en lluvia en la aplicación; U2 conocía el 108 y fue al Aula 112). El equipo observó sin ayudar y registró con notas y la hora de un cronómetro. La evidencia está en [`docs/evidencia/tp5/`](evidencia/tp5/) y el análisis completo en el [informe del TP5](entregas/TP5-Summate.pdf).

## Resultado contra el criterio de éxito

| | Resultado | Condición para sostener | ¿Se cumple? |
| --- | --- | --- | --- |
| **M1:** llegaron solos a las tres tareas (5 minutos o menos, sin pedir indicaciones ni tomar el tramo cerrado) | 1 de 3 (U1) | al menos 2 | No. Cumple la condición de **refutación** (como máximo 1 de 3). |
| **M2:** caminaron el desvío en T2 sin acercarse al cierre | 1 de 3 (U1) | al menos 2 | No. La refutación por M2 no se cumple: U2 y U3 terminaron en el desvío y ninguno dijo haber visto el cierre y elegido su camino. |

**Estado de la hipótesis de valor: refutada** según el criterio del TP5, por M1. La lectura tiene dos límites: son tres usuarios, y M1 depende de dónde empieza el reloj. Los minutos se cuentan desde la entrega del celular; si se contaran desde que aparece la ruta, U2 en T1 y U3 en T2 quedarían por debajo de 5 minutos y M1 daría 2 de 3. No cambiamos el criterio porque se escribió antes de la prueba; lo que no cambia con ninguna forma de medir es que U3 pidió ayuda en T1.

## Lo que aprendimos

**Usabilidad.** Los tres llegaron a la puerta en las tres tareas (9 de 9) y ocho de nueve sin pedir indicaciones. La fricción se concentró en dos problemas que el TP4 había anticipado. El primero es la llegada del edificio al aula (hallazgo 3), con 2 de 3: U2 subió sin leer la indicación de piso (T1, 17:03:30) y U3 siguió de largo por el pasillo y terminó preguntándole a una persona (T1, 18:03:40 a 18:06:15). El segundo es el cierre (hallazgo 4), también con 2 de 3: U2 y U3 llegaron hasta la cinta antes de tomar el desvío (T2, 17:15:40 y 18:19:50), aunque ninguno la pasó. No apareció ningún problema que el TP4 no hubiera anticipado.

**Negocio.** Dos de tres resolvieron solos lo que antes resolvían preguntando («Hoy no necesité a nadie», dijo U1) y los tres dijeron que la usarían la próxima vez. El tramo exterior se sigue bien; el que falla es el último, dentro del edificio, hasta la puerta del aula. Lo que no esperábamos fue el motivo del problema del cierre: la ruta con el desvío estaba en pantalla, pero U2 y U3 empezaron a caminar antes de mirarla («No me fijé en lo rojo hasta que ya estaba ahí», dijo U3). El cierre no se muestra mal: se mira tarde. Con lluvia simulada los tres caminaron la ruta resguardada, aunque solo U2 lo explicó como un cambio de hábito («Yo siempre voy por lo más corto, pero hoy no»).

## Decisión: pivotar

**Pivotamos, con un pivote de necesidad del consumidor.** El criterio del TP5 establecía este pivote si fallaba M1. Además, el patrón de la prueba lo sostiene: M1 falló en el paso de seguir la ruta y no en el de obtenerla, y dos de tres tuvieron dificultad en el mismo lugar, dentro del edificio, y lo nombraron al final («Que me dijera más claro en qué piso», dijo U3). Lo que necesitan no sería ver una ruta dibujada, sino llegar a la puerta del aula.

**Nueva hipótesis de valor:** creemos que los ingresantes y estudiantes de primer año de la UNLaM llegan al edificio sin dificultad con una ruta en el mapa y que el tiempo se les pierde al orientarse dentro del edificio (piso, pasillo y puerta del aula). Nuestra solución sería una guía de llegada que los lleve de la entrada del edificio a la puerta del aula y que muestre el cierre antes de empezar a caminar.

Lo primero a construir sería esa guía de llegada y el aviso del cierre antes de empezar a caminar. Si una segunda prueba, con la indicación de piso más visible, muestra que los usuarios llegan solos sin dificultad dentro del edificio, el problema era de interfaz y no de necesidad, y volveríamos a perseverar con la ruta actual.

## Estado de los supuestos y validación pendiente

| # | Supuesto del TP1 | Estado | Evidencia |
| --- | --- | --- | --- |
| **1 (crítico)** | Los ingresantes y estudiantes de primer año tienen dificultades para encontrar aulas, dependencias y servicios durante sus primeras semanas. | **Sigue confirmado** | En el TP5, U3 volvió a perderse dentro del edificio y a preguntarle a una persona (T1, 18:06:15). |
| 2 | Una ruta dibujada resulta más útil para este grupo que consultar solamente un mapa estático del campus. | **Sostenido en parte** | Los tres siguieron la ruta dibujada hasta el edificio sin ayuda, pero no se comparó con un mapa estático, y dentro del edificio la ruta no alcanzó para 2 de 3. Es el supuesto que da origen al pivote. |
| 3 | La mayoría lleva un teléfono celular con acceso a Internet mientras se desplaza por el campus. | **Sigue confirmado** | Los tres usaron su celular propio (U1 con wifi del campus; U2 y U3 con datos móviles). U3 tuvo un corte de señal de unos 20 s y la ruta ya cargada siguió a la vista. |
| 4 | Los cierres temporales pueden volver incorrecta una ruta conocida y necesitan reflejarse en la aplicación. | **Sostenido en parte** | U1 vio el cierre y siguió el desvío; U2 y U3 llegaron hasta la cinta antes de advertirlo. El cierre tiene que verse antes de empezar a caminar. |
| 5 | Cuando llueve, los usuarios prefieren una ruta interior aunque sea más larga. | **Sin comprobar con lluvia real** | Con lluvia imaginada y simulada, U2 cambió su preferencia declarada en el TP2; U1 y U3 siguieron la recomendada sin considerar la otra. |

**Validación pendiente.** La prueba fue con tres usuarios, sin significancia estadística, y no incluyó a los otros dos del TP2. La lluvia fue imaginada por los usuarios y simulada en la aplicación, no real, y el cierre de T2 lo señalizó el equipo con una cinta. El umbral de 5 minutos depende de cuándo se empieza a contar. La nueva hipótesis todavía no se probó: falta una guía de llegada dentro del edificio y una prueba con usuarios que no conozcan el campus para ver si les alcanza.

# Brief de Producto — versión 6

**Qué cambió respecto de la versión 5 y por qué:** la versión 5 cerró el TP5 con una prueba de usuarios y la decisión de pivotar, pero describía el producto solo desde el uso: no decía cómo está construido ni qué tendría que cambiar para llegar a la visión completa del TP1. En el TP6 leímos el código del MVP, diagramamos su arquitectura real y la de la gran visión, y buscamos el componente que más probablemente falle al crecer. Esta versión agrega tres cosas: la arquitectura del MVP y de la visión, las restricciones técnicas del contexto, y el componente de mayor riesgo, que coincide con el problema que la prueba del TP5 ya había mostrado. No cambia el segmento, el problema ni la hipótesis de valor del pivote, y las versiones anteriores se mantienen como están. (El enunciado del TP6 la llama versión 5; nuestra numeración ya había llegado a la 5 en el TP5, por eso esta es la 6.)

## Arquitectura del MVP

El MVP es una aplicación web de una sola página (SPA) hecha con React, TypeScript y Vite, instalable como PWA (una web que se instala como app y puede funcionar sin conexión) y **sin backend**. La ruta se calcula en el teléfono con A\* sobre un grafo del campus que se descarga como JSON. Los datos del campus, los cierres y el clima simulado son archivos estáticos publicados en Cloudflare Workers con cada deploy, y lo único que se guarda es en el dispositivo. Dos decisiones estructurales las tomó la herramienta o nadie, y no el equipo: no tener backend y concentrar la composición de la aplicación en `App.tsx`. Está construido el motor de rutas, la interfaz y la exclusión de tramos cerrados; está simulado el clima y la carga de cierres es manual, como se definió en el TP3. El detalle y el diagrama están en el [informe del TP6](entregas/TP6-Summate.pdf).

## La gran visión en términos de arquitectura

El producto completo del TP1 pide dos clientes (el Navegante, que ya existe, y un panel de administración), un backend con autenticación, una base de datos persistente y una API meteorológica real. El MVP cubre la función 1 completa (mapa y ruta más corta) y las funciones 4 y 5 en versión manual o simulada; las funciones 2 y 3 (horarios de atención y servicio más cercano) no existen todavía.

**El salto arquitectónico más grande** es pasar de archivos publicados a mano a un backend con base persistente donde un administrador cargue los datos, sin perder que la ruta se calcule en el dispositivo y siga a la vista con señal irregular. Las tecnologías nuevas que agregaría la visión son:

- **Cloudflare Workers + D1 (SQLite)** para cierres con vigencia, horarios y administradores, elegidas por continuidad con lo ya desplegado.
- **Una API meteorológica real** (por ejemplo Open-Meteo) en lugar del clima simulado.
- **Sincronización de cierres** entre el servidor y la PWA mediante versiones del dato (ETag de HTTP), sin depender de la sincronización en segundo plano.

## Restricciones técnicas del contexto

- **Señal irregular.** Los cinco encuestados del TP2 declararon datos móviles de señal irregular. Por eso la ruta se calcula en el teléfono y la app tiene que seguir funcionando con los últimos datos descargados cuando se corta la conexión; en la prueba del TP5, U3 perdió la señal unos 20 segundos y la ruta ya cargada siguió a la vista.
- **Dispositivos mixtos.** En la prueba hubo un iPhone y dos Android, así que ninguna función puede depender de capacidades que no estén en todos los navegadores.
- **Sin ubicación ni sensores propios.** El TP1 fijó que el clima se obtiene de un servicio externo, sin GPS del usuario ni sensores propios.
- **Plano propio del campus.** El mapa y el grafo se generan a partir de un plano SVG que mantiene el equipo; no hay una fuente institucional de datos.
- **Infraestructura de la UNLaM sin relevar.** Ningún TP preguntó por sistemas institucionales, políticas de acceso a datos ni quién mantendría el producto. Lo tratamos como un supuesto a validar antes de pensar en una versión con administradores.
- **Un solo mantenedor por ahora.** Los cierres los carga el equipo editando un archivo y publicando; con la visión tendría que hacerlo alguien que no toca el código.

## El componente más riesgoso

Es el **subsistema de cierres**. En la prueba del TP5, dos de tres usuarios no percibieron el cierre hasta llegar a la cinta, aunque el desvío estaba calculado en pantalla. Con la visión pasa a ser el dato que más cambia y el que más daña si está desactualizado, y hoy depende de un archivo editado a mano, un deploy y una copia guardada que con señal irregular puede estar vieja. Esto refuerza el pivote del TP5: antes de construir el backend, el aviso del cierre tiene que verse antes de empezar a caminar.

## Lo que no cambia

La hipótesis de valor del pivote del TP5 (llegar a la puerta del aula, no solo al edificio) sigue siendo la que hay que probar, y esta versión no agrega evidencia nueva sobre ella. El estado de los supuestos de la versión 5 se mantiene.
