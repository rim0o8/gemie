import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCameraCaptureFromVideo, waitForVideoFrameReady, startCamera } from './captureFrame';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('createCameraCaptureFromVideo', () => {
  it('videoからjpeg base64 payloadを生成する', () => {
    const drawImage = vi.fn();
    const getContext = vi.fn(() => ({ drawImage }));
    const toDataURL = vi.fn(() => 'data:image/jpeg;base64,abc123');
    const canvas = {
      width: 0,
      height: 0,
      getContext,
      toDataURL,
    } as unknown as HTMLCanvasElement;
    const video = { videoWidth: 320, videoHeight: 240 } as HTMLVideoElement;

    const capture = createCameraCaptureFromVideo(video, { createCanvas: () => canvas });
    const base64 = capture.getBase64Frame();

    expect(canvas.width).toBe(320);
    expect(canvas.height).toBe(240);
    expect(getContext).toHaveBeenCalledWith('2d');
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 320, 240);
    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
    expect(base64).toBe('abc123');
  });

  it('2d contextが取得できない場合はエラーを投げる', () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => null),
      toDataURL: vi.fn(),
    } as unknown as HTMLCanvasElement;
    const video = { videoWidth: 320, videoHeight: 240 } as HTMLVideoElement;
    const capture = createCameraCaptureFromVideo(video, { createCanvas: () => canvas });

    expect(() => capture.getBase64Frame()).toThrow('Canvas 2D コンテキストの取得に失敗しました。');
  });

  it('videoサイズが0の場合はエラーを投げる', () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage: vi.fn() })),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,abc123'),
    } as unknown as HTMLCanvasElement;
    const video = { videoWidth: 0, videoHeight: 240 } as HTMLVideoElement;
    const capture = createCameraCaptureFromVideo(video, { createCanvas: () => canvas });

    expect(() => capture.getBase64Frame()).toThrow(
      'カメラ画像の取得に失敗しました。しばらく待ってから再試行してください。',
    );
  });

  it('stopでcleanupを呼ぶ', () => {
    const stop = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage: vi.fn() })),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,abc123'),
    } as unknown as HTMLCanvasElement;
    const video = { videoWidth: 1, videoHeight: 1 } as HTMLVideoElement;
    const capture = createCameraCaptureFromVideo(video, { createCanvas: () => canvas, stop });

    capture.stop();

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('base64が空の場合はエンコードエラーを投げる', () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage: vi.fn() })),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,'),
    } as unknown as HTMLCanvasElement;
    const video = { videoWidth: 320, videoHeight: 240 } as HTMLVideoElement;
    const capture = createCameraCaptureFromVideo(video, { createCanvas: () => canvas });

    expect(() => capture.getBase64Frame()).toThrow('カメラ画像のエンコードに失敗しました。');
  });
});

describe('waitForVideoFrameReady', () => {
  it('既にvideoサイズがあればすぐ解決する', async () => {
    const video = { videoWidth: 320, videoHeight: 240 } as HTMLVideoElement;
    await expect(waitForVideoFrameReady(video)).resolves.toBeUndefined();
  });

  it('loadeddataイベントで解決する', async () => {
    const listeners: Record<string, ((e?: unknown) => void)[]> = {};
    const video = {
      videoWidth: 0,
      videoHeight: 0,
      addEventListener: vi.fn((name: string, cb: () => void) => {
        (listeners[name] ??= []).push(cb);
      }),
      removeEventListener: vi.fn(),
    } as unknown as HTMLVideoElement;

    const promise = waitForVideoFrameReady(video, 5000);

    // Simulate video becoming ready
    (video as { videoWidth: number }).videoWidth = 640;
    (video as { videoHeight: number }).videoHeight = 480;
    listeners['loadeddata']?.forEach((cb) => cb());

    await expect(promise).resolves.toBeUndefined();
    expect(video.removeEventListener).toHaveBeenCalled();
  });

  it('タイムアウトでrejectする', async () => {
    vi.useFakeTimers();
    const video = {
      videoWidth: 0,
      videoHeight: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLVideoElement;

    const promise = waitForVideoFrameReady(video, 100);

    vi.advanceTimersByTime(200);

    await expect(promise).rejects.toThrow('カメラ映像の準備に時間がかかっています');
    vi.useRealTimers();
  });

  it('videoサイズが0のままのイベントは無視する', async () => {
    vi.useFakeTimers();
    const listeners: Record<string, ((e?: unknown) => void)[]> = {};
    const video = {
      videoWidth: 0,
      videoHeight: 0,
      addEventListener: vi.fn((name: string, cb: () => void) => {
        (listeners[name] ??= []).push(cb);
      }),
      removeEventListener: vi.fn(),
    } as unknown as HTMLVideoElement;

    const promise = waitForVideoFrameReady(video, 5000);

    // Fire event but video still 0
    listeners['canplay']?.forEach((cb) => cb());

    // Now make it ready
    (video as { videoWidth: number }).videoWidth = 640;
    (video as { videoHeight: number }).videoHeight = 480;
    listeners['resize']?.forEach((cb) => cb());

    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});

describe('startCamera', () => {
  it('カメラを起動してCameraCaptureを返す', async () => {
    const stopTrack = vi.fn();
    const stream = {
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream;

    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn(async () => stream) },
    });

    const removeChild = vi.fn();
    const video = {
      videoWidth: 640,
      videoHeight: 480,
      style: {} as CSSStyleDeclaration,
      srcObject: null as MediaStream | null,
      parentNode: { removeChild },
      setAttribute: vi.fn(),
      addEventListener: vi.fn((name: string, cb: () => void) => {
        if (name === 'loadedmetadata') cb();
      }),
      play: vi.fn(async () => undefined),
    } as unknown as HTMLVideoElement;

    vi.stubGlobal('document', {
      createElement: vi.fn(() => video),
      body: { appendChild: vi.fn() },
    });

    const capture = await startCamera();
    expect(capture.getBase64Frame).toBeDefined();
    expect(capture.stop).toBeDefined();
  });

  it('NotAllowedError でアクセス拒否メッセージを投げる', async () => {
    const error = new DOMException('not allowed', 'NotAllowedError');
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => {
          throw error;
        }),
      },
    });

    await expect(startCamera()).rejects.toThrow('カメラへのアクセスが拒否されました');
  });

  it('PermissionDeniedError でアクセス拒否メッセージを投げる', async () => {
    const error = new DOMException('denied', 'PermissionDeniedError');
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => {
          throw error;
        }),
      },
    });

    await expect(startCamera()).rejects.toThrow('カメラへのアクセスが拒否されました');
  });

  it('NotFoundError でカメラ未検出メッセージを投げる', async () => {
    const error = new DOMException('not found', 'NotFoundError');
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => {
          throw error;
        }),
      },
    });

    await expect(startCamera()).rejects.toThrow('カメラが見つかりません');
  });

  it('NotReadableError でカメラ使用中メッセージを投げる', async () => {
    const error = new DOMException('not readable', 'NotReadableError');
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => {
          throw error;
        }),
      },
    });

    await expect(startCamera()).rejects.toThrow('カメラにアクセスできません');
  });

  it('非DOMExceptionエラーでは汎用メッセージを投げる', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => {
          throw new Error('unknown');
        }),
      },
    });

    await expect(startCamera()).rejects.toThrow('カメラの起動に失敗しました');
  });
});
