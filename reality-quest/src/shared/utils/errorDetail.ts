/** エラーオブジェクトから人間可読なメッセージを抽出する */
export const extractErrorDetail = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const maybe = error as {
      readonly status?: unknown;
      readonly code?: unknown;
      readonly message?: unknown;
    };
    const status = typeof maybe.status === 'number' ? `status=${maybe.status}` : null;
    const code =
      typeof maybe.code === 'string' || typeof maybe.code === 'number'
        ? `code=${String(maybe.code)}`
        : null;
    const message = typeof maybe.message === 'string' ? maybe.message : null;
    const detail = [status, code, message]
      .filter((part): part is string => part !== null)
      .join(' ');
    if (detail.length > 0) return detail;
  }
  return 'unknown error';
};

/** エラーを文字列に変換する簡易サマリー */
export const summarizeError = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  if (typeof error === 'string' && error.trim().length > 0) return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};
