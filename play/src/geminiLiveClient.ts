import { GoogleGenAI, Modality } from '@google/genai';
import type { LiveConnect } from './types';

export const createLiveConnect = (): LiveConnect => {
  return async ({ apiKey, model, callbacks }) => {
    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1alpha' });
    const session = await ai.live.connect({
      model,
      config: { responseModalities: [Modality.TEXT] },
      callbacks: {
        onmessage: callbacks.onmessage,
        onerror: (event) => {
          callbacks.onerror?.(
            event.error ?? {
              message: 'Live API connection error',
              type: event.type,
            },
          );
        },
        onclose: (event) => {
          callbacks.onclose?.({
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          });
        },
      },
    });

    return {
      sendClientContent: (params) => {
        session.sendClientContent(params);
      },
      close: () => {
        session.close();
      },
    };
  };
};
