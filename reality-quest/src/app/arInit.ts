import type * as THREE from 'three';
import { createXRRenderer, createARButton, startRenderLoop } from '../ar/xrRenderer';
import { createXRSessionState, onSessionStart, onSessionEnd } from '../ar/xrSession';
import { createReticle, getHitTestResult } from '../ar/hitTest';
import { startIOSCameraAR, isWebXRARSupported } from '../ar/iosCameraAR';
import type { GameRuntime } from './gameLoop';

export type ARContext = {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
};

export const createARContext = (overlay: HTMLElement): ARContext => {
  const { renderer, scene, camera } = createXRRenderer(overlay);
  return { renderer, scene, camera };
};

export const initAR = async (
  arContext: ARContext,
  runtime: GameRuntime,
  hitPositionRef: THREE.Vector3,
): Promise<void> => {
  const { renderer, scene, camera } = arContext;
  const arButtonContainer = document.getElementById('ar-button-container');
  const placeholder = document.getElementById('ar-button-placeholder') as HTMLButtonElement;

  const webXRSupported = await isWebXRARSupported();

  if (webXRSupported) {
    const xrState = createXRSessionState();
    const reticle = createReticle();
    scene.add(reticle);

    const arOverlay = document.getElementById('ar-overlay') as HTMLElement;
    const arButton = createARButton(renderer, arOverlay);
    placeholder.remove();
    arButtonContainer?.appendChild(arButton);

    onSessionStart(renderer, xrState, async () => {
      // Create AudioContext synchronously in user-gesture context to avoid mobile suspension
      const audioCtx = new AudioContext();
      runtime.setMenuVisible(false);
      try {
        await runtime.startNarratorAndCamera(audioCtx);
        await runtime.startGame();
      } catch (error) {
        runtime.teardownRuntimeResources();
        console.error('[MainFlow]', 'session start failed', error);
        runtime.dispatch({
          type: 'ERROR_OCCURRED',
          reason: 'session start failed',
          occurredAt: new Date().toISOString(),
        });
      }
    });

    onSessionEnd(renderer, () => {
      runtime.setMenuVisible(true);
      runtime.stopGame();
    });

    startRenderLoop(renderer, scene, camera, (_ts, frame) => {
      if (!frame || !xrState.hitTestSource || !xrState.refSpace) return;
      const hit = getHitTestResult(frame, xrState.hitTestSource, xrState.refSpace);
      if (hit) {
        reticle.visible = true;
        reticle.position.setFromMatrixPosition(hit);
        hitPositionRef.copy(reticle.position);
        return;
      }
      reticle.visible = false;
    });
  } else {
    placeholder.textContent = '思い出をつくる';
    placeholder.disabled = false;

    let isStarting = false;

    placeholder.addEventListener('click', async () => {
      if (isStarting) return;
      isStarting = true;
      placeholder.disabled = true;
      placeholder.textContent = '起動中...';

      // Create AudioContext synchronously in click handler to avoid mobile suspension
      const audioCtx = new AudioContext();

      try {
        const session = await startIOSCameraAR(renderer, camera);
        runtime.setIosSession(session);
        await runtime.initializeConversationStack(session.createCapture(), audioCtx);
        runtime.setMenuVisible(false);

        startRenderLoop(renderer, scene, camera, () => {
          const ios = runtime.getIosSession();
          if (!ios) return;
          hitPositionRef.copy(ios.getHitPosition());
        });

        await runtime.startGame();
      } catch (error) {
        runtime.teardownRuntimeResources();
        console.error('[MainFlow]', 'iOS mode start failed', error);
        runtime.dispatch({
          type: 'ERROR_OCCURRED',
          reason: 'iOS mode start failed',
          occurredAt: new Date().toISOString(),
        });
        placeholder.disabled = false;
        placeholder.textContent = 'ARの起動に失敗しました';
      } finally {
        isStarting = false;
      }
    });
  }
};
