import type { GeoLocation, MemoryItem, Narrator } from '../../types';

type SpeechRecognitionResultEventLike = Event & {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
};

type SpeechRecognitionLike = {
  readonly start: () => void;
  readonly stop: () => void;
  readonly abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
};

type VoiceChatState = {
  readonly isLiveConnected: boolean;
  readonly isListening: boolean;
  readonly isSpeaking: boolean;
  readonly lastTranscript: string | null;
  readonly lastError: string | null;
};

type GemieVoiceChatOptions = {
  readonly narrator: Narrator;
  readonly getMemories: () => readonly MemoryItem[];
  readonly getLocation: () => GeoLocation | null;
  readonly onStateChange: (state: VoiceChatState) => void;
  readonly onMemoryDiscussed?: (memory: MemoryItem) => void;
  readonly onUserSpoke?: (transcript: string) => void;
};

export type GemieVoiceChat = {
  readonly start: () => void;
  readonly stop: () => void;
  readonly speakMemoryIntro: (memory: MemoryItem) => Promise<void>;
  readonly startRecallSession: () => Promise<void>;
};

const buildMemoryContext = (memories: readonly MemoryItem[]): string => {
  if (memories.length === 0) {
    return 'まだ思い出はありません。';
  }
  return memories
    .slice(-5)
    .map((memory, index) => `${index + 1}. ${memory.summary}`)
    .join('\n');
};

const buildTimeContext = (): string => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeLabel =
    hour >= 5 && hour < 11
      ? '朝'
      : hour >= 11 && hour < 17
        ? '昼'
        : hour >= 17 && hour < 21
          ? '夕方'
          : '夜';
  return `現在の時刻: ${timeLabel}${hour}時${minute}分`;
};

const buildLocationContext = (location: GeoLocation | null): string => {
  if (!location) return '';
  if (location.address) {
    return `ユーザーの現在地: ${location.address}（精度${Math.round(location.accuracy)}m）`;
  }
  return `ユーザーの現在地: 緯度${location.latitude}, 経度${location.longitude}（精度${Math.round(location.accuracy)}m）`;
};

const buildReplyPrompt = (
  userText: string,
  memories: readonly MemoryItem[],
  location: GeoLocation | null,
): string =>
  [
    'あなたはジェミー君です。日本語で、明るく親しみやすく短めに話してください。',
    'ユーザーと音声会話しているので、出力は読み上げやすい自然な話し言葉にしてください。',
    '「合格」「判定」「条件」などのシステム用語は絶対に使わないでください。',
    buildTimeContext(),
    buildLocationContext(location),
    '時刻や場所について聞かれたら、上記の情報をもとに自然に答えてください。知らない場所の詳細を捏造しないでください。',
    `思い出一覧:\n${buildMemoryContext(memories)}`,
    `ユーザーの発話: ${userText}`,
    '思い出に軽く触れつつ返答してください。',
  ]
    .filter(Boolean)
    .join('\n\n');

const buildRecallReplyPrompt = (
  userText: string,
  memories: readonly MemoryItem[],
  currentMemory: MemoryItem,
  location: GeoLocation | null,
): string =>
  [
    'あなたはジェミー君です。今、飼い主と一緒に過去の思い出を振り返っています。',
    '日本語で、懐かしそうに、楽しそうに、短めに話してください。',
    'ユーザーと音声会話しているので、出力は読み上げやすい自然な話し言葉にしてください。',
    '「合格」「判定」「条件」などのシステム用語は絶対に使わないでください。',
    buildTimeContext(),
    buildLocationContext(location),
    `今話している思い出: ${currentMemory.summary}`,
    `思い出一覧:\n${buildMemoryContext(memories)}`,
    `ユーザーの発話: ${userText}`,
    'ユーザーの発話に応じつつ、今の思い出や他の思い出の話をしてください。',
    '次の思い出に移りたいときは「次の思い出見る？」と聞いてください。',
  ]
    .filter(Boolean)
    .join('\n\n');

const buildRecallIntroPrompt = (memory: MemoryItem): string =>
  [
    'あなたはジェミー君です。今、飼い主と一緒に過去の思い出を振り返っています。',
    '以下の思い出について、楽しそうに懐かしそうに2〜3文で話してください。',
    'ユーザーと音声会話しているので、出力は読み上げやすい自然な話し言葉にしてください。',
    `思い出: ${memory.summary}`,
    `記録した日: ${memory.createdAt}`,
    memory.emotionTag ? `そのときの気持ち: ${memory.emotionTag}` : '',
    '「合格」「判定」などのシステム用語は絶対に使わないでください。',
    '飼い主と一緒に体験した楽しい出来事として自然に話してください。',
    '話し終わったら「何か聞きたいことある？」のように会話を促してください。',
  ]
    .filter(Boolean)
    .join('\n\n');

const pickRandomMemory = (
  memories: readonly MemoryItem[],
  exclude?: MemoryItem,
): MemoryItem | null => {
  const candidates = exclude ? memories.filter((m) => m.id !== exclude.id) : [...memories];
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
};

const updateState = (
  current: VoiceChatState,
  patch: Partial<VoiceChatState>,
  onStateChange: (state: VoiceChatState) => void,
): VoiceChatState => {
  const next = { ...current, ...patch };
  onStateChange(next);
  return next;
};

export const createGemieVoiceChat = (options: GemieVoiceChatOptions): GemieVoiceChat => {
  const Recognition = getSpeechRecognitionConstructor();
  let recognition: SpeechRecognitionLike | null = null;
  let active = false;
  let recallMode = false;
  let currentRecallMemory: MemoryItem | null = null;
  let state: VoiceChatState = {
    isLiveConnected: true,
    isListening: false,
    isSpeaking: false,
    lastTranscript: null,
    lastError: null,
  };

  const handleResult = async (event: SpeechRecognitionResultEventLike): Promise<void> => {
    const result = event.results[event.resultIndex];
    const transcript = result?.[0]?.transcript?.trim();
    if (!transcript || state.isSpeaking) return;

    state = updateState(
      state,
      { isListening: false, isSpeaking: true, lastTranscript: transcript, lastError: null },
      options.onStateChange,
    );

    options.onUserSpoke?.(transcript);

    try {
      const memories = options.getMemories();
      const location = options.getLocation();

      if (recallMode && currentRecallMemory) {
        // Check if user wants to move to next memory
        const wantsNext =
          transcript.includes('次') ||
          transcript.includes('他の') ||
          transcript.includes('別の') ||
          transcript.includes('もう一つ');

        if (wantsNext) {
          const next = pickRandomMemory(memories, currentRecallMemory);
          if (next) {
            currentRecallMemory = next;
            options.onMemoryDiscussed?.(next);
            const introPrompt = buildRecallIntroPrompt(next);
            await options.narrator.speak(introPrompt);
          } else {
            await options.narrator.speak(
              '全部の思い出を振り返ったみたい。また新しい思い出を作ろうね！',
            );
          }
        } else {
          const prompt = buildRecallReplyPrompt(
            transcript,
            memories,
            currentRecallMemory,
            location,
          );
          await options.narrator.speak(prompt);
        }
      } else {
        const prompt = buildReplyPrompt(transcript, memories, location);
        await options.narrator.speak(prompt);
      }

      state = updateState(state, { isSpeaking: false }, options.onStateChange);
    } catch (error) {
      state = updateState(
        state,
        {
          isSpeaking: false,
          lastError: `voice reply failed: ${String(error)}`,
        },
        options.onStateChange,
      );
    }
  };

  const startRecognition = (): void => {
    if (!Recognition) {
      state = updateState(
        state,
        { isLiveConnected: false, isListening: false, lastError: 'SpeechRecognition unsupported' },
        options.onStateChange,
      );
      return;
    }

    recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'ja-JP';
    recognition.onresult = (event) => {
      void handleResult(event);
    };
    recognition.onerror = (event) => {
      state = updateState(
        state,
        {
          isListening: false,
          lastError: `speech recognition error: ${event.error ?? 'unknown'}`,
        },
        options.onStateChange,
      );
    };
    recognition.onend = () => {
      if (!active) return;
      try {
        recognition?.start();
        state = updateState(state, { isListening: true }, options.onStateChange);
      } catch (error) {
        state = updateState(
          state,
          {
            isListening: false,
            lastError: `speech recognition restart failed: ${String(error)}`,
          },
          options.onStateChange,
        );
      }
    };
    recognition.start();
    state = updateState(
      state,
      { isLiveConnected: true, isListening: true, lastError: null },
      options.onStateChange,
    );
  };

  const start = (): void => {
    active = true;
    recallMode = false;
    currentRecallMemory = null;
    startRecognition();
  };

  const stop = (): void => {
    active = false;
    recallMode = false;
    currentRecallMemory = null;
    try {
      recognition?.stop();
      recognition?.abort();
    } catch (error) {
      state = updateState(
        state,
        {
          isListening: false,
          lastError: `speech recognition stop failed: ${String(error)}`,
        },
        options.onStateChange,
      );
    }
    state = updateState(
      state,
      { isListening: false, isSpeaking: false, isLiveConnected: false },
      options.onStateChange,
    );
  };

  const speakMemoryIntro = async (memory: MemoryItem): Promise<void> => {
    state = updateState(state, { isSpeaking: true }, options.onStateChange);
    try {
      const introPrompt = buildRecallIntroPrompt(memory);
      await options.narrator.speak(introPrompt);
    } finally {
      state = updateState(state, { isSpeaking: false }, options.onStateChange);
    }
  };

  const startRecallSession = async (): Promise<void> => {
    active = true;
    recallMode = true;

    const memories = options.getMemories();
    if (memories.length === 0) {
      state = updateState(state, { isSpeaking: true }, options.onStateChange);
      await options.narrator.speak('まだ思い出がないみたい。');
      state = updateState(state, { isSpeaking: false }, options.onStateChange);
      return;
    }

    const firstMemory = pickRandomMemory(memories);
    if (!firstMemory) return;

    currentRecallMemory = firstMemory;
    options.onMemoryDiscussed?.(firstMemory);

    state = updateState(state, { isSpeaking: true }, options.onStateChange);
    try {
      const introPrompt = buildRecallIntroPrompt(firstMemory);
      await options.narrator.speak(introPrompt);
    } finally {
      state = updateState(state, { isSpeaking: false }, options.onStateChange);
    }

    // Start listening for user responses after intro
    startRecognition();
  };

  return { start, stop, speakMemoryIntro, startRecallSession };
};
