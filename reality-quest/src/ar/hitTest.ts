import * as THREE from 'three';

export const setupHitTest = async (
  session: XRSession,
  refSpace: XRReferenceSpace,
): Promise<XRHitTestSource> => {
  if (!session.requestHitTestSource) {
    throw new Error('この環境は requestHitTestSource をサポートしていません');
  }
  const hitTestSource = await session.requestHitTestSource({ space: refSpace });
  if (!hitTestSource) throw new Error('XRHitTestSource の取得に失敗しました');
  return hitTestSource;
};

export const getHitTestResult = (
  frame: XRFrame,
  hitTestSource: XRHitTestSource,
  refSpace: XRReferenceSpace,
): THREE.Matrix4 | null => {
  const results = frame.getHitTestResults(hitTestSource);
  if (results.length === 0) return null;
  const pose = results[0]?.getPose(refSpace);
  if (!pose) return null;
  return new THREE.Matrix4().fromArray(pose.transform.matrix);
};

export const createReticle = (): THREE.Mesh => {
  const geometry = new THREE.TorusGeometry(0.15, 0.01, 16, 100);
  const material = new THREE.MeshBasicMaterial({ color: 0xa78bfa });
  const reticle = new THREE.Mesh(geometry, material);
  reticle.rotateX(-Math.PI / 2);
  reticle.visible = false;
  return reticle;
};
