import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

export const createXRRenderer = (
  domOverlayRoot: HTMLElement,
): {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
} => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.xr.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  void domOverlayRoot;
  return { renderer, scene, camera };
};

export const createARButton = (
  renderer: THREE.WebGLRenderer,
  domOverlayRoot: HTMLElement,
): HTMLElement =>
  ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay', 'dom-overlay-for-handheld-ar'],
    domOverlay: { root: domOverlayRoot },
  });

export const startRenderLoop = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  onFrame?: (timestamp: number, frame: XRFrame | undefined) => void,
): void => {
  renderer.setAnimationLoop((timestamp: number, frame: XRFrame | undefined) => {
    onFrame?.(timestamp, frame);
    renderer.render(scene, camera);
  });
};
