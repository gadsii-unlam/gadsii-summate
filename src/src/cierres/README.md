# src/cierres: carga y aplicación de los cierres temporales (sin React).

Change `aplicar-cierres-temporales`. Todo se importa desde `src/cierres/index.ts`. Guía para el equipo: [`docs/cierres.md`](../../docs/cierres.md).

## Uso

```ts
import { cargarGrafoRuteable } from '../rutas/index.ts'
import {
  cargarCierres,
  crearControladorCierres,
  crearReloj,
  leerFechaSimulada,
  obtenerTramosExcluidos,
} from '../cierres/index.ts'

const grafo = await cargarGrafoRuteable()
const { cierres } = await cargarCierres(grafo) // /data/cierres.json o la copia incluida; nunca rechaza
const fecha = leerFechaSimulada() // ?ahora=… (sessionStorage) o null
const reloj = crearReloj(fecha)

// Solo los tramos excluidos (para pasarlos a calcularRuta con cualquier criterio):
const excluidos = obtenerTramosExcluidos(cierres, reloj())

// O todo junto: vigencia reevaluada en cada ruta y cada 60 s para el mapa y "Sin acceso ahora".
const control = crearControladorCierres({ grafo, cierres, lugares, reloj })
const r = control.calcularRuta({ origen, destino, criterio, nombreOrigen, nombreDestino })
// r.tipo === 'ruta' → r.desvio: { texto: 'Evitamos un tramo cerrado: …' } | null
// r.tipo === 'sin-ruta' → r.sinRuta: { titulo, texto, motivos, cierresMas, acciones, … }
control.estado() // { vigentes, excluidos, sinAcceso, capa }
```

## Módulos

- `validar.ts`: valida `cierres.json` contra el grafo (tolerante en la app, estricto en `scripts/validar-cierres.ts`).
- `fechas.ts`, `vigencia.ts`: ISO 8601 (sin zona = hora local), `desde ≤ ahora < hasta`.
- `carga.ts`: `fetch` con timeout de 5 s y respaldo en la copia incluida en el bundle.
- `fecha-simulada.ts`: `?ahora=` persistido en `sessionStorage`.
- `accesibilidad.ts`: "Sin acceso ahora" (BFS desde las cuatro entradas al campus).
- `rutas.ts`: ruta con exclusiones, aviso de desvío y motivo de "Sin ruta disponible".
- `capa.ts`: segmentos e íconos de los tramos cerrados para el mapa.
- `controlador.ts`: reevaluación periódica y suscripción para la interfaz.

Los componentes React están en `src/ui/cierres/`.
