import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { setupHitTest, getHitTestResult, createReticle } from './hitTest';

describe('setupHitTest', () => {
  it('XRHitTestSource を返す', async () => {
    const hitTestSource = { cancel: vi.fn() };
    const session = {
      requestHitTestSource: vi.fn(async () => hitTestSource),
    } as unknown as XRSession;
    const refSpace = {} as XRReferenceSpace;

    const result = await setupHitTest(session, refSpace);

    expect(result).toBe(hitTestSource);
    expect(session.requestHitTestSource).toHaveBeenCalledWith({ space: refSpace });
  });

  it('requestHitTestSource がない場合はエラーを投げる', async () => {
    const session = {} as XRSession;
    const refSpace = {} as XRReferenceSpace;

    await expect(setupHitTest(session, refSpace)).rejects.toThrow(
      'requestHitTestSource をサポートしていません',
    );
  });

  it('hitTestSource が null の場合はエラーを投げる', async () => {
    const session = {
      requestHitTestSource: vi.fn(async () => null),
    } as unknown as XRSession;
    const refSpace = {} as XRReferenceSpace;

    await expect(setupHitTest(session, refSpace)).rejects.toThrow(
      'XRHitTestSource の取得に失敗しました',
    );
  });
});

describe('getHitTestResult', () => {
  it('ヒットがあれば Matrix4 を返す', () => {
    const matrix = new Float32Array(16);
    matrix[0] = 1;
    matrix[5] = 1;
    matrix[10] = 1;
    matrix[15] = 1;
    const pose = { transform: { matrix } };
    const frame = {
      getHitTestResults: vi.fn(() => [{ getPose: vi.fn(() => pose) }]),
    } as unknown as XRFrame;
    const hitTestSource = {} as XRHitTestSource;
    const refSpace = {} as XRReferenceSpace;

    const result = getHitTestResult(frame, hitTestSource, refSpace);

    expect(result).toBeInstanceOf(THREE.Matrix4);
  });

  it('ヒットが0件なら null を返す', () => {
    const frame = {
      getHitTestResults: vi.fn(() => []),
    } as unknown as XRFrame;
    const hitTestSource = {} as XRHitTestSource;
    const refSpace = {} as XRReferenceSpace;

    const result = getHitTestResult(frame, hitTestSource, refSpace);

    expect(result).toBeNull();
  });

  it('pose が null なら null を返す', () => {
    const frame = {
      getHitTestResults: vi.fn(() => [{ getPose: vi.fn(() => null) }]),
    } as unknown as XRFrame;
    const hitTestSource = {} as XRHitTestSource;
    const refSpace = {} as XRReferenceSpace;

    const result = getHitTestResult(frame, hitTestSource, refSpace);

    expect(result).toBeNull();
  });
});

describe('createReticle', () => {
  it('非表示の Mesh を作成する', () => {
    const reticle = createReticle();

    expect(reticle).toBeInstanceOf(THREE.Mesh);
    expect(reticle.visible).toBe(false);
  });
});
