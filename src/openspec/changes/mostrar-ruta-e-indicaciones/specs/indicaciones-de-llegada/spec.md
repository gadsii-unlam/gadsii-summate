## Purpose

Convertir la ruta calculada en una lista de pasos que un ingresante pueda seguir caminando hasta el aula o sector: salir del lugar, seguir, doblar, salir y entrar de los edificios, llegar y, si hace falta, subir de piso.

## ADDED Requirements

### Requirement: Lista paso a paso de la ruta elegida

El sistema SHALL generar en el dispositivo, a partir de la ruta elegida, una lista ordenada de pasos con el texto de cada maniobra y la distancia hasta la siguiente, y SHALL regenerarla cuando el usuario cambia de alternativa.

#### Scenario: Lista de la ruta más corta

- **WHEN** el usuario abre las indicaciones de la ruta más corta de Dir. de Alumnos a Dto. de Salud
- **THEN** ve 11 pasos, del "Salí de Dir. de Alumnos y doblá a la izquierda" al "Doblá a la izquierda: llegaste a Dto. de Salud"

#### Scenario: Cambio de alternativa

- **WHEN** el usuario cambia a la ruta "Más resguardada" de Dir. de Alumnos a Dto. de Salud y abre las indicaciones
- **THEN** ve los pasos de la ruta resguardada, que entra a Artes y Medios por la entrada oeste

#### Scenario: Sin conexión

- **WHEN** el dispositivo está sin conexión y el usuario abre las indicaciones de una ruta ya mostrada
- **THEN** la lista aparece completa

### Requirement: Salida del lugar de origen

Cuando el origen es una puerta, el primer paso SHALL nombrar el lugar de origen con su nombre visible e indicar hacia qué lado doblar al salir, tomando como frente la dirección en que se sale por la puerta.

#### Scenario: Salir de una oficina

- **WHEN** la ruta empieza en `puerta-economicas-dir-de-alumnos`, sale hacia el sur y el pasillo sigue hacia el este
- **THEN** el primer paso dice "Salí de Dir. de Alumnos y doblá a la izquierda"

#### Scenario: Puerta que da a la vereda

- **WHEN** la ruta empieza en `puerta-servicios-biblioteca`, que da directo al exterior
- **THEN** el primer paso dice "Salí de Biblioteca a la vereda"

### Requirement: Inicio desde una entrada al campus

Cuando el origen es una entrada al campus, el primer paso SHALL indicar seguir la línea de la ruta desde esa entrada con la distancia del primer tramo, y el mapa SHALL marcar el sentido de marcha sobre ese tramo.

#### Scenario: Desde la entrada principal

- **WHEN** la ruta empieza en `entrada-central-principal` y el primer tramo recto mide 40 m
- **THEN** el primer paso dice "Desde Entrada principal, seguí la línea azul 40 m"
- **AND** el primer tramo de la línea muestra una flecha con el sentido de marcha

### Requirement: Un paso por tramo recto

El sistema SHALL agrupar en un solo paso los tramos consecutivos que siguen la misma dirección, y SHALL ignorar como giro cualquier desvío de menos de 3 m entre dos tramos de la misma dirección.

#### Scenario: Pasillo recto con varios puntos

- **WHEN** la ruta recorre `pasillo-economicas-41`, `-42`, `-43` y `-44` en línea recta hacia el este
- **THEN** la lista tiene un solo paso para ese pasillo, con 30 m

#### Scenario: Desvío mínimo absorbido

- **WHEN** la ruta va hacia el este por `pasillo-central-22`, se desvía 1,5 m hacia el norte hasta `pasillo-central-17` y sigue hacia el este
- **THEN** la lista no tiene ningún paso "Doblá" en `pasillo-central-22` ni en `pasillo-central-17`

### Requirement: Giros a la izquierda y a la derecha

Cuando la ruta cambia de dirección, el sistema SHALL indicar "Doblá a la izquierda" o "Doblá a la derecha" según el sentido de marcha de quien camina, sin usar puntos cardinales.

#### Scenario: De este a norte

- **WHEN** la ruta va hacia el este y en `pasillo-central-33` sigue hacia el norte
- **THEN** el paso dice "Doblá a la izquierda"

#### Scenario: De norte a este

- **WHEN** la ruta va hacia el norte y en `pasillo-central-31` sigue hacia el este
- **THEN** el paso dice "Doblá a la derecha"

### Requirement: Giros muy seguidos

Cuando entre dos giros hay menos de 4 m, el sistema SHALL combinarlos en un solo paso con la forma "Doblá a la izquierda y enseguida a la derecha".

#### Scenario: Esquiva corta

- **WHEN** la ruta dobla a la izquierda, avanza 3 m y dobla a la derecha
- **THEN** la lista muestra un único paso "Doblá a la izquierda y enseguida a la derecha"

### Requirement: Salida y entrada de edificios

Cuando la ruta pasa de bajo techo al aire libre, el sistema SHALL agregar un paso que diga de qué edificio se sale; cuando pasa del aire libre a bajo techo, un paso que diga a qué edificio se entra. Los edificios SHALL nombrarse con su nombre visible del catálogo.

#### Scenario: Entrar a Salud

- **WHEN** la ruta llega por la vereda a `entrada-salud-01` y sigue dentro de Salud
- **THEN** la lista tiene el paso "Entrá a Salud por la entrada oeste"

#### Scenario: Salir de Económicas por un pasillo sin entrada marcada

- **WHEN** la ruta sale al aire libre desde `pasillo-economicas-44`
- **THEN** la lista tiene el paso "Seguí derecho y salí de Económicas al aire libre"

### Requirement: Nombre de la entrada solo si está cargado

El sistema SHALL nombrar la entrada por la que se sale o se entra solo con el nombre cargado a mano por el equipo, y MUST omitir la mención de la entrada cuando no tiene nombre cargado.

#### Scenario: Entrada sin nombre cargado

- **WHEN** la ruta entra a Derecho por `entrada-derecho-02` y esa entrada no tiene nombre cargado
- **THEN** el paso dice "Entrá a Derecho", sin nombrar la entrada

#### Scenario: Entrada con nombre cargado

- **WHEN** el equipo cargó "entrada oeste" para `entrada-artes-y-medios-02` y la ruta entra por ahí
- **THEN** el paso dice "Entrá a Artes y Medios por la entrada oeste"

### Requirement: Cambio de edificio bajo techo

Cuando la ruta pasa de un edificio a otro sin salir al aire libre, el sistema SHALL mencionar el edificio al que se llega dentro del paso en curso.

#### Scenario: De Artes y Medios a Salud

- **WHEN** la ruta dobla en `pasillo-artes-y-medios-16` y sigue por el pasillo hasta `pasillo-salud-01`
- **THEN** el paso dice "Doblá a la derecha y seguí por el pasillo hasta Salud"

### Requirement: Pasos al aire libre marcados

Cada paso cuyo tramo va al aire libre SHALL mostrarse con el rótulo "Al aire libre", también en el texto que leen los lectores de pantalla.

#### Scenario: Tramos por la vereda

- **WHEN** el usuario abre las indicaciones de la ruta más corta de Dir. de Alumnos a Dto. de Salud
- **THEN** los pasos 2 a 6 muestran "Al aire libre"
- **AND** los pasos dentro de Económicas y de Salud no lo muestran

### Requirement: Distancias redondeadas a 5 metros

Cada paso SHALL mostrar la distancia hasta la siguiente maniobra redondeada al múltiplo de 5 m más cercano, con las mitades hacia arriba y un mínimo de 5 m. El paso de llegada no muestra distancia.

#### Scenario: Redondeo hacia abajo

- **WHEN** un tramo mide 31,4 m
- **THEN** el paso muestra "30 m"

#### Scenario: Redondeo hacia arriba y mínimo

- **WHEN** un tramo mide 12,6 m y otro 2,9 m
- **THEN** los pasos muestran "15 m" y "5 m"

### Requirement: Llegada al destino

El último paso SHALL indicar la llegada con el nombre visible del lugar destino y el lado en que queda la puerta respecto del sentido de marcha, o "Seguí derecho" si la puerta queda al frente.

#### Scenario: Puerta a la izquierda

- **WHEN** la ruta llega a `pasillo-salud-19` hacia el norte y la puerta de Dto. de Salud queda hacia el oeste
- **THEN** el último paso dice "Doblá a la izquierda: llegaste a Dto. de Salud"

#### Scenario: Puerta a la derecha

- **WHEN** la ruta llega a `pasillo-salud-19` hacia el sur y la puerta de Dto. de Salud queda hacia el oeste
- **THEN** el último paso dice "Doblá a la derecha: llegaste a Dto. de Salud"

### Requirement: Indicación de piso para otros pisos

Cuando el destino está en un piso distinto de la planta baja, el sistema SHALL agregar después de la llegada a planta baja un paso con el piso y la indicación de llegada cargada y verificada en el catálogo, y MUST NOT inventar escaleras ni recorridos que no estén cargados.

#### Scenario: Aula del primer piso con indicación verificada

- **WHEN** el destino es un aula del 1er piso de Humanidades con una indicación de llegada verificada en el catálogo
- **THEN** la lista termina en el acceso de planta baja cargado para esa aula
- **AND** agrega un último paso con "1er piso" y el texto de la indicación tal como está cargado

#### Scenario: Destino en planta baja

- **WHEN** el destino es el Aula 121 de Humanidades, en planta baja
- **THEN** la lista no tiene ningún paso de piso

### Requirement: Tocar un paso encuadra su tramo

Al tocar un paso, el sistema SHALL encuadrar en el mapa el tramo de ese paso, desde su maniobra hasta la siguiente, resaltarlo sobre la ruta y marcar el paso como actual en la lista.

#### Scenario: Ver un giro en el mapa

- **WHEN** el usuario toca el paso "Entrá a Salud por la entrada oeste"
- **THEN** el mapa encuadra el tramo que empieza en `entrada-salud-01`, visible por encima de la hoja inferior
- **AND** ese tramo se ve resaltado y el paso queda marcado en la lista

#### Scenario: Paso de llegada

- **WHEN** el usuario toca el paso de llegada
- **THEN** el mapa encuadra la puerta del destino con el pin rojo
