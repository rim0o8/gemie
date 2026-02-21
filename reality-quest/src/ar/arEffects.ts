import * as THREE from 'three';
import type { AREffectType } from '../types';

export const playAREffect = (
  scene: THREE.Scene,
  position: THREE.Vector3,
  type: AREffectType,
): Promise<void> => {
  switch (type) {
    case 'seal-break':
      return playSealBreak(scene, position);
    case 'portal-open':
      return playPortalOpen(scene, position);
    case 'final-gate':
      return playFinalGate(scene, position);
  }
};

const playSealBreak = (scene: THREE.Scene, position: THREE.Vector3): Promise<void> =>
  new Promise((resolve) => {
    const DURATION = 1500;
    const objects: THREE.Object3D[] = [];

    // パーティクル
    const count = 50;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = position.x + (Math.random() - 0.5) * 0.6;
      pos[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.6;
      pos[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.6;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0xa78bfa, size: 0.05, transparent: true });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);
    objects.push(particles);

    // リング
    const ringGeo = new THREE.TorusGeometry(0.3, 0.02, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(position);
    ring.scale.setScalar(0);
    scene.add(ring);
    objects.push(ring);

    const startTime = performance.now();
    const tick = (): void => {
      const t = Math.min((performance.now() - startTime) / DURATION, 1);
      ring.scale.setScalar(t);
      ringMat.opacity = 1 - t;
      pMat.opacity = 1 - t;
      if (t < 1) {
        requestAnimationFrame(tick);
        return;
      }
      objects.forEach((o) => scene.remove(o));
      resolve();
    };
    requestAnimationFrame(tick);
  });

const playPortalOpen = (scene: THREE.Scene, position: THREE.Vector3): Promise<void> =>
  new Promise((resolve) => {
    const DURATION = 2000;
    const objects: THREE.Object3D[] = [];

    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 16, 100), ringMat);
    ring.position.copy(position);
    ring.scale.setScalar(0);
    scene.add(ring);
    objects.push(ring);

    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x1e1b4b,
      transparent: true,
      opacity: 0.7,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), planeMat);
    plane.position.copy(position);
    plane.scale.setScalar(0);
    scene.add(plane);
    objects.push(plane);

    const startTime = performance.now();
    const tick = (): void => {
      const t = Math.min((performance.now() - startTime) / DURATION, 1);
      ring.scale.setScalar(t);
      plane.scale.setScalar(t);
      if (t < 1) {
        requestAnimationFrame(tick);
        return;
      }
      objects.forEach((o) => scene.remove(o));
      resolve();
    };
    requestAnimationFrame(tick);
  });

const playFinalGate = (scene: THREE.Scene, position: THREE.Vector3): Promise<void> =>
  new Promise((resolve) => {
    const DURATION = 3000;
    const EXPAND = DURATION * 0.6;
    const objects: THREE.Object3D[] = [];

    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 16, 100), ringMat);
    ring.position.copy(position);
    ring.scale.setScalar(0);
    scene.add(ring);
    objects.push(ring);

    const count = 100;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = position.x + (Math.random() - 0.5) * 2.0;
      pos[i * 3 + 1] = position.y + (Math.random() - 0.5) * 2.0;
      pos[i * 3 + 2] = position.z + (Math.random() - 0.5) * 2.0;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0xfbbf24, size: 0.05, transparent: true });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);
    objects.push(particles);

    const light = new THREE.PointLight(0xfbbf24, 2.0, 5);
    light.position.copy(position);
    scene.add(light);
    objects.push(light);

    const startTime = performance.now();
    const tick = (): void => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / DURATION, 1);
      if (elapsed <= EXPAND) {
        ring.scale.setScalar((elapsed / EXPAND) * 1.5);
        ringMat.opacity = 1;
        pMat.opacity = 1;
      } else {
        ring.scale.setScalar(1.5);
        const fade = (elapsed - EXPAND) / (DURATION - EXPAND);
        ringMat.opacity = 1 - fade;
        pMat.opacity = 1 - fade;
      }
      if (t < 1) {
        requestAnimationFrame(tick);
        return;
      }
      objects.forEach((o) => scene.remove(o));
      resolve();
    };
    requestAnimationFrame(tick);
  });
