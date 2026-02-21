import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startIOSCameraAR } from './iosCameraAR';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('startIOSCameraAR', () => {
  it('createCapture.stop と session.stop は冪等で、トラック停止は一度だけ実行される', async () => {
    const stopTrack = vi.fn();
    const stream = {
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream;

    const getUserMedia = vi.fn(async () => stream);
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia,
      },
    });

    const remove = vi.fn();
    const video = {
      videoWidth: 1280,
      videoHeight: 720,
      muted: false,
      srcObject: null as MediaStream | null,
      style: {} as CSSStyleDeclaration,
      setAttribute: vi.fn(),
      addEventListener: vi.fn((name: string, cb: () => void) => {
        if (name === 'loadedmetadata') cb();
      }),
      remove,
      play: vi.fn(async () => undefined),
    } as unknown as HTMLVideoElement;

    const insertBefore = vi.fn();
    const fakeDocument = {
      createElement: vi.fn((tag: string) => {
        if (tag === 'video') {
          return video;
        }
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: vi.fn(() => ({ drawImage: vi.fn() })),
            toDataURL: vi.fn(() => 'data:image/jpeg;base64,abc'),
          } as unknown as HTMLCanvasElement;
        }
        throw new Error(`unexpected tag: ${tag}`);
      }),
      body: {
        firstChild: null,
        insertBefore,
      },
    } as unknown as Document;
    vi.stubGlobal('document', fakeDocument);

    const renderer = { domElement: { style: {} } } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 20);

    const session = await startIOSCameraAR(renderer, camera);
    const capture = session.createCapture();

    capture.stop();
    session.stop();

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(insertBefore).toHaveBeenCalledTimes(1);
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
