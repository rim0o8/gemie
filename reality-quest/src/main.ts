import * as THREE from 'three';
import { createServices } from './app/bootstrap';
import { createGameRuntime } from './app/gameLoop';
import { createARContext, initAR } from './app/arInit';
import { wireUI, wireMemoryRecall, wireGemieCollection } from './app/eventHandlers';

const arOverlay = document.getElementById('ar-overlay') as HTMLElement;
const hitPositionRef = new THREE.Vector3(0, -0.3, -1.5);

const services = createServices(import.meta.env);
const arContext = createARContext(arOverlay);
const runtime = createGameRuntime(services, arContext.scene, hitPositionRef);

// BGM setup — starts on first user interaction to comply with autoplay policy
const bgm = new Audio('/Glimmering_Hoard.mp3');
bgm.loop = true;
bgm.volume = 0.3;
document.addEventListener('click', () => bgm.play().catch(() => {}), { once: true });

// Duck BGM volume when gemie is speaking
const BGM_VOLUME_NORMAL = 0.3;
const BGM_VOLUME_DUCKED = 0.08;
const duckBgm = (speaking: boolean): void => {
  bgm.volume = speaking ? BGM_VOLUME_DUCKED : BGM_VOLUME_NORMAL;
};

await initAR(arContext, runtime, hitPositionRef);
wireUI(runtime);
wireMemoryRecall(runtime, services);
wireGemieCollection(runtime);
runtime.moveToMenu();

// Observe conversation state changes to duck BGM
let wasSpeaking = false;
const pollSpeaking = (): void => {
  const speaking = runtime.getState().conversation.isSpeaking;
  if (speaking !== wasSpeaking) {
    duckBgm(speaking);
    wasSpeaking = speaking;
  }
  requestAnimationFrame(pollSpeaking);
};
pollSpeaking();
