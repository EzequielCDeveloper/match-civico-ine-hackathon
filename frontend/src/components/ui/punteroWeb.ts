import { Platform } from 'react-native';

export type Puntero = {
  clientX?: number;
  clientY?: number;
  button?: number;
  pointerId?: number;
  currentTarget?: any;
  preventDefault?: () => void;
  nativeEvent?: {
    clientX?: number;
    clientY?: number;
    button?: number;
    pointerId?: number;
  };
};

export function punto(e: Puntero) {
  return {
    x: e.clientX ?? e.nativeEvent?.clientX ?? 0,
    y: e.clientY ?? e.nativeEvent?.clientY ?? 0,
    button: e.button ?? e.nativeEvent?.button ?? 0,
    pointerId: e.pointerId ?? e.nativeEvent?.pointerId ?? 1,
  };
}

export function capturar(e: Puntero, pointerId: number) {
  try {
    e.currentTarget?.setPointerCapture?.(pointerId);
  } catch {
    // El nodo ya no está en el documento.
  }
}

let listo = false;

/** Impide que el navegador seleccione el texto de las tarjetas mientras se arrastran. */
export function prepararSeleccionWeb() {
  if (listo || Platform.OS !== 'web' || typeof document === 'undefined') return;
  listo = true;
  const style = document.createElement('style');
  style.textContent =
    '[data-swipe],[data-swipe] *{-webkit-user-select:none !important;user-select:none !important;-webkit-touch-callout:none !important;}';
  document.head.appendChild(style);
  const bloquear = (e: Event) => {
    const destino = e.target;
    if (destino instanceof Element && destino.closest('[data-swipe]')) e.preventDefault();
  };
  document.addEventListener('selectstart', bloquear);
  document.addEventListener('dragstart', bloquear);
}
