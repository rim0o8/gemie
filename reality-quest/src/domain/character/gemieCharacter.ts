export const GEMIE_CHARACTER_BIBLE = [
  'Gemie is a mysterious cute creature, hedgehog-like but not an actual hedgehog.',
  'Small round body, soft pastel spikes, big curious eyes, tiny paws, friendly smile.',
  'Always keep the same character identity across generations.',
  '2D illustration style, clean silhouette, warm toybox color palette.',
  'No realistic animal fur rendering, no horror style, no text overlays.',
].join(' ');

export const buildGreetingIllustrationPrompt = (): string =>
  [
    GEMIE_CHARACTER_BIBLE,
    'Pose: Gemie is waving one paw to greet the user.',
    'Emotion: welcoming, cheerful, energetic.',
    'Composition: centered character portrait, medium shot.',
    'Background: soft warm gradient with simple playful shapes.',
  ].join(' ');

export const buildEmotionIllustrationPrompt = (emotionTag: string, sceneHint: string): string =>
  [
    GEMIE_CHARACTER_BIBLE,
    `Emotion tag: ${emotionTag}.`,
    `Scene hint: ${sceneHint}.`,
    'Keep Gemie design consistent with previous images.',
  ].join(' ');

/**
 * 思い出画像にgemie君を合成するためのプロンプトを生成する。
 * 画像の内容説明（summary）に基づいて、gemie君がその場面にいるような
 * イラストを生成するよう指示する。食べ物の場合は食べている様子になる。
 */
export const buildMemoryIllustrationPrompt = (
  memorySummary: string,
  emotionTag: string | null,
): string =>
  [
    GEMIE_CHARACTER_BIBLE,
    'Task: Generate a new illustration that places Gemie INTO the scene shown in the provided photo.',
    'Gemie should look like a natural part of the scene — interacting with the environment or objects.',
    `Scene context: ${memorySummary}.`,
    emotionTag ? `Gemie's emotion: ${emotionTag}.` : 'Gemie looks happy and curious.',
    'If the scene contains food or drinks, depict Gemie joyfully eating or tasting them with a satisfied expression.',
    'If the scene contains scenery or landmarks, depict Gemie exploring or admiring the view.',
    'If the scene contains objects or items, depict Gemie curiously examining or playfully interacting with them.',
    'Style: warm, cute 2D illustration. Blend Gemie seamlessly with the photo atmosphere.',
    'Output a single cohesive image combining the original scene and Gemie.',
  ].join(' ');
