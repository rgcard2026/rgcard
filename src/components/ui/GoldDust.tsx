'use client';

import * as React from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';

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

function Particles() {
  const group = React.useRef<THREE.Group>(null);
  const material = React.useRef<THREE.ShaderMaterial>(null);

  const geometry = React.useMemo(() => {
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
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    return g;
  }, []);

  const uniforms = React.useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio, 2) }
  }), []);

  useFrame((state, delta) => {
    if (material.current) material.current.uniforms.uTime.value += delta;
    if (group.current) {
      // Pointer parallax, eased.
      group.current.rotation.y += (state.pointer.x * 0.18 - group.current.rotation.y) * 0.04;
      group.current.rotation.x += (-state.pointer.y * 0.12 - group.current.rotation.x) * 0.04;
    }
  });

  return (
    <group ref={group}>
      <points geometry={geometry}>
        <shaderMaterial
          ref={material}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

export default function GoldDust() {
  return (
    <Canvas
      className="ui-auth-canvas"
      style={{ position: 'absolute', inset: 0 }}
      camera={{ position: [0, 0, 7], fov: 55 }}
      dpr={[1, 1.75]}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      eventPrefix="client"
    >
      <Particles />
    </Canvas>
  );
}
