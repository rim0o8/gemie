import type { WebGLRenderer } from 'three';
import { setupHitTest } from './hitTest';

export type XRSessionState = {
  session: XRSession | null;
  refSpace: XRReferenceSpace | null;
  hitTestSource: XRHitTestSource | null;
};

export const createXRSessionState = (): XRSessionState => ({
  session: null,
  refSpace: null,
  hitTestSource: null,
});

export const onSessionStart = (
  renderer: WebGLRenderer,
  state: XRSessionState,
  onReady: (state: XRSessionState) => void,
): void => {
  renderer.xr.addEventListener('sessionstart', () => {
    void (async () => {
      const session = renderer.xr.getSession();
      if (!session) throw new Error('sessionstart 後に XRSession が取得できません');

      const refSpace = (await session.requestReferenceSpace('local')) as XRReferenceSpace;
      const hitTestSource = await setupHitTest(session, refSpace);

      state.session = session;
      state.refSpace = refSpace;
      state.hitTestSource = hitTestSource;

      onReady(state);
    })();
  });
};

export const onSessionEnd = (renderer: WebGLRenderer, onEnd: () => void): void => {
  renderer.xr.addEventListener('sessionend', onEnd);
};
