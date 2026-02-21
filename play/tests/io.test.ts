import { describe, expect, it, vi } from 'vitest';

const { onMock, closeMock, createInterfaceMock } = vi.hoisted(() => {
  const localOnMock = vi.fn();
  const localCloseMock = vi.fn();
  const localCreateInterfaceMock = vi.fn(() => ({
    on: localOnMock,
    close: localCloseMock,
  }));
  return {
    onMock: localOnMock,
    closeMock: localCloseMock,
    createInterfaceMock: localCreateInterfaceMock,
  };
});

vi.mock('node:readline', () => ({
  default: {
    createInterface: createInterfaceMock,
  },
}));

import { createReadlineIO } from '../src/io';

describe('createReadlineIO', () => {
  it('lineイベントを購読してhandlerを呼ぶ', async () => {
    const io = createReadlineIO();
    const handler = vi.fn(async () => undefined);
    io.onLine(handler);

    const registered = onMock.mock.calls[0]?.[1] as ((line: string) => void) | undefined;
    expect(onMock).toHaveBeenCalledWith('line', expect.any(Function));
    expect(registered).toBeTypeOf('function');

    registered?.('hello');
    await Promise.resolve();

    expect(handler).toHaveBeenCalledWith('hello');
  });

  it('print / printError / close を実行できる', () => {
    const io = createReadlineIO();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    io.print('ok');
    io.printError('ng');
    io.close();

    expect(logSpy).toHaveBeenCalledWith('ok');
    expect(errorSpy).toHaveBeenCalledWith('ng');
    expect(closeMock).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
