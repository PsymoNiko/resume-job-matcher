import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PipelineStage } from '../types';

interface Journey3DProps {
  currentStage: PipelineStage;
  onSelectStage: (stage: PipelineStage) => void;
}

const stages: Array<{ stage: PipelineStage; label: string; short: string }> = [
  { stage: 1, label: 'Upload', short: '01' },
  { stage: 2, label: 'Understand', short: '02' },
  { stage: 3, label: 'Match', short: '03' },
  { stage: 4, label: 'Generate', short: '04' },
];

export const Journey3D: React.FC<Journey3DProps> = ({ currentStage, onSelectStage }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef(currentStage);

  useEffect(() => {
    stageRef.current = currentStage;
  }, [currentStage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.2, 9);

    const group = new THREE.Group();
    scene.add(group);
    scene.add(new THREE.AmbientLight(0xffffff, 2.2));
    const keyLight = new THREE.PointLight(0x8b5cf6, 18, 14);
    keyLight.position.set(2, 3, 5);
    scene.add(keyLight);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.05, 2),
      new THREE.MeshStandardMaterial({
        color: 0x7c3aed,
        emissive: 0x4c1d95,
        emissiveIntensity: 0.7,
        roughness: 0.28,
        metalness: 0.35,
      }),
    );
    group.add(core);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.025, 12, 96),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.8 }),
    );
    ring.rotation.x = Math.PI / 2.4;
    group.add(ring);

    const orbiters = stages.map((item, index) => {
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshBasicMaterial({ color: index + 1 <= currentStage ? 0x22d3ee : 0xc4b5fd }),
      );
      group.add(node);
      return node;
    });

    const resize = () => {
      const width = canvas.clientWidth || 640;
      const height = canvas.clientHeight || 300;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const time = performance.now() * 0.0006;
      const active = stageRef.current;
      core.rotation.x = time * 0.6;
      core.rotation.y = time;
      ring.rotation.z = -time * 0.8;
      group.position.y = Math.sin(time * 2) * 0.08;
      orbiters.forEach((node, index) => {
        const angle = time + (index / orbiters.length) * Math.PI * 2;
        node.position.set(Math.cos(angle) * 2.05, Math.sin(angle * 1.2) * 0.65, Math.sin(angle) * 0.4);
        const isActive = index + 1 === active;
        node.scale.setScalar(isActive ? 1.9 : 1);
        (node.material as THREE.MeshBasicMaterial).color.setHex(index + 1 <= active ? 0x22d3ee : 0xc4b5fd);
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
    };
  }, []);

  return (
    <section className="journey-3d dashboard-card mb-6 overflow-hidden rounded-2xl p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-600">Your career journey</p>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Upload <span className="text-violet-600">→</span> Understand <span className="text-violet-600">→</span> Improve
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
            Move through each step at your own pace. Your resume stays editable and every AI suggestion remains under your control.
          </p>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {stages.map((item) => (
              <button
                key={item.stage}
                type="button"
                onClick={() => onSelectStage(item.stage)}
                className={`journey-step shrink-0 rounded-xl border px-3 py-2 text-left ${
                  currentStage === item.stage
                    ? 'border-violet-300 bg-violet-50 text-violet-700'
                    : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                <span className="block text-[10px] font-mono opacity-60">{item.short}</span>
                <span className="text-xs font-semibold">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="journey-canvas-wrap relative h-52 w-full shrink-0 sm:h-64 lg:h-72 lg:w-[44%]">
          <canvas ref={canvasRef} className="h-full w-full" aria-label="Interactive 3D career journey" />
          <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[10px] uppercase tracking-[0.18em] text-gray-400">
            Step {currentStage} of 4 · interactive workspace
          </div>
        </div>
      </div>
    </section>
  );
};
