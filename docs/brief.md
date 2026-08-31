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

| # | Supuesto | Cómo se comprobaría |
| --- | --- | --- |
| **1 (crítico)** | Los ingresantes y estudiantes de primer año tienen dificultades para encontrar aulas, dependencias y servicios durante sus primeras semanas en la UNLaM. | Entrevistas a U1, U2 y U3 y una prueba de recorrido en la que relaten o evidencien desorientación, demoras, pedidos de indicaciones o recorridos equivocados. |
| 2 | Una ruta dibujada resulta más útil para este grupo que consultar solamente un mapa estático del campus. | Ofrecer ambas alternativas en una prueba y registrar cuál es más usada. |
| 3 | La mayoría de los usuarios del segmento lleva un teléfono celular con acceso a Internet mientras se desplaza por el campus. | Preguntar a U1, U2 y U3 qué dispositivo usan habitualmente y verificar en los recorridos de prueba que puedan abrir la aplicación web y consultar una ruta en el momento. |
| 4 | Los cierres temporales de pasillos o accesos pueden volver incorrecta una ruta conocida y necesitan reflejarse en la aplicación. | Relevar cierres o desvíos ocurridos en el campus y consultar a usuarios y personal si esas situaciones generan recorridos fallidos o pedidos de indicaciones. |
| 5 | Cuando llueve, los usuarios prefieren una ruta interior aunque sea más larga que el recorrido exterior más corto. | Presentar a U1, U2 y U3 ambos recorridos en un escenario de lluvia y registrar su elección y el motivo; luego contrastar el comportamiento en una prueba realizada con lluvia real. |

El **supuesto 1 es el crítico**: si no se verifica, el problema que da origen al producto no existe con la relevancia que le atribuimos y toda la propuesta pierde sentido. Por eso es el primero que se pone a prueba en el relevamiento.

# Brief de Producto — versión 2

**Qué cambió respecto de la versión 1 y por qué:** en la primera versión habíamos armado el perfil del Navegante a partir de lo que nosotros suponíamos. Para esta versión usamos las respuestas de una encuesta hecha a cinco ingresantes y estudiantes de primer año de la UNLaM. Con esos resultados pudimos describir mejor al usuario, saber en qué momentos tiene problemas para ubicarse y revisar los supuestos del TP1. El problema principal se mantiene porque cuatro de las cinco personas encuestadas tuvieron dificultades para encontrar aulas o sectores. También encontramos dos cuestiones que no habíamos tenido en cuenta: la señal de Internet dentro del campus es irregular y no todos eligen el mismo tipo de camino cuando llueve.

## Perfil del usuario real

El usuario principal sigue siendo un ingresante o estudiante de primer año que todavía no conoce bien el campus. La diferencia es que ahora el perfil está basado en las respuestas de U1 a U5, disponibles en la [encuesta](evidencia/tp2/Encuesta%20sobre%20orientación%20en%20el%20campus%20%E2%80%94%20UNLaM(1-5).xlsx) y en el [resumen de resultados](evidencia/tp2/Resultados_Forms.pdf).

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

| # | Supuesto del TP1 | Estado | Evidencia |
| --- | --- | --- | --- |
| **1 (crítico)** | Los ingresantes y estudiantes de primer año tienen dificultades para encontrar aulas, dependencias y servicios durante sus primeras semanas en la UNLaM. | **Confirmado** | A U1, U2, U3 y U4 les pasó entre dos y seis veces. La última vez perdieron entre cinco y diez minutos y todos habían llegado tarde al menos una vez. A U5 no le había pasado. |
| 2 | Una ruta dibujada resulta más útil para este grupo que consultar solamente un mapa estático del campus. | **No se pudo comprobar** | Tres usuarios habían usado el mapa institucional y uno lo conocía, pero en la encuesta no comparamos el mapa con una ruta dibujada. Por eso todavía no podemos confirmar ni descartar este supuesto. |
| 3 | La mayoría lleva un teléfono celular con acceso a Internet mientras se desplaza por el campus. | **Confirmado** | Los cinco llevan siempre el celular y tienen datos móviles. Los cinco también dijeron que la señal es irregular. |
| 4 | Los cierres temporales de pasillos o accesos pueden volver incorrecta una ruta conocida y necesitan reflejarse en la aplicación. | **Confirmado** | Cuatro de cinco encontraron sectores cerrados varias veces. Uno tardó bastante en encontrar otro camino y otro tuvo que preguntar. Todavía falta probar con el prototipo si mostrar esos cierres resuelve el problema. |
| 5 | Cuando llueve, los usuarios prefieren una ruta interior aunque sea más larga que el recorrido exterior más corto. | **Confirmado** | Tres de cinco prefieren desviarse aunque tarden un poco más. Los otros dos eligen el camino más rápido, así que la preferencia existe pero no es igual para todos. Además, la respuesta no se comprobó en una situación de lluvia real. |

Con los resultados de la encuesta no se cayó ninguno de los supuestos del TP1. El supuesto 2 quedó pendiente porque no hicimos la comparación necesaria para comprobarlo. Tampoco agregamos supuestos nuevos: la señal irregular y las distintas preferencias cuando llueve son hallazgos del relevamiento.
