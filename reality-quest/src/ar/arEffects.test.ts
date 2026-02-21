import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { playAREffect } from './arEffects';

let currentTime = 0;

beforeEach(() => {
  currentTime = 0;
  vi.stubGlobal('performance', { now: vi.fn(() => currentTime) });
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((cb: (time: number) => void) => {
      // Jump well past any effect duration
      currentTime += 20000;
      (performance.now as ReturnType<typeof vi.fn>).mockReturnValue(currentTime);
      cb(currentTime);
      return 0;
    }),
  );
});

describe('playAREffect', () => {
  it('seal-break エフェクトを再生しオブジェクトをクリーンアップする', async () => {
    const scene = new THREE.Scene();
    const addSpy = vi.spyOn(scene, 'add');
    const removeSpy = vi.spyOn(scene, 'remove');
    const position = new THREE.Vector3(0, 0, -1);

    await playAREffect(scene, position, 'seal-break');

    expect(addSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('portal-open エフェクトを再生しオブジェクトをクリーンアップする', async () => {
    const scene = new THREE.Scene();
    const addSpy = vi.spyOn(scene, 'add');
    const removeSpy = vi.spyOn(scene, 'remove');
    const position = new THREE.Vector3(0, 0, -1);

    await playAREffect(scene, position, 'portal-open');

    expect(addSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('final-gate エフェクトを再生する（expand + fade フェーズ）', async () => {
    // Simulate multiple animation frames to cover both expand and fade phases
    let frameCount = 0;
    vi.mocked(requestAnimationFrame).mockImplementation((cb: (time: number) => void) => {
      frameCount++;
      // frame 1: in expand phase (t < 0.6)
      // frame 2: in fade phase (t > 0.6 but < 1)
      // frame 3: complete (t >= 1)
      const times = [1000, 2500, 20000];
      currentTime = times[Math.min(frameCount - 1, times.length - 1)] ?? 20000;
      (performance.now as ReturnType<typeof vi.fn>).mockReturnValue(currentTime);
      cb(currentTime);
      return frameCount;
    });

    const scene = new THREE.Scene();
    const addSpy = vi.spyOn(scene, 'add');
    const removeSpy = vi.spyOn(scene, 'remove');
    const position = new THREE.Vector3(0, 0, -1);

    await playAREffect(scene, position, 'final-gate');

    expect(addSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(frameCount).toBeGreaterThanOrEqual(2);
  });
});
