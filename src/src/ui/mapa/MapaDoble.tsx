/**
 * Doble del mapa para jsdom (Leaflet no corre bien ahí). Cumple el mismo contrato que
 * `MapaCampus` y deja a la vista lo que recibió, para que los tests lo comprueben.
 */
import type { PropsMapa } from './tipos.ts'

export default function MapaDoble({ encuadre, marcador, margenes, recentrar, Capas }: PropsMapa) {
  return (
    <div
      data-testid="mapa-doble"
      data-encuadre={encuadre.tipo}
      data-marcador={marcador ? `${marcador.x},${marcador.y}` : ''}
      data-margen-abajo={margenes.abajo}
      data-margen-arriba={margenes.arriba}
      data-recentrar={recentrar}
      style={{ position: 'absolute', inset: 0 }}
    >
      {Capas && <Capas />}
    </div>
  )
}
