# CLAUDE.md

Guía para trabajar en este repositorio. Aplica a **todos los TPs del cuatrimestre**.

## Contexto

- **Materia:** Gestión Aplicada al Desarrollo de Software II (3665) — Ingeniería Informática, UNLaM. Cuatrimestre: 2º de 2026.
- **Equipo:** Summate — Agasi Alejo, Huergo Estefanía, Naspleda Julián, Panigazzi Agustín, Rios Cristian.
- **Producto:** _¿Dónde queda?_, aplicación web que calcula y muestra la ruta más corta entre dos puntos del campus de la UNLaM.
- **Segmento:** ingresantes y estudiantes de primer año que todavía no conocen bien la distribución del campus.
- **Repositorio:** `gadsii-summate`, dentro de la organización de la cátedra en GitHub. La nomenclatura `gadsii-[nombreequipo]` es obligatoria.

## Estructura del repositorio

```
docs/
  brief.md            Brief de Producto — documento vivo, se actualiza en cada TP
  prompts.md          Registro obligatorio del trabajo con IA
  entregas/           PDFs entregados (TP1-Summate.pdf, TP2-Summate.pdf, ...)
  arquitectura/       TP6 — restricciones y decisiones técnicas
  configuracion/      TP7 — gestión de configuración
  diseno/wireframe/   TP3 — diseño y wireframes
  evaluacion/         TP4/TP5 — evaluación y pruebas con usuarios
  evidencia/          Evidencia de relevamiento y pruebas
src/                  Código del MVP (TP5 en adelante)
```

Mantener esta estructura. Si un TP pide un archivo con ruta explícita (por ejemplo `docs/brief.md`), va exactamente en esa ruta: la cátedra la busca ahí.

## Reglas de la cátedra que aplican a todos los TPs

### 1. El brief es un documento vivo

`docs/brief.md` nace en el TP1 y se actualiza en cada TP siguiente. Cada versión:

- se commitea (una versión = un commit identificable), y
- **abre con un párrafo que declara qué cambió respecto de la anterior y por qué.**

Nunca reescribir el brief sin ese párrafo de cambios. No borrar el historial de versiones anteriores: el valor del documento está en poder leer su evolución.

### 2. Todo intercambio con IA se registra en `docs/prompts.md`

Es obligatorio y se audita en el TP7; además alimenta la retrospectiva del TPI. Cada entrada anota **fecha**, **herramienta y versión utilizadas**, resumen del prompt y TP al que corresponde. Formato de la tabla ya existente:

```
| Fecha | Herramienta y versión | Prompt (resumen) | TP |
```

Al terminar una tarea hecha con IA en este repo, agregar la entrada correspondiente antes de commitear.

### 3. El README se mantiene actualizado

`README.md` lleva nombre del equipo, integrantes y una línea sobre el producto, y se actualiza durante todo el cuatrimestre a medida que el producto se define mejor.

### 4. Formato de entrega

Salvo que un enunciado indique otra cosa:

- **Formato:** PDF, con el **enlace al repositorio en la primera página**.
- **Nombre de archivo:** `TPn-Summate.pdf` (patrón de la cátedra: `TPn-[NombreGrupo].pdf`).
- **Extensión orientativa:** El foco está en la precisión, no en la extensión.
- Los PDFs entregados se guardan en `docs/entregas/`.

### 5. Herramienta de agente de código para el MVP

Registrar en `docs/prompts.md` cuál herramienta con capacidad de agente de código se usó en cada caso.

## Convenciones de trabajo en este repo

- **Idioma:** todo el contenido (documentos, commits, comentarios de código, nombres de secciones) en español rioplatense. Los identificadores de código pueden ir en inglés si es lo habitual del stack.
