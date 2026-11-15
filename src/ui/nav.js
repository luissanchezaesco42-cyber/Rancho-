import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { parentHash } from './router.js';

let guard = null; // () => boolean: false cancela la salida (cambios sin guardar)
let sheetCloser = null; // cierra la hoja de acciones abierta

export const setGuard = (fn) => { guard = fn; };
export const setSheetCloser = (fn) => { sheetCloser = fn; };

export function navigate(hash) {
  if (guard && !guard()) return false;
  guard = null;
  if (location.hash === hash) window.dispatchEvent(new Event('hashchange'));
  else location.hash = hash;
  return true;
}

/** Atrás: primero cierra la hoja abierta; luego sube un nivel; en el inicio sale de la app. */
export function goBack(routeName) {
  if (sheetCloser) { sheetCloser(); return true; }
  const parent = parentHash(routeName);
  if (parent) return navigate(parent);
  if (Capacitor.isNativePlatform()) App.exitApp();
  return false;
}

/** Conecta el botón y el gesto de retroceso de Android. */
export function installBackHandler(getRouteName) {
  if (!Capacitor.isNativePlatform()) return;
  App.addListener('backButton', () => { goBack(getRouteName()); });
}
