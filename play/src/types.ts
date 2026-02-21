export type AppConfig = {
  readonly apiKey: string;
  readonly model: string;
};

export type LiveMessage = {
  readonly text?: string;
  readonly serverContent?: {
    readonly modelTurn?: {
      readonly parts?: ReadonlyArray<{
        readonly text?: string;
      }>;
    };
  };
};

export type LiveCallbacks = {
  readonly onmessage: (message: LiveMessage) => void;
  readonly onerror?: (error: unknown) => void;
  readonly onclose?: (event: {
    readonly code?: number;
    readonly reason?: string;
    readonly wasClean?: boolean;
  }) => void;
};

export type LiveSession = {
  readonly sendClientContent: (params: {
    readonly turns: Array<{
      readonly role: 'user';
      readonly parts: Array<{ readonly text: string }>;
    }>;
    readonly turnComplete: true;
  }) => void | Promise<void>;
  readonly close: () => void;
};

export type LiveConnect = (params: {
  readonly apiKey: string;
  readonly model: string;
  readonly callbacks: LiveCallbacks;
}) => Promise<LiveSession>;

export type UserIO = {
  readonly onLine: (handler: (line: string) => void | Promise<void>) => void;
  readonly print: (message: string) => void;
  readonly printError: (message: string) => void;
  readonly close: () => void;
};
