import { describe, expect, it, vi } from 'vitest';
import type * as THREE from 'three';

vi.mock('three/addons/webxr/ARButton.js', () => ({
  ARButton: { createButton: vi.fn(() => ({})) },
}));

import { startRenderLoop } from './xrRenderer';

describe('startRenderLoop', () => {
  it('setAnimationLoop にコールバックを渡し、render を呼ぶ', () => {
    const setAnimationLoop = vi.fn();
    const render = vi.fn();
    const renderer = { setAnimationLoop, render } as unknown as THREE.WebGLRenderer;
    const scene = {} as unknown as THREE.Scene;
    const camera = {} as unknown as THREE.PerspectiveCamera;

    startRenderLoop(renderer, scene, camera);

    expect(setAnimationLoop).toHaveBeenCalledTimes(1);
    const loopFn = setAnimationLoop.mock.calls[0]?.[0];
    expect(typeof loopFn).toBe('function');

    loopFn(0, undefined);
    expect(render).toHaveBeenCalledWith(scene, camera);
  });

  it('onFrame コールバックが呼ばれる', () => {
    const setAnimationLoop = vi.fn();
    const render = vi.fn();
    const renderer = { setAnimationLoop, render } as unknown as THREE.WebGLRenderer;
    const scene = {} as unknown as THREE.Scene;
    const camera = {} as unknown as THREE.PerspectiveCamera;
    const onFrame = vi.fn();

    startRenderLoop(renderer, scene, camera, onFrame);

    const loopFn = setAnimationLoop.mock.calls[0]?.[0];
    const fakeFrame = {} as XRFrame;
    loopFn(42, fakeFrame);

    expect(onFrame).toHaveBeenCalledWith(42, fakeFrame);
    expect(render).toHaveBeenCalledWith(scene, camera);
  });

  it('onFrame なしでもエラーにならない', () => {
    const setAnimationLoop = vi.fn();
    const render = vi.fn();
    const renderer = { setAnimationLoop, render } as unknown as THREE.WebGLRenderer;

    startRenderLoop(
      renderer,
      {} as unknown as THREE.Scene,
      {} as unknown as THREE.PerspectiveCamera,
    );

    const loopFn = setAnimationLoop.mock.calls[0]?.[0];
    expect(() => loopFn(0, undefined)).not.toThrow();
  });
});
