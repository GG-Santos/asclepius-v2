"use client";

import {
  Bounds,
  Center,
  Environment,
  Html,
  OrbitControls,
  useBounds,
  useGLTF,
} from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";

export type Hotspot = { position: [number, number, number]; label: string };

type ControlsLike = { target: THREE.Vector3; update: () => void };

function Loader() {
  return (
    <Html center>
      <div className="whitespace-nowrap rounded-md bg-card px-3 py-1.5 text-xs text-on-surface-variant shadow-[var(--shadow-clinical-md)]">
        Loading…
      </div>
    </Html>
  );
}

function ModelParts({
  url,
  explode,
  hotspots,
}: {
  url: string;
  explode: number;
  hotspots: Hotspot[];
}) {
  const { scene } = useGLTF(url);

  // Each part gets an outward "explode" direction from the model center.
  const { parts, radius } = useMemo(() => {
    // Descend single-child wrapper groups to the node that actually holds parts.
    let root: THREE.Object3D = scene;
    while (root.children.length === 1 && root.children[0].children.length > 0) {
      root = root.children[0];
    }
    root.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const box = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3()).applyMatrix4(inv);
    const r = box.getBoundingSphere(new THREE.Sphere()).radius || 1;
    const list = root.children.map((child) => {
      const c = new THREE.Box3()
        .setFromObject(child)
        .getCenter(new THREE.Vector3())
        .applyMatrix4(inv); // child centre in `root` local space
      const dir = c.sub(center);
      if (dir.lengthSq() < 1e-6) dir.set(0, 0, 0);
      else dir.normalize();
      return { obj: child, orig: child.position.clone(), dir };
    });
    return { parts: list, radius: r };
  }, [scene]);

  // Animate parts to their exploded offset whenever the slider changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: parts/radius are stable per loaded scene
  useEffect(() => {
    for (const p of parts) {
      const t = p.orig
        .clone()
        .add(p.dir.clone().multiplyScalar(explode * radius * 0.6));
      gsap.to(p.obj.position, {
        x: t.x,
        y: t.y,
        z: t.z,
        duration: 0.5,
        ease: "power2.out",
        overwrite: true,
      });
    }
  }, [explode]);

  return (
    <group>
      <primitive object={scene} />
      {hotspots.map((h) => (
        <Html
          key={`${h.label}-${h.position.join(",")}`}
          position={h.position}
          center
          distanceFactor={8}
        >
          <div className="pointer-events-none whitespace-nowrap rounded-full border border-outline-variant/60 bg-card/95 px-2 py-0.5 text-[11px] font-medium text-on-surface shadow-[var(--shadow-clinical-md)]">
            {h.label}
          </div>
        </Html>
      ))}
    </group>
  );
}

// Reset button only. On initial load we do nothing — Bounds `observe` already
// frames the model. On a reset click we snap the camera back to the front axis,
// recenter the orbit target, then let Bounds re-fit the distance.
function FitOnReset({ resetSignal }: { resetSignal: number }) {
  const bounds = useBounds();
  const { camera, controls } = useThree();
  // biome-ignore lint/correctness/useExhaustiveDependencies: refit only when resetSignal changes
  useEffect(() => {
    if (resetSignal === 0) return; // never on first mount
    const c = controls as ControlsLike | null;
    const dist = camera.position.length() || 6;
    camera.position.set(0, 0, dist); // back to the front (+Z) view
    if (c) {
      c.target.set(0, 0, 0);
      c.update();
    }
    bounds.refresh().clip().fit();
  }, [resetSignal]);
  return null;
}

export default function ModelViewer({
  url,
  autoRotate = true,
  environment = "city",
  explode = 0,
  resetSignal = 0,
  hotspots = [],
}: {
  url: string;
  autoRotate?: boolean;
  environment?: string;
  explode?: number;
  resetSignal?: number;
  hotspots?: Hotspot[];
}) {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]} shadows>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
      <Suspense fallback={<Loader />}>
        {/* biome-ignore lint/suspicious/noExplicitAny: drei Environment preset is a wide string union */}
        <Environment preset={environment as any} />
        <Bounds fit clip observe margin={1.2}>
          <Center>
            <ModelParts url={url} explode={explode} hotspots={hotspots} />
          </Center>
          <FitOnReset resetSignal={resetSignal} />
        </Bounds>
      </Suspense>
      <OrbitControls
        makeDefault
        enableDamping
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
      />
    </Canvas>
  );
}
