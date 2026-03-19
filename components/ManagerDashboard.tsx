'use client';

import { useState } from 'react';
import { useOfficeStore } from '@/lib/store';
import { getCharColor } from '@/lib/types';
import { loadTaskRecords, getAllRecordsAsCSV, getAllRecordsAsJSON } from '@/lib/storage';

type Tab = 'overview' | 'workers' | 'history' | 'export';

export default function ManagerDashboard() {
  const modal = useOfficeStore(s => s.modal);
  const workers = useOfficeStore(s => s.workers);
  const managerLogs = useOfficeStore(s => s.managerLogs);
  const closeModal = useOfficeStore(s => s.closeModal);
  const [tab, setTab] = useState<Tab>('overview');

  if (modal.type !== 'manager') return null;

  const clickedPerson = modal.workerId ? workers.find(w => w.id === modal.workerId) : null;
  const displayPerson = clickedPerson ?? workers.find(w => w.roleKey === 'manager' && !w.isManager);
  const regularWorkers = workers.filter(w => !w.isManager && w.roleKey !== 'manager');
  const allRecords = loadTaskRecords();
  const completed = managerLogs.length;
  const working = workers.filter(w => w.state === 'working').length;
  const waiting = workers.filter(w => w.state === 'waitingAtCEO').length;
  const avgDuration = completed > 0 ? Math.round(managerLogs.reduce((s, l) => s + l.durationMs, 0) / completed / 1000) : 0;

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center gap-3 flex-shrink-0">
          {displayPerson && (
            <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border-2"
              style={{ borderColor: getCharColor(displayPerson.charId) }}>
              <img src={`/sprites/characters/CH_${displayPerson.charId}_Front.png`} alt={displayPerson.name}
                className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-white font-bold">{displayPerson?.name ?? '관리자'} <span className="text-gray-500 font-normal">{displayPerson?.title ?? '관리자'}</span></h3>
            <p className="text-gray-400 text-xs">{displayPerson?.isManager ? '전체 총괄 · 보고 확인' : '프로세스 관리 · 데이터 분석'}</p>
          </div>
          <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 flex-shrink-0">
          {([['overview', '📊 개요'], ['workers', '👥 직원별'], ['history', '📋 히스토리'], ['export', '💾 내보내기']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${tab === t ? 'text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{completed}</div>
                  <div className="text-xs text-gray-500">완료 업무</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">{working}</div>
                  <div className="text-xs text-gray-500">작업 중</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{waiting}</div>
                  <div className="text-xs text-gray-500">보고 대기</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{avgDuration}s</div>
                  <div className="text-xs text-gray-500">평균 소요</div>
                </div>
              </div>
              {waiting > 3 && <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 text-xs text-amber-300">⚠️ CEO 보고 대기 인원이 많습니다. 보고를 확인해주세요.</div>}
              {avgDuration > 60 && <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 text-xs text-red-300">⚠️ 평균 업무 소요시간이 깁니다. 업무 난이도를 확인해주세요.</div>}
            </div>
          )}

          {tab === 'workers' && (
            <div className="space-y-3">
              {regularWorkers.map(w => {
                const wLogs = managerLogs.filter(l => l.workerId === w.id);
                const wRecords = allRecords.filter(r => r.workerId === w.id);
                const wAvg = wLogs.length > 0 ? Math.round(wLogs.reduce((s, l) => s + l.durationMs, 0) / wLogs.length / 1000) : 0;
                return (
                  <div key={w.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border-2"
                      style={{ borderColor: getCharColor(w.charId) }}>
                      <img src={`/sprites/characters/CH_${w.charId}_Front.png`} alt={w.name}
                        className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium">{w.name} <span className="text-gray-500 text-xs">{w.title}</span></div>
                      <div className="text-xs text-gray-500">{w.state === 'idle' ? '대기 중' : w.state}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-blue-400">{wLogs.length + wRecords.length}</div>
                      <div className="text-xs text-gray-500">{wAvg > 0 ? `평균 ${wAvg}s` : '-'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-2">
              {managerLogs.length === 0 && allRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-600 text-sm">아직 기록이 없습니다</div>
              ) : (
                [...managerLogs].reverse().slice(0, 30).map(log => (
                  <div key={log.id} className="bg-gray-800 rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs font-medium">{log.workerName}</span>
                      <span className="text-gray-500 text-xs">{new Date(log.timestamp).toLocaleString('ko-KR')}</span>
                    </div>
                    <p className="text-gray-400 text-xs truncate">{log.taskInstruction}</p>
                    <p className="text-gray-500 text-xs">소요: {Math.round(log.durationMs / 1000)}초</p>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'export' && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">저장된 데이터를 내보냅니다. (세션 + localStorage)</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => downloadFile(getAllRecordsAsCSV(), `office_data_${Date.now()}.csv`, 'text/csv')}
                  className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 text-center transition-colors">
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-white text-sm font-medium">CSV 내보내기</div>
                  <div className="text-gray-500 text-xs">{allRecords.length}건</div>
                </button>
                <button onClick={() => downloadFile(getAllRecordsAsJSON(), `office_data_${Date.now()}.json`, 'application/json')}
                  className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 text-center transition-colors">
                  <div className="text-2xl mb-1">📋</div>
                  <div className="text-white text-sm font-medium">JSON 내보내기</div>
                  <div className="text-gray-500 text-xs">{allRecords.length}건</div>
                </button>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-500">
                세션 내 로그: {managerLogs.length}건 · localStorage 기록: {allRecords.length}건
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
