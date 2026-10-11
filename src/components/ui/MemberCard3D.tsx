'use client';

import * as React from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { MotionValue } from 'framer-motion';
import { CARD_TEMPLATE, type CardRenderLayout, formatCardExpiry, membershipLabel } from '@/lib/card-layout';

type Props = {
  cardNumber: string;
  isVip?: boolean;
  membershipClass?: string | null;
  validUntil?: string | null;
  layout?: CardRenderLayout;
  onReady?: () => void;
  /** 0 → 1 scroll progress; flips the card from front (0) to back (1). */
  scrollProgress?: MotionValue<number>;
};

const CARD_W = 3.146;
const CARD_H = 2;
const CARD_R = 0.15;
const THICKNESS = 0.028;

type Ctx2D = CanvasRenderingContext2D & { letterSpacing?: string };

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
  const ctx = canvas.getContext('2d') as Ctx2D;
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
    ctx.letterSpacing = `${spacing}px`;
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

/** Back face: public/card-back.png (built by scripts/build-card-back.cjs) + the member number. */
async function drawBack(width: number, height: number, cardNumber: string) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d') as Ctx2D;
  const art = await loadImage('/card-back.png');
  ctx.drawImage(art, 0, 0, width, height);
  // Number inside the bottom-right gold frame (artwork coords: x 1070–1515, y 852–940 on 1573×1000).
  const sx = width / 1573;
  const sy = height / 1000;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(34 * sy)}px Arial, Helvetica, sans-serif`;
  ctx.letterSpacing = `${(2.4 * sx).toFixed(1)}px`;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,.4)';
  ctx.strokeText(`NO.${cardNumber}`, 1292 * sx, 896 * sy);
  ctx.fillStyle = '#f2c15f';
  ctx.fillText(`NO.${cardNumber}`, 1292 * sx, 896 * sy);
  return canvas;
}

function toTexture(canvas: HTMLCanvasElement, anisotropy: number) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

/** Interactive 3D membership card: drag to rotate, tap to flip, gentle pointer tilt. */
export default function MemberCard3D({ cardNumber, isVip, membershipClass, validUntil, layout, onReady, scrollProgress }: Props) {
  const host = React.useRef<HTMLDivElement | null>(null);
  const readyRef = React.useRef(onReady);
  readyRef.current = onReady;
  const progressRef = React.useRef(scrollProgress);
  progressRef.current = scrollProgress;

  React.useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.touchAction = 'pan-y';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xfff4dc, 1.2);
    key.position.set(3, 4, 5);
    scene.add(key);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.z = 6;

    const faces = faceGeometry();
    const edgeGeo = new THREE.ExtrudeGeometry(roundedRect(CARD_W, CARD_H, CARD_R), { depth: THICKNESS, bevelEnabled: false, curveSegments: 12 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xb8904a, metalness: 1, roughness: 0.32 });
    const frontMat = new THREE.MeshPhysicalMaterial({ transparent: true, alphaTest: 0.02, roughness: 0.42, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.2 });
    const backMat = new THREE.MeshPhysicalMaterial({ roughness: 0.45, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.25 });

    const card = new THREE.Group();
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.z = -THICKNESS / 2;
    const front = new THREE.Mesh(faces, frontMat);
    front.position.z = THICKNESS / 2 + 0.0008;
    const back = new THREE.Mesh(faces, backMat);
    back.position.z = -THICKNESS / 2 - 0.0008;
    back.rotation.y = Math.PI;
    card.add(edge, front, back);
    card.visible = false;
    scene.add(card);

    // Fit the card to the stage on any screen size.
    let fitScale = 1;
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      const viewW = viewH * camera.aspect;
      fitScale = Math.min((viewW * 0.8) / CARD_W, (viewH * 0.78) / CARD_H);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    // Interaction: drag rotates, tap flips, hover tilts.
    // The card always starts square to the viewer (rotation 0); scroll then drives the flip.
    const spin = { target: 0, current: 0, dragging: false, startX: 0, startTarget: 0, moved: 0 };
    const pointer = { x: 0, y: 0 };
    const canvas = renderer.domElement;
    const onDown = (e: PointerEvent) => {
      spin.dragging = true;
      spin.startX = e.clientX;
      spin.startTarget = spin.target;
      spin.moved = 0;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      if (!spin.dragging) return;
      const dx = e.clientX - spin.startX;
      spin.moved = Math.max(spin.moved, Math.abs(dx));
      spin.target = spin.startTarget + dx * 0.012;
    };
    const onUp = () => {
      if (!spin.dragging) return;
      spin.dragging = false;
      if (spin.moved < 6) spin.target = spin.startTarget + Math.PI;
      else spin.target = Math.round(spin.target / Math.PI) * Math.PI;
    };
    const onLeave = () => { pointer.x = 0; pointer.y = 0; };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', onLeave);

    const clock = new THREE.Clock();
    let intro = 0;
    let frame = 0;
    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      if (card.visible) {
        intro = Math.min(1, intro + delta * 0.9);
        const ease = 1 - Math.pow(1 - intro, 3);
        spin.current += (spin.target - spin.current) * (spin.dragging ? 0.35 : 0.08);
        // Scroll drives a full front → back flip; drag/tap add on top. At rest (p = 0 or 1) the card
        // is perfectly square; mid-flip it lifts slightly and leans back for depth.
        const p = Math.min(1, Math.max(0, progressRef.current?.get() ?? 0));
        const arc = Math.sin(p * Math.PI);
        const hover = spin.dragging ? 0 : 1;
        card.rotation.y = p * Math.PI + spin.current + pointer.x * 0.12 * hover;
        card.rotation.x = -pointer.y * 0.1 * hover - arc * 0.14;
        card.rotation.z = 0;
        card.position.y = Math.sin(t * 0.9) * 0.03 + (1 - ease) * -0.25 + arc * 0.1;
        card.scale.setScalar(fitScale * (0.92 + 0.08 * ease) * (1 - arc * 0.06));
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();

    const tpl = layout || CARD_TEMPLATE;
    const anisotropy = renderer.capabilities.getMaxAnisotropy();
    Promise.all([
      drawFront(tpl, cardNumber, membershipLabel(membershipClass, isVip), formatCardExpiry(validUntil)),
      drawBack(tpl.width, tpl.height, cardNumber)
    ]).then(([f, b]) => {
      if (disposed) return;
      frontMat.map = toTexture(f, anisotropy);
      backMat.map = toTexture(b, anisotropy);
      frontMat.needsUpdate = true;
      backMat.needsUpdate = true;
      card.visible = true;
      readyRef.current?.();
    }).catch(() => null);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      frontMat.map?.dispose();
      backMat.map?.dispose();
      [faces, edgeGeo].forEach((g) => g.dispose());
      [edgeMat, frontMat, backMat].forEach((m) => m.dispose());
      envMap.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [cardNumber, isVip, layout, membershipClass, validUntil]);

  return <div ref={host} style={{ position: 'absolute', inset: 0 }} />;
}
