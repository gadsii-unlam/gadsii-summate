## Purpose

Ayudar a un ingresante a entender la app en el primer uso con indicaciones breves en el lugar donde las necesita, sin tutoriales extensos, y permitirle volver a consultarlas cuando quiera.

## ADDED Requirements

### Requirement: Indicación de primer uso
Mientras el usuario no tenga destinos recientes y no la haya cerrado, el sistema SHALL mostrar en el inicio una indicación breve que explique cómo empezar: buscar el destino por número o nombre y después elegir desde dónde sale. La indicación SHALL poder cerrarse con un toque y MUST NOT tapar la barra de búsqueda.

#### Scenario: Primera apertura
- **WHEN** el usuario abre la app por primera vez en su celular
- **THEN** la hoja inferior muestra la indicación con un ejemplo de búsqueda, como "121" o "Biblioteca", y un botón "Entendido"
- **AND** la barra "¿A dónde vas?" sigue visible y se puede tocar

#### Scenario: Cerrar la indicación
- **WHEN** el usuario toca "Entendido" y vuelve a abrir la app más tarde
- **THEN** la indicación de primer uso no aparece

#### Scenario: Usuario con recientes
- **WHEN** el usuario ya tiene al menos un destino reciente
- **THEN** el inicio muestra los recientes en lugar de la indicación de primer uso

### Requirement: Ayuda breve junto a los controles
El sistema SHALL mostrar textos de ayuda de una línea junto a los controles que lo necesitan: un ejemplo de qué escribir en la búsqueda vacía, la aclaración de cómo elegir el origen cuando está vacío y una explicación de "Sin acceso ahora" a un toque.

#### Scenario: Búsqueda vacía
- **WHEN** el usuario abre la búsqueda y no escribió nada
- **THEN** ve un ejemplo como "Por ejemplo: 121, Biblioteca, Lab. de Física"

#### Scenario: Origen vacío
- **WHEN** el campo de origen del panel "Cómo llegar" está vacío
- **THEN** debajo se lee que la app no usa la ubicación y que hay que elegir una entrada, una referencia o el aula de la que se sale

#### Scenario: Explicación de "Sin acceso ahora"
- **WHEN** el usuario toca el ícono de información junto a "Sin acceso ahora" en una ficha
- **THEN** ve un texto breve que explica que por ahora sus accesos están cerrados

### Requirement: Volver a abrir la ayuda
El sistema SHALL mostrar un botón de ayuda siempre visible en el inicio, en la ficha y en el panel "Cómo llegar". Al tocarlo SHALL abrir una ayuda breve con los pasos para obtener una ruta. La ayuda SHALL cerrarse con su botón de cerrar o con Atrás, sin cambiar el origen, el destino ni la ruta.

#### Scenario: Abrir la ayuda después de cerrar la indicación
- **WHEN** el usuario cerró la indicación de primer uso y toca el botón de ayuda
- **THEN** ve los tres pasos: buscar el destino, elegir desde dónde sale y seguir la línea azul

#### Scenario: Cerrar la ayuda con Atrás
- **WHEN** el usuario está en el panel "Cómo llegar" con origen y destino elegidos, abre la ayuda y presiona Atrás
- **THEN** la ayuda se cierra y el panel conserva el mismo origen y destino

### Requirement: Leyenda de símbolos del mapa
La ayuda SHALL explicar con su dibujo y un texto cada símbolo que la app muestra sobre el mapa: el círculo del origen, el pin del destino, la línea de la ruta y los símbolos de tramos especiales que la app use. También SHALL aclarar que la app no usa la ubicación del usuario.

#### Scenario: Consultar la leyenda
- **WHEN** el usuario abre la ayuda
- **THEN** ve el círculo de origen, el pin de destino y la línea de la ruta, cada uno con su explicación
- **AND** lee que la app no usa su ubicación
