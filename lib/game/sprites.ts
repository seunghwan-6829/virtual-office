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

/* ---- label height constant for positioning overlays above ---- */
const LABEL_TOTAL_H = 66;
const LABEL_GAP_BELOW = 8;
export const LABEL_TOP_OFFSET = LABEL_TOTAL_H + LABEL_GAP_BELOW;

export function drawCharacterLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  name: string, title: string,
  charHeight: number = CHAR_HEIGHT,
) {
  ctx.save();

  const titleFont = 'bold 18px sans-serif';
  const nameFont = 'bold 24px sans-serif';
  const gap = 4;

  ctx.font = titleFont;
  const titleW = ctx.measureText(title).width;
  ctx.font = nameFont;
  const nameW = ctx.measureText(name).width;
  const maxW = Math.max(titleW, nameW) + 20;

  const titleH = 24;
  const nameH = 30;
  const totalH = titleH + gap + nameH;
  const bx = x - maxW / 2;
  const by = y - charHeight - totalH - LABEL_GAP_BELOW;

  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.beginPath();
  ctx.roundRect(bx, by, maxW, totalH, 7);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = titleFont;
  ctx.fillStyle = '#9ca3af';
  ctx.fillText(title, x, by + titleH / 2);

  ctx.font = nameFont;
  ctx.fillStyle = '#fff';
  ctx.fillText(name, x, by + titleH + gap + nameH / 2);

  ctx.restore();
}

export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  text: string,
  charHeight: number = CHAR_HEIGHT,
) {
  ctx.save();
  ctx.font = 'bold 20px sans-serif';
  const metrics = ctx.measureText(text);
  const bw = metrics.width + 26;
  const bh = 36;
  const bx = x - bw / 2;
  const by = y - charHeight - LABEL_TOP_OFFSET - bh - 14;

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
  ctx.font = 'bold 22px sans-serif';
  const tw = ctx.measureText(text).width + 28;
  const bh = 40;
  const bx = x - tw / 2;
  const by = y - charHeight - LABEL_TOP_OFFSET - bh - 16;

  const pulse = 0.85 + Math.sin(timer * 3) * 0.15;
  ctx.globalAlpha = pulse;

  ctx.fillStyle = '#fffbe6';
  ctx.shadowColor = 'rgba(251,191,36,0.5)';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.roundRect(bx, by, tw, bh, 10);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, tw, bh, 10);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 7, by + bh);
  ctx.lineTo(x, by + bh + 12);
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
  const barW = 100;
  const barH = 14;
  const bx = x - barW / 2;
  const by = y - charHeight - LABEL_TOP_OFFSET - barH - 16;

  ctx.save();

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.roundRect(bx - 3, by - 3, barW + 6, barH + 6, 5);
  ctx.fill();

  ctx.fillStyle = '#374151';
  ctx.beginPath();
  ctx.roundRect(bx, by, barW, barH, 3);
  ctx.fill();

  const grd = ctx.createLinearGradient(bx, 0, bx + barW, 0);
  grd.addColorStop(0, '#22c55e');
  grd.addColorStop(1, '#4ade80');
  ctx.fillStyle = grd;
  const fillW = barW * Math.min(progress, 1);
  if (fillW > 0) {
    ctx.beginPath();
    ctx.roundRect(bx, by, fillW, barH, 3);
    ctx.fill();
  }

  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(progress * 100)}%`, x, by + barH / 2);

  ctx.restore();
}
