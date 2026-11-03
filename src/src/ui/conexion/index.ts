// Interfaz de tolerar-senal-irregular: avisos de conexión, versión nueva e instalación.
// `useVersionNueva` no se exporta acá a propósito: importa `virtual:pwa-register/react` y, con
// solo importarlo, el plugin deja de agregar `registerSW.js`. Importarlo desde
// `./useVersionNueva.ts` únicamente donde se registre el service worker (App).
export { default as BarraSinConexion, type PropsBarraSinConexion } from './BarraSinConexion.tsx'
export {
  default as AvisoCierresSinActualizar,
  type PropsAvisoCierresSinActualizar,
} from './AvisoCierresSinActualizar.tsx'
export {
  AvisoCambiosRuta,
  AvisoRutaActualizada,
  type PropsAvisoCambiosRuta,
  type PropsAvisoRutaActualizada,
} from './AvisoCambiosRuta.tsx'
export { default as AvisoVersionNueva, type PropsAvisoVersionNueva } from './AvisoVersionNueva.tsx'
export { default as BotonInstalar } from './BotonInstalar.tsx'
export { default as OpcionInstalar, type PropsOpcionInstalar } from './OpcionInstalar.tsx'
export {
  default as SugerenciaInstalacion,
  type PropsSugerenciaInstalacion,
} from './SugerenciaInstalacion.tsx'
export { useConexion } from './useConexion.ts'
export { useInstalacion, type Instalacion } from './useInstalacion.ts'
export * from './instalacion.ts'
export * from './posicion.ts'
export { TEXTOS_CONEXION } from './textos.ts'
