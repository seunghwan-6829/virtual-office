'use client';

import { ReactNode } from 'react';
import { Worker, getCharColor } from '@/lib/types';

interface Props {
  worker: Worker;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export default function ModalShell({ worker, onClose, children, wide }: Props) {
  const color = getCharColor(worker.charId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl mx-4 overflow-hidden flex flex-col ${wide ? 'w-full max-w-6xl max-h-[92vh]' : 'w-full max-w-md max-h-[85vh]'}`}>
        <div className="p-4 border-b border-gray-700 flex items-center gap-3 flex-shrink-0">
          <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border-2"
            style={{ borderColor: color }}>
            <img
              src={`/sprites/characters/CH_${worker.charId}_Front.png`}
              alt={worker.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-sm">{worker.name}</h3>
            <p className="text-gray-400 text-xs truncate">{worker.title} · {worker.role}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors flex-shrink-0 text-lg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
