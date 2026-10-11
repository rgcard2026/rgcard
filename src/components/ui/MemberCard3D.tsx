'use client';

import * as React from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { CARD_TEMPLATE, type CardRenderLayout, formatCardExpiry, membershipLabel } from '@/lib/card-layout';

type Props = {
  cardNumber: string;
  isVip?: boolean;
  membershipClass?: string | null;
  validUntil?: string | null;
  layout?: CardRenderLayout;
  onReady?: () => void;
};

const CARD_W = 3.146;
const CARD_H = 2;
const CARD_R = 0.15;
const THICKNESS = 0.028;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** ShapeGeometry with UVs normalised to the card rectangle so a texture fills it exactly. */
function faceGeometry() {
  const g = new THREE.ShapeGeometry(roundedRect(CARD_W, CARD_H, CARD_R), 12);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 1) {
    uv[i * 2] = (pos.getX(i) + CARD_W / 2) / CARD_W;
    uv[i * 2 + 1] = (pos.getY(i) + CARD_H / 2) / CARD_H;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Front face: the same artwork, QR and text positions as the 2D/PDF card. */
async function drawFront(tpl: CardRenderLayout, cardNumber: string, classText: string, expiryText: string) {
  const canvas = document.createElement('canvas');
  canvas.width = tpl.width;
  canvas.height = tpl.height;
  const ctx = canvas.getContext('2d')!;
  const [template, qr] = await Promise.all([
    loadImage(tpl.templateUrl || '/card-template.png'),
    loadImage('/api/member-card/qr').catch(() => null)
  ]);
  ctx.globalAlpha = tpl.templateOpacity ?? 1;
  ctx.drawImage(template, 0, 0, tpl.width, tpl.height);
  if (qr) {
    ctx.globalAlpha = tpl.qr.opacity ?? 1;
    ctx.drawImage(qr, tpl.qr.x, tpl.qr.y, tpl.qr.size, tpl.qr.size);
  }
  const text = (value: string, x: number, y: number, size: number, align: CanvasTextAlign, opacity = 1, spacing = 0) => {
    ctx.globalAlpha = opacity;
    ctx.font = `900 ${size}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${spacing}px`;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.strokeText(value, x, y);
    ctx.fillStyle = '#f2c15f';
    ctx.fillText(value, x, y);
  };
  text(`ID NO.${cardNumber}`, tpl.id.x + tpl.id.width / 2, tpl.id.y + tpl.id.height / 2, tpl.id.fontSize, 'center', tpl.id.opacity ?? 1, 2.4);
  if (classText) text(classText, tpl.membershipClass.x, tpl.membershipClass.y + tpl.membershipClass.height / 2, tpl.membershipClass.fontSize, 'left', tpl.membershipClass.opacity ?? 1);
  if (expiryText) text(expiryText, tpl.expiry.x, tpl.expiry.y + tpl.expiry.height / 2, tpl.expiry.fontSize, 'left', tpl.expiry.opacity ?? 1, 1.2);
  return canvas;
}

/** Back face: a quiet branded reverse with the emblem and member number. */
async function drawBack(width: number, height: number, cardNumber: string) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const bg = ctx.createRadialGradient(width * 0.5, height * 0.45, 40, width * 0.5, height * 0.5, width * 0.7);
  bg.addColorStop(0, '#1b1813');
  bg.addColorStop(1, '#060606');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Fine diagonal guilloche texture.
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#d8b26a';
  ctx.lineWidth = 1;
  for (let i = -height; i < width; i += 14) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Magnetic stripe.
  const stripe = ctx.createLinearGradient(0, 0, 0, 150);
  stripe.addColorStop(0, '#111');
  stripe.addColorStop(1, '#1d1d1d');
  ctx.fillStyle = stripe;
  ctx.fillRect(0, 110, width, 150);

  // Gold hairlines.
  const gold = ctx.createLinearGradient(0, 0, width, 0);
  gold.addColorStop(0, '#8a6528');
  gold.addColorStop(0.5, '#f2dba4');
  gold.addColorStop(1, '#8a6528');
  ctx.fillStyle = gold;
  ctx.fillRect(0, 300, width, 4);
  ctx.fillRect(0, height - 150, width, 3);

  const emblem = await loadImage('/brand/rg-emblem-gold.png').catch(() => null);
  if (emblem) {
    const ew = 520;
    const eh = (emblem.height / emblem.width) * ew;
    ctx.drawImage(emblem, (width - ew) / 2, 360, ew, eh);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d8b26a';
  ctx.font = '700 46px Arial, Helvetica, sans-serif';
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '10px';
  ctx.fillText(cardNumber, width / 2, height - 82);
  ctx.globalAlpha = 0.55;
  ctx.font = '600 22px Arial, Helvetica, sans-serif';
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '8px';
  ctx.fillText('ROYAL MEMBERSHIP · PERSONAL & NON-TRANSFERABLE', width / 2, height - 190);
  ctx.globalAlpha = 1;
  return canvas;
}

function toTexture(canvas: HTMLCanvasElement, maxAnisotropy: number) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAnisotropy;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

function Card({ front, back }: { front: THREE.Texture; back: THREE.Texture }) {
  const group = React.useRef<THREE.Group>(null);
  const spin = React.useRef({ target: 0, current: -0.9, dragging: false, startX: 0, startTarget: 0, moved: 0 });
  const intro = React.useRef(0);
  const { viewport, gl } = useThree();

  const faces = React.useMemo(() => faceGeometry(), []);
  const edge = React.useMemo(() => new THREE.ExtrudeGeometry(roundedRect(CARD_W, CARD_H, CARD_R), { depth: THICKNESS, bevelEnabled: false, curveSegments: 12 }), []);

  // Fit the card to the stage on any screen size.
  const scale = Math.min((viewport.width * 0.8) / CARD_W, (viewport.height * 0.78) / CARD_H);

  React.useEffect(() => {
    const el = gl.domElement;
    const s = spin.current;
    const down = (e: PointerEvent) => {
      s.dragging = true;
      s.startX = e.clientX;
      s.startTarget = s.target;
      s.moved = 0;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!s.dragging) return;
      const dx = e.clientX - s.startX;
      s.moved = Math.max(s.moved, Math.abs(dx));
      s.target = s.startTarget + dx * 0.012;
    };
    const up = () => {
      if (!s.dragging) return;
      s.dragging = false;
      // A tap flips the card; a drag snaps to the nearest face.
      if (s.moved < 6) s.target = s.startTarget + Math.PI;
      else s.target = Math.round(s.target / Math.PI) * Math.PI;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [gl]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const s = spin.current;
    intro.current = Math.min(1, intro.current + delta * 0.9);
    const ease = 1 - Math.pow(1 - intro.current, 3);
    s.current += (s.target - s.current) * (s.dragging ? 0.35 : 0.08);
    const t = state.clock.elapsedTime;
    const hoverX = s.dragging ? 0 : state.pointer.x * 0.22;
    const hoverY = s.dragging ? 0 : state.pointer.y * 0.16;
    g.rotation.y = s.current + hoverX;
    g.rotation.x = -hoverY + Math.sin(t * 0.8) * 0.025;
    g.rotation.z = Math.sin(t * 0.5) * 0.012;
    g.position.y = Math.sin(t * 0.9) * 0.05 + (1 - ease) * -0.4;
    g.scale.setScalar(scale * (0.86 + 0.14 * ease));
  });

  return (
    <group ref={group}>
      <mesh geometry={edge} position={[0, 0, -THICKNESS / 2]}>
        <meshStandardMaterial color="#b8904a" metalness={1} roughness={0.32} />
      </mesh>
      <mesh geometry={faces} position={[0, 0, THICKNESS / 2 + 0.0008]}>
        <meshPhysicalMaterial map={front} transparent alphaTest={0.02} roughness={0.42} metalness={0.15} clearcoat={1} clearcoatRoughness={0.2} />
      </mesh>
      <mesh geometry={faces} position={[0, 0, -THICKNESS / 2 - 0.0008]} rotation={[0, Math.PI, 0]}>
        <meshPhysicalMaterial map={back} roughness={0.45} metalness={0.2} clearcoat={1} clearcoatRoughness={0.25} />
      </mesh>
    </group>
  );
}

function Scene({ cardNumber, isVip, membershipClass, validUntil, layout, onReady }: Props) {
  const { gl } = useThree();
  const [textures, setTextures] = React.useState<{ front: THREE.Texture; back: THREE.Texture } | null>(null);

  React.useEffect(() => {
    let alive = true;
    const tpl = layout || CARD_TEMPLATE;
    const aniso = gl.capabilities.getMaxAnisotropy();
    Promise.all([
      drawFront(tpl, cardNumber, membershipLabel(membershipClass, isVip), formatCardExpiry(validUntil)),
      drawBack(tpl.width, tpl.height, cardNumber)
    ]).then(([f, b]) => {
      if (!alive) return;
      setTextures({ front: toTexture(f, aniso), back: toTexture(b, aniso) });
      onReady?.();
    }).catch(() => null);
    return () => { alive = false; };
  }, [cardNumber, gl, isVip, layout, membershipClass, onReady, validUntil]);

  React.useEffect(() => () => {
    textures?.front.dispose();
    textures?.back.dispose();
  }, [textures]);

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.2} />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2.4} position={[0, 3, 4]} scale={[8, 1.2, 1]} color="#fff4dc" />
        <Lightformer intensity={1.2} position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} color="#d8b26a" />
        <Lightformer intensity={1.2} position={[5, -1, 2]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} color="#ffffff" />
        <Lightformer intensity={0.6} position={[0, -4, 3]} scale={[10, 1, 1]} color="#8a6a32" />
      </Environment>
      {textures && <Card front={textures.front} back={textures.back} />}
    </>
  );
}

export default function MemberCard3D(props: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 32 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
