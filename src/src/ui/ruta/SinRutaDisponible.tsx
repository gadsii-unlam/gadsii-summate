/**
 * "Sin ruta disponible" con el motivo (aplicar-cierres-temporales, decisión 7): título, texto con
 * los cierres que aíslan el origen o el destino y las acciones "Elegir otro destino" y "Volver al
 * mapa". El destino sigue marcado en el mapa (lo hace la pantalla con su pin).
 */
import type { AccionSinRuta, EstadoSinRuta } from '../../cierres/index.ts'
import './ruta.css'

export interface PropsSinRutaDisponible {
  sinRuta: EstadoSinRuta
  alAccion: (accion: AccionSinRuta['id']) => void
}

export default function SinRutaDisponible({ sinRuta, alAccion }: PropsSinRutaDisponible) {
  return (
    <div className="ruta-sin-ruta" data-testid="ruta-sin-ruta" role="alert">
      <h3 className="ruta-sin-ruta__titulo">{sinRuta.titulo}</h3>
      <p className="ruta-sin-ruta__texto">{sinRuta.texto}</p>
      <div className="ruta-resultado__acciones">
        {sinRuta.acciones.map((a, i) => (
          <button
            key={a.id}
            type="button"
            className={`boton ${i === 0 ? 'boton--primario' : 'boton--secundario'}`}
            onClick={() => alAccion(a.id)}
          >
            {a.etiqueta}
          </button>
        ))}
      </div>
    </div>
  )
}
