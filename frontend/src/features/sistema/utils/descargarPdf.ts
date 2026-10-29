import { Linking, Platform } from 'react-native';
import { apiClient } from '../../../api/client';

/**
 * Descarga de manera transparente el archivo PDF en el dispositivo.
 * - En Web: Descarga directamente como archivo binario (Blob) en la carpeta de descargas del navegador.
 * - En Móvil (Android/iOS): Invoca Linking para abrir el stream de descarga del navegador o visor nativo.
 */
export const descargarArchivoPDF = async (
  rutaOUrl: string,
  nombreSugerido: string = 'reporte_match_civico.pdf'
): Promise<void> => {
  if (!rutaOUrl) return;

  const baseURL = apiClient.defaults.baseURL || '';
  const fullUrl = rutaOUrl.startsWith('http://') || rutaOUrl.startsWith('https://')
    ? rutaOUrl
    : `${baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL}${rutaOUrl.startsWith('/') ? rutaOUrl : `/${rutaOUrl}`}`;

  // Entorno Web: descarga binaria directa sin bloquear popups
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const response = await apiClient.get(rutaOUrl, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = nombreSugerido;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
      return;
    } catch {
      // Fallback web: enlace ancla directo con atributo download
      const a = document.createElement('a');
      a.href = fullUrl;
      a.download = nombreSugerido;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
  }

  // Entorno Móvil (Android / iOS)
  try {
    const supported = await Linking.canOpenURL(fullUrl);
    if (supported) {
      await Linking.openURL(fullUrl);
    } else {
      await Linking.openURL(fullUrl);
    }
  } catch (err) {
    console.error('Error abriendo enlace de descarga:', err);
  }
};
