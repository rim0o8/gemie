import type { CollectedGemie, JemieRequestCategory } from '../types';

// --- Category config ---

const categoryIconMap: Record<JemieRequestCategory, string> = {
  food: '🍔',
  scenery: '🏞️',
  object: '🎁',
  spot: '📍',
};

const categoryLabelMap: Record<JemieRequestCategory, string> = {
  food: 'FOOD',
  scenery: 'SCENERY',
  object: 'OBJECT',
  spot: 'SPOT',
};

const categoryCssClass: Record<JemieRequestCategory, string> = {
  food: 'cat-food',
  scenery: 'cat-scenery',
  object: 'cat-object',
  spot: 'cat-scenery',
};

// --- Quest panel ---

export const showRequestPanel = (
  title: string,
  description: string,
  category?: JemieRequestCategory,
): void => {
  const panel = document.getElementById('quest-panel');
  const titleEl = document.getElementById('quest-title');
  const descEl = document.getElementById('quest-description');
  const iconEl = document.getElementById('quest-category-icon');
  const badgeEl = document.getElementById('quest-category-badge');

  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = description;

  if (category) {
    if (iconEl) iconEl.textContent = categoryIconMap[category];
    if (badgeEl) {
      badgeEl.textContent = categoryLabelMap[category];
      badgeEl.className = `quest-category-badge ${categoryCssClass[category]}`;
    }
  } else {
    if (iconEl) iconEl.textContent = '✨';
    if (badgeEl) {
      badgeEl.textContent = '';
      badgeEl.className = 'quest-category-badge';
    }
  }

  if (panel) {
    panel.classList.remove('hidden');
    panel.classList.add('visible-quest');
    panel.addEventListener('animationend', () => panel.classList.remove('visible-quest'), {
      once: true,
    });
  }
};

export const hideRequestPanel = (): void => {
  const panel = document.getElementById('quest-panel');
  if (panel) {
    panel.classList.add('hidden');
    panel.classList.remove('visible-quest');
  }
};

// --- Status message ---

export const setStatusMessage = (message: string, type: 'normal' | 'success' | 'error'): void => {
  const el = document.getElementById('status-message');
  if (!el) return;
  el.textContent = message;
  el.className = 'visible';
  if (type === 'success') el.classList.add('success');
  if (type === 'error') el.classList.add('error');
};

export const clearStatusMessage = (): void => {
  const el = document.getElementById('status-message');
  if (!el) return;
  el.textContent = '';
  el.className = '';
};

// --- Loading spinner ---

export const showLoadingSpinner = (): void => {
  document.getElementById('loading-spinner')?.classList.add('visible');
};

export const hideLoadingSpinner = (): void => {
  document.getElementById('loading-spinner')?.classList.remove('visible');
};

// --- Capture button ---

export const setCaptureButtonEnabled = (enabled: boolean): void => {
  const btn = document.getElementById('capture-btn') as HTMLButtonElement | null;
  if (btn) btn.disabled = !enabled;
};

export const flashCaptureButton = (): void => {
  const btn = document.getElementById('capture-btn');
  if (!btn) return;
  btn.classList.add('capturing');
  btn.addEventListener('animationend', () => btn.classList.remove('capturing'), { once: true });
  try {
    navigator.vibrate(50);
  } catch {
    // vibrate not supported
  }
};

export const onCaptureClick = (handler: () => void): void => {
  document.getElementById('capture-btn')?.addEventListener('click', handler);
};

// --- Error banner ---

export const onRetryClick = (handler: () => void): void => {
  document.getElementById('retry-btn')?.addEventListener('click', handler);
};

export const onBackToMenuClick = (handler: () => void): void => {
  document.getElementById('back-menu-btn')?.addEventListener('click', handler);
  document.getElementById('ar-back-btn')?.addEventListener('click', handler);
};

export const showErrorBanner = (message: string): void => {
  const banner = document.getElementById('error-banner');
  const body = document.getElementById('error-message');
  if (!banner || !body) return;
  body.textContent = message;
  banner.classList.remove('hidden');
};

export const hideErrorBanner = (): void => {
  document.getElementById('error-banner')?.classList.add('hidden');
};

// --- Success/Failure feedback ---

export const triggerSuccessFlash = (): void => {
  const flash = document.getElementById('success-flash');
  if (!flash) return;
  flash.classList.remove('active');
  // Force reflow to restart animation
  void flash.offsetWidth;
  flash.classList.add('active');
  flash.addEventListener('animationend', () => flash.classList.remove('active'), { once: true });
  try {
    navigator.vibrate([50, 30, 100]);
  } catch {
    // vibrate not supported
  }
};

export const triggerFailureShake = (): void => {
  const panel = document.getElementById('quest-panel');
  if (!panel) return;
  panel.classList.remove('shake');
  void panel.offsetWidth;
  panel.classList.add('shake');
  panel.addEventListener('animationend', () => panel.classList.remove('shake'), { once: true });
  try {
    navigator.vibrate([30, 20, 30]);
  } catch {
    // vibrate not supported
  }
};

// --- Progress dots ---

export const updateProgress = (completedCount: number, totalCount: number): void => {
  const track = document.getElementById('progress-track');
  if (!track) return;
  track.innerHTML = '';
  for (let i = 0; i < totalCount; i++) {
    const dot = document.createElement('div');
    dot.className = 'progress-dot';
    if (i < completedCount) {
      dot.classList.add('completed');
    } else if (i === completedCount) {
      dot.classList.add('current');
    }
    track.appendChild(dot);
  }
};

// --- Memory Recall UI ---

export const showMemoryRecallOverlay = (): void => {
  document.getElementById('memory-recall-overlay')?.classList.add('visible');
};

export const hideMemoryRecallOverlay = (): void => {
  document.getElementById('memory-recall-overlay')?.classList.remove('visible');
};

export const setMemoryRecallImage = (dataUrl: string): void => {
  const img = document.getElementById('memory-recall-image') as HTMLImageElement | null;
  if (img) img.src = dataUrl;
};

export const setMemoryRecallCaption = (text: string): void => {
  const el = document.getElementById('memory-recall-caption');
  if (el) el.textContent = text;
};

export const setMemoryRecallLoading = (visible: boolean): void => {
  const el = document.getElementById('memory-recall-loading');
  if (!el) return;
  if (visible) {
    el.classList.add('visible');
  } else {
    el.classList.remove('visible');
  }
};

export const setMemoryRecallVoiceState = (isSpeaking: boolean, isListening: boolean): void => {
  const el = document.getElementById('memory-recall-voice-status');
  if (!el) return;
  if (isSpeaking) {
    el.textContent = 'gemie君が話しています...';
    el.className = 'recall-voice-status speaking';
  } else if (isListening) {
    el.textContent = '聞いています...話しかけてね';
    el.className = 'recall-voice-status listening';
  } else {
    el.textContent = '';
    el.className = 'recall-voice-status';
  }
};

export const onMemoryRecallClick = (handler: () => void): void => {
  document.getElementById('memory-recall-btn')?.addEventListener('click', handler);
};

export const onRecallCloseClick = (handler: () => void): void => {
  document.getElementById('recall-close-btn')?.addEventListener('click', handler);
};

// --- Gemie AR Avatar ---

export const setGemieAvatarImage = (url: string): void => {
  const img = document.getElementById('gemie-ar-avatar-img') as HTMLImageElement | null;
  if (!img) return;
  img.classList.add('fade');
  setTimeout(() => {
    img.src = url;
    img.onload = () => img.classList.remove('fade');
  }, 400);
};

export const showGemieAvatar = (): void => {
  document.getElementById('gemie-ar-avatar')?.classList.remove('hidden');
};

export const hideGemieAvatar = (): void => {
  document.getElementById('gemie-ar-avatar')?.classList.add('hidden');
};

// --- Gemie Collection (図鑑) ---

export const showGemieCollection = (): void => {
  document.getElementById('gemie-collection-overlay')?.classList.add('visible');
};

export const hideGemieCollection = (): void => {
  document.getElementById('gemie-collection-overlay')?.classList.remove('visible');
};

export const renderGemieCollection = (
  gemies: readonly CollectedGemie[],
  onItemClick: (gemie: CollectedGemie) => void,
): void => {
  const grid = document.getElementById('gemie-collection-grid');
  const empty = document.getElementById('gemie-collection-empty');
  if (!grid) return;

  grid.innerHTML = '';

  if (gemies.length === 0) {
    empty?.classList.add('visible');
    return;
  }

  empty?.classList.remove('visible');

  for (const gemie of gemies) {
    const item = document.createElement('div');
    item.className = 'gemie-collection-item';

    const img = document.createElement('img');
    img.src = gemie.imageUrl;
    img.alt = gemie.emotionTag;
    item.appendChild(img);

    const badge = document.createElement('span');
    badge.className = 'emotion-badge';
    badge.textContent = gemie.emotionTag;
    item.appendChild(badge);

    item.addEventListener('click', () => onItemClick(gemie));
    grid.appendChild(item);
  }
};

export const showGemieDetail = (gemie: CollectedGemie): void => {
  const modal = document.getElementById('gemie-detail-modal');
  const img = document.getElementById('gemie-detail-image') as HTMLImageElement | null;
  const emotion = document.getElementById('gemie-detail-emotion');
  const prompt = document.getElementById('gemie-detail-prompt');
  const date = document.getElementById('gemie-detail-date');

  if (img) img.src = gemie.imageUrl;
  if (emotion) emotion.textContent = gemie.emotionTag;
  if (prompt) prompt.textContent = gemie.requestPrompt;
  if (date) {
    const d = new Date(gemie.createdAt);
    date.textContent = d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  modal?.classList.add('visible');
};

export const hideGemieDetail = (): void => {
  document.getElementById('gemie-detail-modal')?.classList.remove('visible');
};

export const onGemieCollectionClick = (handler: () => void): void => {
  document.getElementById('gemie-collection-btn')?.addEventListener('click', handler);
};

export const onCollectionCloseClick = (handler: () => void): void => {
  document.getElementById('collection-close-btn')?.addEventListener('click', handler);
};

export const onGemieDetailCloseClick = (handler: () => void): void => {
  document.getElementById('gemie-detail-close-btn')?.addEventListener('click', handler);
  document.getElementById('gemie-detail-backdrop')?.addEventListener('click', handler);
};
