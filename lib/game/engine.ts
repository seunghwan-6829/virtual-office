import { Worker, Position, BG_WIDTH, BG_HEIGHT, CHAR_HEIGHT } from '../types';
import {
  preloadAssets, getImage, drawCharacterSprite,
  drawCharacterLabel, drawSpeechBubble, drawProgressBar, drawReportWaiting,
} from './sprites';
import { updateCharacterMovement, isPathComplete } from './character';

export interface EngineCallbacks {
  onWorkerClick: (workerId: string) => void;
  onManagerClick: () => void;
  onWaitingWorkerClick: (workerId: string) => void;
  getWorkers: () => Worker[];
  updateWorker: (id: string, updates: Partial<Worker>) => void;
  onWorkerArriveAtCEO: (workerId: string) => void;
  onWorkerReturnToDesk: (workerId: string) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  private rafId = 0;
  private lastTime = 0;
  private running = false;
  private loaded = false;
  private clock = 0;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.cb = cb;
    this.canvas.width = BG_WIDTH;
    this.canvas.height = BG_HEIGHT;
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.addEventListener('click', this.onClick);
    this.canvas.addEventListener('mousemove', this.onMove);
  }

  async init() {
    const ctx = this.ctx;
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, BG_WIDTH, BG_HEIGHT);
    ctx.fillStyle = '#666';
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('사무실 로딩 중...', BG_WIDTH / 2, BG_HEIGHT / 2);
    await preloadAssets();
    this.loaded = true;
  }

  start() {
    if (this.running || !this.loaded) return;
    this.running = true;
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  destroy() {
    this.stop();
    this.canvas.removeEventListener('click', this.onClick);
    this.canvas.removeEventListener('mousemove', this.onMove);
  }

  /* ---- loop ---- */

  private tick = (t: number) => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);
    const dt = Math.min((t - this.lastTime) / 1000, 0.05);
    this.lastTime = t;
    this.clock += dt;
    this.update(dt);
    this.render();
  };

  private update(dt: number) {
    const workers = this.cb.getWorkers();
    for (const w of workers) {
      if (w.state !== 'walkingToCEO' && w.state !== 'walkingBack') continue;
      const next = updateCharacterMovement(w, dt);
      this.cb.updateWorker(w.id, {
        position: next.position,
        pathIndex: next.pathIndex,
        direction: next.direction,
        animTimer: next.animTimer,
      });
      if (isPathComplete(next)) {
        if (w.state === 'walkingToCEO') this.cb.onWorkerArriveAtCEO(w.id);
        else this.cb.onWorkerReturnToDesk(w.id);
      }
    }
  }

  private render() {
    const ctx = this.ctx;

    const bg = getImage('/sprites/bg/bg.png');
    if (bg) ctx.drawImage(bg, 0, 0, BG_WIDTH, BG_HEIGHT);

    const workers = this.cb.getWorkers();
    const sorted = [...workers].sort((a, b) => a.position.y - b.position.y);

    for (const w of sorted) {
      const walking = w.state === 'walkingToCEO' || w.state === 'walkingBack';
      const bob = walking ? Math.sin(w.animTimer * 9) * 4 : 0;

      drawCharacterSprite(ctx, w.charId, w.position.x, w.position.y, w.direction, CHAR_HEIGHT, bob);
      drawCharacterLabel(ctx, w.position.x, w.position.y, w.name, w.title, CHAR_HEIGHT);

      if (w.state === 'working' && w.currentTask) {
        const elapsed = (Date.now() - w.currentTask.createdAt) / 1000;
        drawProgressBar(ctx, w.position.x, w.position.y, Math.min(elapsed / 20, 0.95), CHAR_HEIGHT);
      }

      if (w.state === 'waitingAtCEO') {
        drawReportWaiting(ctx, w.position.x, w.position.y, this.clock, CHAR_HEIGHT);
      }

      if (w.isManager && w.state === 'idle') {
        drawSpeechBubble(ctx, w.position.x, w.position.y, '📊 관리자', CHAR_HEIGHT);
      }
    }
  }

  /* ---- input ---- */

  private canvasXY(e: MouseEvent): Position {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (this.canvas.width / r.width),
      y: (e.clientY - r.top) * (this.canvas.height / r.height),
    };
  }

  private hitTest(cx: number, cy: number): Worker | null {
    const workers = this.cb.getWorkers();
    const sorted = [...workers].sort((a, b) => b.position.y - a.position.y);
    const hr = CHAR_HEIGHT * 0.5;
    for (const w of sorted) {
      if (Math.abs(cx - w.position.x) < hr && Math.abs(cy - (w.position.y - CHAR_HEIGHT * 0.4)) < hr) {
        return w;
      }
    }
    return null;
  }

  private onMove = (e: MouseEvent) => {
    const { x, y } = this.canvasXY(e);
    const w = this.hitTest(x, y);
    this.canvas.style.cursor =
      w && (w.state === 'idle' || w.state === 'waitingAtCEO' || w.isManager)
        ? 'pointer'
        : 'default';
  };

  private onClick = (e: MouseEvent) => {
    const { x, y } = this.canvasXY(e);
    const w = this.hitTest(x, y);
    if (!w) return;
    if (w.isManager) this.cb.onManagerClick();
    else if (w.state === 'idle') this.cb.onWorkerClick(w.id);
    else if (w.state === 'waitingAtCEO') this.cb.onWaitingWorkerClick(w.id);
  };
}
