export type CameraCapture = {
  readonly getBase64Frame: () => string;
  readonly stop: () => void;
};

type CameraCaptureOptions = {
  readonly stop?: () => void;
  readonly createCanvas?: () => HTMLCanvasElement;
};

export const createCameraCaptureFromVideo = (
  video: HTMLVideoElement,
  options: CameraCaptureOptions = {},
): CameraCapture => {
  const canvas = options.createCanvas?.() ?? document.createElement('canvas');

  return {
    getBase64Frame: (): string => {
      if (video.videoWidth <= 0 || video.videoHeight <= 0) {
        throw new Error('カメラ画像の取得に失敗しました。しばらく待ってから再試行してください。');
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D コンテキストの取得に失敗しました。');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1] ?? '';
      if (!base64) {
        throw new Error('カメラ画像のエンコードに失敗しました。');
      }
      return base64;
    },
    stop: (): void => {
      options.stop?.();
    },
  };
};

export const waitForVideoFrameReady = async (
  video: HTMLVideoElement,
  timeoutMs: number = 4000,
): Promise<void> => {
  if (video.videoWidth > 0 && video.videoHeight > 0) return;

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(
        new Error('カメラ映像の準備に時間がかかっています。しばらく待って再試行してください。'),
      );
    }, timeoutMs);

    const onReady = (): void => {
      if (video.videoWidth <= 0 || video.videoHeight <= 0) return;
      cleanup();
      resolve();
    };

    const cleanup = (): void => {
      clearTimeout(timeoutId);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('resize', onReady);
    };

    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('resize', onReady);
  });
};

export const startCamera = async (): Promise<CameraCapture> => {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
  } catch (err) {
    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error(
          'カメラへのアクセスが拒否されました。ブラウザの設定でカメラの使用を許可してください。',
        );
      }
      if (err.name === 'NotFoundError') {
        throw new Error('カメラが見つかりません。カメラが接続されているか確認してください。');
      }
      if (err.name === 'NotReadableError') {
        throw new Error(
          'カメラにアクセスできません。他のアプリケーションが使用中の可能性があります。',
        );
      }
    }
    throw new Error('カメラの起動に失敗しました。');
  }

  const video = document.createElement('video');
  Object.assign(video.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    opacity: '0',
    pointerEvents: 'none',
  });
  video.setAttribute('playsinline', '');
  video.setAttribute('autoplay', '');
  video.srcObject = stream;
  document.body.appendChild(video);

  await new Promise<void>((resolve) => {
    video.addEventListener('loadedmetadata', () => resolve(), { once: true });
  });
  await video.play();
  await waitForVideoFrameReady(video);

  return createCameraCaptureFromVideo(video, {
    stop: (): void => {
      stream.getTracks().forEach((t) => t.stop());
      video.parentNode?.removeChild(video);
    },
  });
};
