## Purpose

Permitir encontrar un aula, un sector o un servicio del campus escribiendo poco y sin conocer el nombre exacto, y ver su ficha con el edificio y el acceso a "Cómo llegar".

## ADDED Requirements

### Requirement: Barra de búsqueda flotante
El sistema SHALL mostrar en el inicio una barra de búsqueda flotante arriba del mapa con el texto "¿A dónde vas?". Al tocarla, SHALL abrir la búsqueda a pantalla completa con el campo de texto enfocado y el teclado abierto.

#### Scenario: Abrir la búsqueda
- **WHEN** el usuario toca "¿A dónde vas?" en el inicio
- **THEN** se abre la búsqueda a pantalla completa con el cursor en el campo de texto

#### Scenario: Búsqueda vacía
- **WHEN** el usuario abre la búsqueda y todavía no escribió nada
- **THEN** ve sus destinos recientes, si los tiene, y debajo los lugares de referencia del campus

### Requirement: Búsqueda sin tildes ni mayúsculas
El sistema SHALL encontrar lugares sin importar tildes, mayúsculas ni signos de puntuación, tanto en lo que escribe el usuario como en los nombres de los lugares.

#### Scenario: Sin tildes
- **WHEN** el usuario escribe "microscopia"
- **THEN** aparece "Lab. de Microscopía" entre los resultados

#### Scenario: Con mayúsculas y tildes de más
- **WHEN** el usuario escribe "BIBLIOTÉCA"
- **THEN** aparece "Biblioteca" entre los resultados

#### Scenario: Palabras incompletas
- **WHEN** el usuario escribe "lab fis"
- **THEN** aparece "Lab. de Física" entre los resultados

### Requirement: Búsqueda por número de aula
El sistema SHALL encontrar un aula por su número, escrito solo o precedido de la palabra "aula", y SHALL mostrar primero el aula cuyo número es exactamente el escrito.

#### Scenario: Número exacto
- **WHEN** el usuario escribe "121"
- **THEN** el primer resultado es "Aula 121"

#### Scenario: Con la palabra aula
- **WHEN** el usuario escribe "aula 302"
- **THEN** el primer resultado es "Aula 302"

#### Scenario: Número incompleto
- **WHEN** el usuario escribe "12"
- **THEN** aparecen las aulas que empiezan con 12 ordenadas de menor a mayor número, con "Aula 120" antes que "Aula 121"

### Requirement: Búsqueda por alias y edificio
El sistema SHALL encontrar un lugar por cualquiera de sus alias y SHALL devolver los lugares de un edificio cuando el usuario escribe el nombre de ese edificio.

#### Scenario: Alias
- **WHEN** el usuario escribe un alias cargado para el Buffet del Centro de Estudiantes, como "cantina"
- **THEN** aparece "Buffet" entre los resultados

#### Scenario: Nombre de edificio
- **WHEN** el usuario escribe "humanidades"
- **THEN** aparecen lugares del edificio Humanidades, como "Aula 121"

### Requirement: Orden de los resultados
El sistema SHALL ordenar los resultados de forma predecible: primero la coincidencia exacta de número de aula; después los nombres que empiezan con lo escrito; después las coincidencias por palabras del nombre, por alias, por edificio y, por último, por parte del nombre. A igual nivel, el orden SHALL ser alfabético con los números en orden numérico.

#### Scenario: Nombre antes que edificio
- **WHEN** el usuario escribe "salud"
- **THEN** los lugares cuyo nombre empieza con "Salud" aparecen antes que los demás lugares del edificio Salud

#### Scenario: Orden numérico
- **WHEN** dos resultados del mismo nivel son "Aula 2" y "Aula 10"
- **THEN** "Aula 2" aparece antes que "Aula 10"

#### Scenario: Misma consulta, mismo orden
- **WHEN** el usuario escribe dos veces la misma consulta
- **THEN** los resultados aparecen las dos veces en el mismo orden

### Requirement: Resultados con edificio
Cada resultado SHALL mostrar el nombre visible del lugar, la parte que coincide con lo escrito resaltada, y en una segunda línea el edificio y la categoría. Cada fila SHALL medir al menos 44 px de alto para poder tocarla con el dedo.

#### Scenario: Fila de resultado
- **WHEN** el usuario escribe "121"
- **THEN** la fila del Aula 121 muestra "Aula 121" y debajo "Humanidades · Aula"

### Requirement: Estado "Sin acceso ahora" en los resultados
Cuando un lugar está marcado como sin acceso, su fila de resultado SHALL mostrar el texto "Sin acceso ahora" con un ícono, nunca un guion ni solo un color. El lugar SHALL seguir apareciendo en el mismo orden y SHALL poder abrirse.

#### Scenario: Lugar sin acceso
- **WHEN** todas las puertas de un lugar están cerradas y el usuario lo busca
- **THEN** su fila muestra "Sin acceso ahora" junto al nombre
- **AND** el lugar no se esconde ni pasa al final de la lista

#### Scenario: Lugar con acceso
- **WHEN** el usuario busca un lugar con al menos una puerta disponible
- **THEN** su fila no muestra ningún aviso de acceso

### Requirement: Destinos recientes
El sistema SHALL recordar en el dispositivo los últimos 8 lugares consultados como destino, del más nuevo al más viejo y sin repetidos, y SHALL mostrarlos en el inicio y en la búsqueda vacía. Si el dispositivo no permite guardar datos, la app MUST seguir funcionando sin recientes.

#### Scenario: Guardar un reciente
- **WHEN** el usuario abre la ficha del Aula 121 y vuelve al inicio
- **THEN** "Aula 121" aparece primero en los recientes

#### Scenario: Sin repetidos
- **WHEN** el usuario consulta el Aula 121, después la Biblioteca y otra vez el Aula 121
- **THEN** los recientes muestran "Aula 121" y "Biblioteca", en ese orden, una vez cada uno

#### Scenario: Almacenamiento bloqueado
- **WHEN** el navegador está en modo privado y no deja guardar datos
- **THEN** la búsqueda funciona igual y no aparece ningún error

#### Scenario: Lugar que ya no existe
- **WHEN** un reciente guardado corresponde a un lugar que ya no está en el catálogo
- **THEN** ese reciente no se muestra

### Requirement: Sin resultados
Cuando lo escrito no coincide con ningún lugar, el sistema SHALL decirlo con el texto buscado y SHALL sugerir cómo buscar (por número de aula o por nombre), mostrando los lugares de referencia.

#### Scenario: Búsqueda sin coincidencias
- **WHEN** el usuario escribe "zzz"
- **THEN** ve "No encontramos «zzz»" con una sugerencia de buscar por número de aula o por nombre
- **AND** debajo ve los lugares de referencia del campus

### Requirement: Atajos de referencias en el inicio
El sistema SHALL mostrar en el inicio, debajo de la barra de búsqueda, una fila de chips con lugares de referencia del campus (por ejemplo Biblioteca, Buffet, Teatro, Gimnasio y Entradas). Tocar un chip de lugar SHALL abrir su ficha, y tocar "Entradas" SHALL listar las entradas al campus.

#### Scenario: Chip de un lugar
- **WHEN** el usuario toca el chip "Biblioteca"
- **THEN** se abre la ficha de la Biblioteca

#### Scenario: Chip de entradas
- **WHEN** el usuario toca el chip "Entradas"
- **THEN** ve la lista de las entradas al campus, entre ellas la entrada principal

### Requirement: Ficha del lugar
Al elegir un lugar, el sistema SHALL mostrar su ficha en la hoja inferior con el nombre visible, el edificio, la categoría, el piso y un botón "Cómo llegar". Si el lugar no tiene acceso, la ficha SHALL mostrar "Sin acceso ahora".

#### Scenario: Elegir un resultado
- **WHEN** el usuario elige "Aula 121" en los resultados
- **THEN** la hoja muestra "Aula 121", "Humanidades" y el botón "Cómo llegar"
- **AND** el lector de pantalla anuncia el nombre del lugar

#### Scenario: Ficha de un lugar sin acceso
- **WHEN** el usuario abre la ficha de un lugar sin acceso
- **THEN** la ficha muestra "Sin acceso ahora" y mantiene el botón "Cómo llegar"

### Requirement: Mismo nombre en toda la interfaz
El sistema SHALL mostrar cada lugar con exactamente el mismo nombre visible y el mismo edificio en la fila del resultado, en la ficha, en la tarjeta superior, en los recientes y en los campos del panel "Cómo llegar".

#### Scenario: Del resultado al panel
- **WHEN** el usuario elige "Lab. de Microscopía" en los resultados y después toca "Cómo llegar"
- **THEN** la ficha, la tarjeta superior y el campo de destino muestran "Lab. de Microscopía", sin abreviaturas ni variantes

### Requirement: Cerrar la búsqueda sin perder lo cargado
El sistema SHALL permitir cerrar la búsqueda con el botón de volver o con Atrás sin cambiar el origen ni el destino ya elegidos.

#### Scenario: Cancelar la búsqueda del destino
- **WHEN** el usuario tiene el origen "Biblioteca" confirmado, abre la búsqueda de destino y la cierra sin elegir
- **THEN** el origen sigue siendo "Biblioteca" y no cambia ningún dato del panel
