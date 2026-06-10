import * as THREE from "three";

/**
 * Render a one-frame WebP thumbnail of a model, in the browser, at upload time.
 * Used as the poster on cards and link previews. Returns null on failure.
 */
export async function renderModelPoster(
  source: THREE.Object3D,
  size = 640,
): Promise<Blob | null> {
  try {
    const object = source.clone(true);

    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getBoundingSphere(new THREE.Sphere()).radius || 1;
    object.position.sub(center); // center at origin

    const scene = new THREE.Scene();
    scene.add(object);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(5, 8, 5);
    scene.add(key);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, radius * 100);
    const dist = (radius / Math.sin((45 * Math.PI) / 180 / 2)) * 1.1;
    camera.position.set(dist * 0.6, dist * 0.5, dist);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(1);
    renderer.render(scene, camera);

    const blob = await new Promise<Blob | null>((resolve) =>
      renderer.domElement.toBlob((b) => resolve(b), "image/webp", 0.9),
    );
    renderer.dispose();
    return blob;
  } catch {
    return null;
  }
}
