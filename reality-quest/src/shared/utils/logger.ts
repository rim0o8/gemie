type LogLevel = 'info' | 'warn' | 'error';

export type Logger = {
  readonly info: (stage: string, detail?: Record<string, unknown>) => void;
  readonly warn: (stage: string, detail?: Record<string, unknown>) => void;
  readonly error: (stage: string, detail?: Record<string, unknown>) => void;
};

export const createLogger = (tag: string): Logger => {
  const log = (level: LogLevel, stage: string, detail?: Record<string, unknown>): void => {
    const payload = detail ? JSON.stringify(detail) : '';
    const message = `[${tag}] ${stage}${payload ? ` ${payload}` : ''}`;
    if (level === 'error') {
      console.error(message);
      return;
    }
    if (level === 'warn') {
      console.warn(message);
      return;
    }
    console.info(message);
  };

  return {
    info: (stage, detail) => log('info', stage, detail),
    warn: (stage, detail) => log('warn', stage, detail),
    error: (stage, detail) => log('error', stage, detail),
  };
};
