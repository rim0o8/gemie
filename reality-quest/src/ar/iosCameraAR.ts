import * as THREE from 'three';
import { createCameraCaptureFromVideo, waitForVideoFrameReady } from '../camera/captureFrame';
import type { CameraCapture } from '../camera/captureFrame';

export type IOSARSession = {
  readonly stop: () => void;
  readonly getHitPosition: () => THREE.Vector3;
  readonly createCapture: () => CameraCapture;
};

const requestOrientationPermission = async (): Promise<boolean> => {
  type DOE = {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  const maybeDOE = globalThis.DeviceOrientationEvent as unknown as DOE | undefined;
  if (!maybeDOE) return false;

  if (typeof maybeDOE.requestPermission === 'function') {
    try {
      const result = await maybeDOE.requestPermission();
      return result === 'granted';
    } catch (error) {
      console.warn('[iOS AR] requestOrientationPermission failed', error);
      return false;
    }
  }
  return true; // Android / 古いiOSは許可不要
};

export const startIOSCameraAR = async (
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
): Promise<IOSARSession> => {
  // 1. カメラストリーム取得
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });

  // 2. ビデオ要素をフルスクリーン背景に設置
  const video = document.createElement('video');
  video.setAttribute('playsinline', '');
  video.setAttribute('autoplay', '');
  video.muted = true;
  video.srcObject = stream;
  Object.assign(video.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: '1',
    pointerEvents: 'none',
  });
  document.body.insertBefore(video, document.body.firstChild);
  await new Promise<void>((resolve) => {
    video.addEventListener('loadedmetadata', () => resolve(), { once: true });
  });
  await video.play();
  await waitForVideoFrameReady(video);

  // 3. Three.js canvasをビデオの上に重ねる
  Object.assign(renderer.domElement.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '2',
  });

  // 4. デバイスジャイロでカメラを回転（iOS 13+ は許可が必要）
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);

  const orientationGranted = await requestOrientationPermission();
  const cleanups: Array<() => void> = [];
  let stopped = false;

  if (orientationGranted) {
    // Three.jsのカメラ方向をDeviceOrientationから計算
    const worldQuat = new THREE.Quaternion();
    const screenQuat = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');

    const onOrientation = (e: DeviceOrientationEvent): void => {
      if (e.alpha === null) return;
      euler.set(
        THREE.MathUtils.degToRad(e.beta ?? 0),
        THREE.MathUtils.degToRad(e.alpha),
        -THREE.MathUtils.degToRad(e.gamma ?? 0),
        'YXZ',
      );
      worldQuat.setFromEuler(euler);
      worldQuat.multiply(screenQuat);
      camera.quaternion.copy(worldQuat);
    };

    window.addEventListener('deviceorientation', onOrientation);
    cleanups.push(() => window.removeEventListener('deviceorientation', onOrientation));
  }

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    cleanups.forEach((fn) => fn());
    stream.getTracks().forEach((t) => t.stop());
    video.remove();
  };

  // AR効果を配置する現実空間上の位置（カメラ前方1.5m）
  const getHitPosition = (): THREE.Vector3 => {
    const forward = new THREE.Vector3(0, 0, -1.5).applyQuaternion(camera.quaternion);
    return camera.position.clone().add(forward);
  };

  const createCapture = (): CameraCapture => createCameraCaptureFromVideo(video, { stop });

  return { stop, getHitPosition, createCapture };
};

export const isWebXRARSupported = async (): Promise<boolean> => {
  if (!navigator.xr) return false;
  return navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
};
