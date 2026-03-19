import { Direction, CHAR_HEIGHT } from '../types';

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (imageCache.has(src)) { resolve(imageCache.get(src)!); return; }
    const img = new Image();
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

export function getImage(key: string): HTMLImageElement | undefined {
  return imageCache.get(key);
}

export async function preloadAssets(): Promise<void> {
  const p: Promise<HTMLImageElement>[] = [];
  p.push(loadImage('/sprites/bg/bg.png'));
  for (let i = 1; i <= 10; i++) {
    p.push(loadImage(`/sprites/characters/CH_${i}_Front.png`));
    p.push(loadImage(`/sprites/characters/CH_${i}_Left.png`));
    const back = i === 7 ? 'CH_7_Back7.png' : `CH_${i}_Back.png`;
    p.push(loadImage(`/sprites/characters/${back}`));
  }
  await Promise.all(p);
}

function getSpriteKey(charId: number, direction: Direction): { key: string; flip: boolean } {
  switch (direction) {
    case 'up':
      return { key: `/sprites/characters/CH_${charId}_Front.png`, flip: false };
    case 'down': {
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
  charId: number, x: number, y: number,
  direction: Direction, height: number = CHAR_HEIGHT, bobOffset: number = 0,
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

export function drawCharacterLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  name: string, title: string,
  charHeight: number = CHAR_HEIGHT,
) {
  ctx.save();

  const titleFont = 'bold 15px sans-serif';
  const nameFont = 'bold 20px sans-serif';
  const gap = 3;

  ctx.font = titleFont;
  const titleW = ctx.measureText(title).width;
  ctx.font = nameFont;
  const nameW = ctx.measureText(name).width;
  const maxW = Math.max(titleW, nameW) + 16;

  const totalH = 22 + gap + 26;
  const bx = x - maxW / 2;
  const by = y - charHeight - totalH - 6;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.roundRect(bx, by, maxW, totalH, 6);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = titleFont;
  ctx.fillStyle = '#aab';
  ctx.fillText(title, x, by + 11);

  ctx.font = nameFont;
  ctx.fillStyle = '#fff';
  ctx.fillText(name, x, by + 22 + gap + 13);

  ctx.restore();
}

export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  text: string,
  charHeight: number = CHAR_HEIGHT,
) {
  ctx.save();
  ctx.font = 'bold 18px sans-serif';
  const metrics = ctx.measureText(text);
  const bw = metrics.width + 22;
  const bh = 32;
  const bx = x - bw / 2;
  const by = y - charHeight - 90;

  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 8);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.moveTo(x - 6, by + bh);
  ctx.lineTo(x, by + bh + 10);
  ctx.lineTo(x + 6, by + bh);
  ctx.fill();

  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, by + bh / 2);
  ctx.restore();
}

export function drawReportWaiting(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  timer: number,
  charHeight: number = CHAR_HEIGHT,
) {
  ctx.save();
  const text = '💡 보고 대기';
  ctx.font = 'bold 20px sans-serif';
  const tw = ctx.measureText(text).width + 24;
  const bh = 36;
  const bx = x - tw / 2;
  const by = y - charHeight - 100;

  const pulse = 0.85 + Math.sin(timer * 3) * 0.15;
  ctx.globalAlpha = pulse;

  ctx.fillStyle = '#fffbe6';
  ctx.shadowColor = 'rgba(251,191,36,0.5)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(bx, by, tw, bh, 9);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bx, by, tw, bh, 9);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 7, by + bh);
  ctx.lineTo(x, by + bh + 11);
  ctx.lineTo(x + 7, by + bh);
  ctx.fillStyle = '#fffbe6';
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#92400e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, by + bh / 2);

  ctx.restore();
}

export function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  progress: number,
  charHeight: number = CHAR_HEIGHT,
) {
  const barW = 70;
  const barH = 9;
  const bx = x - barW / 2;
  const by = y - charHeight - 14;

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(bx - 2, by - 2, barW + 4, barH + 4, 4);
  ctx.fill();

  ctx.fillStyle = '#444';
  ctx.fillRect(bx, by, barW, barH);
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(bx, by, barW * Math.min(progress, 1), barH);
}
