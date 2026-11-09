/** `Integraciones.ExtraAyuda` de la app: "Instalar en el celular" o los pasos de iOS. */
import { useValorConexion } from './contexto.ts'
import OpcionInstalar from './OpcionInstalar.tsx'

export default function AyudaInstalar() {
  const valor = useValorConexion()
  if (!valor) return null
  const { plataforma, puedeInstalar, instalar } = valor.instalacion
  return (
    <OpcionInstalar
      plataforma={plataforma}
      puedeInstalar={puedeInstalar}
      onInstalar={() => void instalar()}
    />
  )
}
