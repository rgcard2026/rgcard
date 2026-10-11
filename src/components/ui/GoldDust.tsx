'use client';

import * as React from 'react';
import * as THREE from 'three';

const COUNT = 900;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aScale;
  attribute float aSpeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    // Slow upward drift that wraps, plus a gentle sideways sway.
    p.y = mod(p.y + uTime * aSpeed + 6.0, 12.0) - 6.0;
    p.x += sin(uTime * 0.3 + position.y * 1.7) * 0.18;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aScale * uPixelRatio * (18.0 / -mv.z);
    // Fade near the vertical edges so particles never pop in or out.
    vAlpha = smoothstep(6.0, 3.5, abs(p.y)) * (0.35 + 0.65 * aScale / 3.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float glow = smoothstep(0.5, 0.0, d);
    vec3 gold = mix(vec3(0.66, 0.50, 0.23), vec3(0.98, 0.88, 0.62), glow);
    gl_FragColor = vec4(gold, glow * glow * vAlpha);
  }
`;

/** Drifting gold particle field with pointer parallax (login brand panel). */
export default function GoldDust() {
  const host = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = host.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 50);
    camera.position.z = 7;

    const positions = new Float32Array(COUNT * 3);
    const scales = new Float32Array(COUNT);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      scales[i] = 0.4 + Math.random() * 2.6;
      speeds[i] = 0.05 + Math.random() * 0.22;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: renderer.getPixelRatio() } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const group = new THREE.Group();
    group.add(new THREE.Points(geometry, material));
    scene.add(group);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    const pointer = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const clock = new THREE.Clock();
    let frame = 0;
    const tick = () => {
      material.uniforms.uTime.value += clock.getDelta();
      group.rotation.y += (pointer.x * 0.18 - group.rotation.y) * 0.04;
      group.rotation.x += (-pointer.y * 0.12 - group.rotation.x) * 0.04;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointer);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="ui-auth-canvas" aria-hidden="true" />;
}
