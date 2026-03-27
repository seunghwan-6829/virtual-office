'use client';

import { useEffect, useRef } from 'react';
import { GameEngine } from '@/lib/game/engine';
import { useOfficeStore } from '@/lib/store';
import { BG_WIDTH, BG_HEIGHT, Worker, WorkerState } from '@/lib/types';

export default function OfficeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, {
      onWorkerClick: (id: string) => {
        const s = useOfficeStore.getState();
        const proj = s.currentFloor === 1 ? s.project : s.floor2Project;
        if (proj && proj.status !== 'idle' && proj.status !== 'completed') {
          s.setWorkerPeek(id);
        } else {
          s.openTaskModal(id);
        }
      },
      onManagerClick: (id: string) => {
        const s = useOfficeStore.getState();
        const proj = s.currentFloor === 1 ? s.project : s.floor2Project;
        if (proj && proj.status !== 'idle' && proj.status !== 'completed') {
          s.setWorkerPeek(id);
        } else {
          s.openManagerModal(id);
        }
      },
      onWaitingWorkerClick: (id: string) => useOfficeStore.getState().workerStartReport(id),
      getWorkers: () => useOfficeStore.getState().workers,
      getFloor: () => useOfficeStore.getState().currentFloor,
      updateWorker: (id: string, u: Partial<Worker>) => useOfficeStore.getState().updateWorker(id, u),
      onWorkerArriveAtCEO: (id: string) => useOfficeStore.getState().workerArriveAtCEO(id),
      onWorkerReturnToDesk: (id: string) => useOfficeStore.getState().workerReturnToDesk(id),
      onWorkerArriveAtColleague: (id: string) => {
        const s = useOfficeStore.getState();
        s.updateWorker(id, { state: 'discussing' as WorkerState });
      },
      getSpeechBubbles: () => {
        const s = useOfficeStore.getState();
        s.clearExpiredBubbles();
        return s.speechBubbles.filter(b => b.expiresAt > Date.now());
      },
    });

    engineRef.current = engine;
    engine.init().then(() => engine.start());
    return () => engine.destroy();
  }, []);

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <canvas
        ref={canvasRef}
        className="border-2 border-gray-700 rounded-lg shadow-2xl cursor-pointer"
        style={{
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 140px)',
          aspectRatio: `${BG_WIDTH} / ${BG_HEIGHT}`,
        }}
      />
    </div>
  );
}
