## Purpose

Mostrar el plano del campus a pantalla completa en el celular, navegable con gestos táctiles, junto con la estructura de pantalla que lo acompaña: hoja inferior, panel lateral en escritorio y cierre de capas con el botón Atrás.

## ADDED Requirements

### Requirement: Mapa a pantalla completa
El sistema SHALL mostrar el plano del campus ocupando toda la pantalla desde que se abre la app. Los controles flotan encima y respetan las áreas seguras del dispositivo. El mapa SHALL seguir visible detrás de la tarjeta superior y de la hoja inferior en todas las vistas.

#### Scenario: Apertura en un celular
- **WHEN** el usuario abre la app en un celular de 390 × 844 px
- **THEN** el plano ocupa todo el ancho y el alto de la pantalla
- **AND** la tarjeta de búsqueda, los botones flotantes y la hoja inferior quedan encima del plano

#### Scenario: Celular con muesca y barra de inicio
- **WHEN** el usuario abre la app en un iPhone con muesca y barra de inicio
- **THEN** ningún control queda debajo de la muesca ni de la barra de inicio

#### Scenario: El mapa no se reemplaza al cambiar de vista
- **WHEN** el usuario pasa del inicio a la ficha de un lugar y después al panel "Cómo llegar"
- **THEN** el plano sigue visible y conserva su posición salvo que la vista lo mueva para mostrar el lugar

### Requirement: Navegación del mapa con gestos táctiles
El sistema SHALL permitir acercar y alejar el plano pellizcando, acercarlo con doble toque y desplazarlo arrastrando con un dedo, con inercia al soltar. El plano MUST NOT rotar. En escritorio SHALL responder a la rueda del mouse y al teclado.

#### Scenario: Pellizcar para acercar
- **WHEN** el usuario separa dos dedos sobre el plano
- **THEN** el plano se acerca alrededor del punto entre los dedos

#### Scenario: Doble toque
- **WHEN** el usuario toca dos veces seguidas un punto del plano
- **THEN** el plano se acerca un nivel centrado en ese punto

#### Scenario: Arrastre con inercia
- **WHEN** el usuario arrastra el plano con un dedo y lo suelta en movimiento
- **THEN** el plano sigue desplazándose y se frena de a poco

#### Scenario: Teclado en escritorio
- **WHEN** el foco está en el mapa en escritorio y el usuario presiona `+` o una flecha
- **THEN** el plano se acerca o se desplaza en esa dirección

### Requirement: Límites del campus
El sistema SHALL impedir desplazar el plano más allá de los bordes del campus. El usuario MUST NOT poder alejar el plano más allá del nivel en que el campus entero entra en la pantalla, ni acercarlo más allá del nivel máximo de detalle.

#### Scenario: Arrastrar fuera del campus
- **WHEN** el usuario arrastra el plano hacia un costado más allá del borde del campus
- **THEN** el plano se detiene en el borde y el campus no sale de la pantalla

#### Scenario: Alejar al máximo
- **WHEN** el usuario sigue pellizcando para alejar
- **THEN** el plano deja de alejarse cuando el campus entero entra en la pantalla

### Requirement: Encuadre inicial del campus
Al abrir la app, el sistema SHALL encuadrar la zona de edificios del campus, dejando las canchas fuera del encuadre, dentro de la franja visible entre la tarjeta superior y la hoja inferior.

#### Scenario: Encuadre al abrir
- **WHEN** el usuario abre la app en un celular de 390 × 844 px
- **THEN** se ven todos los edificios con aulas, desde Odontología hasta el Teatro
- **AND** ningún edificio queda tapado por la tarjeta superior ni por la hoja colapsada

### Requirement: Botón para recentrar
El sistema SHALL mostrar un botón circular para recentrar que devuelve el plano al encuadre de la vista activa: el campus en el inicio, el lugar en la ficha y la ruta cuando la hay.

#### Scenario: Recentrar en el inicio
- **WHEN** el usuario movió el plano lejos del encuadre inicial y toca el botón para recentrar
- **THEN** el plano vuelve al encuadre inicial del campus

#### Scenario: Recentrar en la ficha de un lugar
- **WHEN** el usuario está en la ficha del Aula 121, movió el plano y toca el botón para recentrar
- **THEN** el plano vuelve a mostrar el Aula 121 en la franja visible

### Requirement: Marcar el lugar seleccionado
Cuando se abre la ficha de un lugar, el sistema SHALL marcarlo en el plano con un pin rojo sobre su puerta y SHALL mover el plano para que el pin quede visible entre la tarjeta superior y la hoja inferior.

#### Scenario: Lugar fuera de la vista
- **WHEN** el usuario abre la ficha de un lugar que está fuera de la parte visible del plano
- **THEN** el plano se desplaza hasta que el pin rojo queda visible por encima de la hoja

#### Scenario: Cerrar la ficha
- **WHEN** el usuario cierra la ficha y vuelve al inicio
- **THEN** el pin rojo desaparece del plano

### Requirement: Carga rápida del mapa
El sistema SHALL mostrar el plano utilizable en menos de 3 segundos en un celular de gama media con una conexión 4G lenta. Mientras se carga el detalle, SHALL mostrar un fondo neutro en lugar de una pantalla en blanco o con errores.

#### Scenario: Primera carga con 4G lenta
- **WHEN** se abre la app en un celular de gama media emulado con 4G lenta
- **THEN** el plano se puede mover y acercar en menos de 3 segundos

#### Scenario: Detalle que tarda en llegar
- **WHEN** el usuario acerca el plano y el detalle de esa zona todavía no llegó
- **THEN** se ve el fondo neutro o el nivel anterior agrandado hasta que llega el detalle

### Requirement: Hoja inferior de tres alturas
En el celular, el sistema SHALL mostrar el contenido de cada vista en una hoja inferior con tres alturas: colapsada, media y expandida. La hoja SHALL poder arrastrarse desde su manija y anclarse a la altura más cercana al soltar. La manija SHALL poder usarse con teclado y lector de pantalla.

#### Scenario: Arrastrar y soltar
- **WHEN** el usuario arrastra la manija desde la altura colapsada hasta un poco más arriba de la mitad del camino a la media y suelta
- **THEN** la hoja se ancla en la altura media

#### Scenario: Deslizamiento rápido
- **WHEN** el usuario desliza la manija rápido hacia arriba desde la altura media
- **THEN** la hoja se ancla en la altura expandida aunque el dedo haya recorrido poco

#### Scenario: Lista larga en la altura expandida
- **WHEN** la hoja está expandida, su lista está scrolleada hasta arriba y el usuario arrastra hacia abajo
- **THEN** la hoja baja a la altura media en lugar de scrollear la lista

#### Scenario: Manija con teclado
- **WHEN** el foco está en la manija y el usuario presiona `Enter`
- **THEN** la hoja pasa a la altura siguiente y el lector de pantalla anuncia la nueva altura

### Requirement: Panel lateral en escritorio
En pantallas de 1024 px de ancho o más, el sistema SHALL mostrar el contenido de la hoja inferior en un panel lateral izquierdo de alto completo, con el plano ocupando el resto de la pantalla.

#### Scenario: Pantalla de escritorio
- **WHEN** el usuario abre la app en una ventana de 1280 × 800 px
- **THEN** la búsqueda y el contenido de cada vista aparecen en un panel a la izquierda
- **AND** el plano ocupa el resto de la ventana y muestra controles para acercar y alejar

#### Scenario: Ventana angosta
- **WHEN** el usuario achica la ventana a menos de 1024 px de ancho
- **THEN** el panel lateral pasa a ser la hoja inferior

### Requirement: El botón Atrás cierra la última capa
El sistema SHALL cerrar la última capa abierta (búsqueda, ficha, panel "Cómo llegar" o ayuda) cuando el usuario usa el botón Atrás del navegador o de Android, o el gesto de volver de iOS, igual que con el botón de volver de la interfaz. Desde el inicio, Atrás SHALL dejar que el navegador salga de la app.

#### Scenario: Atrás con la búsqueda abierta
- **WHEN** el usuario abrió la búsqueda desde el inicio y presiona el botón Atrás de Android
- **THEN** la búsqueda se cierra y se ve el inicio con el mapa

#### Scenario: Atrás desde la ficha
- **WHEN** el usuario buscó "121", abrió la ficha del Aula 121 y presiona Atrás
- **THEN** vuelve a la lista de resultados con "121" todavía escrito

#### Scenario: Atrás con la ruta pedida
- **WHEN** el usuario llegó al panel "Cómo llegar" desde la ficha del Aula 121, la ruta ya se pidió y presiona Atrás
- **THEN** vuelve a la ficha del Aula 121 sin que se pida otra ruta

#### Scenario: Enlace directo a un lugar
- **WHEN** el usuario abre un enlace a la ficha del Aula 121 y presiona Atrás
- **THEN** ve el inicio de la app en lugar de salir de ella
