import type { GeoLocation, LocationService } from '../../types';

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
};

const REVERSE_GEOCODE_TIMEOUT_MS = 5_000;

const reverseGeocode = async (latitude: number, longitude: number): Promise<string | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ja&zoom=16`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REVERSE_GEOCODE_TIMEOUT_MS);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'RealityQuest/1.0' },
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = (await response.json()) as {
      display_name?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        suburb?: string;
        neighbourhood?: string;
        quarter?: string;
        road?: string;
        state?: string;
      };
    };
    const addr = data.address;
    if (!addr) return data.display_name ?? null;
    const area = addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? addr.town ?? addr.village ?? '';
    const city = addr.city ?? '';
    const state = addr.state ?? '';
    const parts = [state, city, area].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : (data.display_name ?? null);
  } catch (error) {
    console.warn('[LocationService] reverse geocode failed', error);
    return null;
  }
};

export const createBrowserLocationService = (): LocationService => ({
  isAvailable: (): boolean => typeof navigator !== 'undefined' && 'geolocation' in navigator,

  getCurrentPosition: (): Promise<GeoLocation> =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const timestamp = new Date(position.timestamp).toISOString();
          void reverseGeocode(latitude, longitude).then((address) => {
            resolve({ latitude, longitude, accuracy, timestamp, address });
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        GEOLOCATION_OPTIONS,
      );
    }),
});
