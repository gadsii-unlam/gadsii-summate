# TP5 — Construcción del MVP, prueba y aprendizaje

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
