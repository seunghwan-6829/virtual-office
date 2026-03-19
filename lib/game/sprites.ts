import { Direction, CHAR_HEIGHT } from '../types';

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (imageCache.has(src)) {
      resolve(imageCache.get(src)!);
      return;
    }
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

export function getImage(key: string): HTMLImageElement | undefined {
  return imageCache.get(key);
}

export async function preloadAssets(): Promise<void> {
  const promises: Promise<HTMLImageElement>[] = [];
  promises.push(loadImage('/sprites/bg/bg.png'));
  for (let i = 1; i <= 10; i++) {
    promises.push(loadImage(`/sprites/characters/CH_${i}_Front.png`));
    promises.push(loadImage(`/sprites/characters/CH_${i}_Left.png`));
    const backFile = i === 7 ? 'CH_7_Back7.png' : `CH_${i}_Back.png`;
    promises.push(loadImage(`/sprites/characters/${backFile}`));
  }
  await Promise.all(promises);
}

function getSpriteKey(charId: number, direction: Direction): { key: string; flip: boolean } {
  switch (direction) {
    case 'down':
      return { key: `/sprites/characters/CH_${charId}_Front.png`, flip: false };
    case 'up': {
      const back = charId === 7 ? 'CH_7_Back7.png' : `CH_${charId}_Back.png`;
      return { key: `/sprites/characters/${back}`, flip: false };
    }
    case 'left':
      return { key: `/sprites/characters/CH_${charId}_Left.png`, flip: false };
    case 'right':
      return { key: `/sprites/characters/CH_${charId}_Left.png`, flip: true };
  }
}

export function drawCharacterSprite(
  ctx: CanvasRenderingContext2D,
  charId: number,
  x: number,
  y: number,
  direction: Direction,
  height: number = CHAR_HEIGHT,
  bobOffset: number = 0,
) {
  const { key, flip } = getSpriteKey(charId, direction);
  const img = imageCache.get(key);
  if (!img) return;

  const aspect = img.width / img.height;
  const w = height * aspect;
  const h = height;

  ctx.save();
  if (flip) {
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, y - h + bobOffset, w, h);
  } else {
    ctx.drawImage(img, x - w / 2, y - h + bobOffset, w, h);
  }
  ctx.restore();
}

export function drawNameTag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  charHeight: number = CHAR_HEIGHT,
) {
  ctx.save();
  ctx.font = 'bold 18px sans-serif';
  const metrics = ctx.measureText(name);
  const tw = metrics.width + 14;
  const th = 24;
  const tx = x - tw / 2;
  const ty = y - charHeight - 16;

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.roundRect(tx, ty, tw, th, 5);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, x, ty + th / 2);
  ctx.restore();
}

export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  charHeight: number = CHAR_HEIGHT,
) {
  ctx.save();
  ctx.font = 'bold 16px sans-serif';
  const metrics = ctx.measureText(text);
  const bw = metrics.width + 18;
  const bh = 28;
  const bx = x - bw / 2;
  const by = y - charHeight - 48;

  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 7);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.moveTo(x - 6, by + bh);
  ctx.lineTo(x, by + bh + 9);
  ctx.lineTo(x + 6, by + bh);
  ctx.fill();

  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, by + bh / 2);
  ctx.restore();
}

export function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  charHeight: number = CHAR_HEIGHT,
) {
  const barW = 64;
  const barH = 8;
  const bx = x - barW / 2;
  const by = y - charHeight - 12;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(bx - 2, by - 2, barW + 4, barH + 4, 4);
  ctx.fill();

  ctx.fillStyle = '#444';
  ctx.fillRect(bx, by, barW, barH);
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(bx, by, barW * Math.min(progress, 1), barH);
}

export function drawWaitingDots(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  timer: number,
  charHeight: number = CHAR_HEIGHT,
) {
  const count = 3;
  const active = Math.floor(timer * 2.5) % count;
  const by = y - charHeight - 8;
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = i === active ? '#fbbf24' : 'rgba(251,191,36,0.25)';
    ctx.beginPath();
    ctx.arc(x - 10 + i * 10, by, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
