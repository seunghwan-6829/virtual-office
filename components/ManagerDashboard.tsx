'use client';

import { useState, useEffect } from 'react';
import { useOfficeStore } from '@/lib/store';
import { getCharColor } from '@/lib/types';
import { loadTaskRecords, getAllRecordsAsCSV, getAllRecordsAsJSON } from '@/lib/storage';

type Tab = 'overview' | 'workers' | 'training' | 'intervene' | 'history' | 'export';

interface TrainingItem {
  id: string;
  role_key: string;
  training_type: string;
  content: string;
  created_at: string;
}

export default function ManagerDashboard() {
  const modal = useOfficeStore(s => s.modal);
  const workers = useOfficeStore(s => s.workers.filter(w => w.floor === 1));
  const managerLogs = useOfficeStore(s => s.managerLogs);
  const closeModal = useOfficeStore(s => s.closeModal);
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedWorkerForTraining, setSelectedWorkerForTraining] = useState<string | null>(null);
  const [trainingType, setTrainingType] = useState<'instruction' | 'reference' | 'feedback'>('instruction');
  const [trainingContent, setTrainingContent] = useState('');
  const [trainingItems, setTrainingItems] = useState<TrainingItem[]>([]);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [interventionTarget, setInterventionTarget] = useState<string | null>(null);
  const [interventionMsg, setInterventionMsg] = useState('');

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

  const loadTrainingData = async (roleKey: string) => {
    setTrainingLoading(true);
    try {
      const res = await fetch(`/api/training?role_key=${encodeURIComponent(roleKey)}`);
      if (res.ok) {
        const data = await res.json();
        setTrainingItems(Array.isArray(data) ? data : []);
      } else {
        console.warn('Training load failed:', await res.text());
        setTrainingItems([]);
      }
    } catch (err) {
      console.warn('Training load error:', err);
      setTrainingItems([]);
    }
    setTrainingLoading(false);
  };

  const saveTraining = async () => {
    if (!selectedWorkerForTraining || !trainingContent.trim()) return;
    const w = regularWorkers.find(v => v.id === selectedWorkerForTraining);
    if (!w) return;
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_key: w.roleKey,
          training_type: trainingType,
          content: trainingContent.trim(),
        }),
      });
      if (!res.ok) console.warn('Training save failed:', await res.text());
    } catch (err) {
      console.warn('Training save error:', err);
    }
    setTrainingContent('');
    loadTrainingData(w.roleKey);
  };

  const deleteTraining = async (id: string) => {
    try {
      await fetch(`/api/training?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Training delete error:', err);
    }
    if (selectedWorkerForTraining) {
      const w = regularWorkers.find(v => v.id === selectedWorkerForTraining);
      if (w) loadTrainingData(w.roleKey);
    }
  };

  const sendIntervention = () => {
    if (!interventionTarget || !interventionMsg.trim()) return;
    const w = workers.find(v => v.id === interventionTarget);
    if (!w) return;
    const s = useOfficeStore.getState();
    s.addOfficeMessage({
      id: Math.random().toString(36).slice(2),
      fromId: 'user', fromName: 'CEO (나)',
      toId: w.id, toName: w.name,
      message: interventionMsg.trim(),
      type: 'user_intervention',
      timestamp: Date.now(),
    });
    s.setSpeechBubble(w.id, '메시지 수신!', 3000);
    setInterventionMsg('');
  };

  const TABS: [Tab, string][] = [
    ['overview', '개요'], ['workers', '직원별'], ['training', '학습'],
    ['intervene', '개입'], ['history', '히스토리'], ['export', '내보내기'],
  ];

  const TRAINING_TYPES: Record<string, { label: string; desc: string }> = {
    instruction: { label: '작업 지시', desc: '이 에이전트가 작업 시 따라야 할 지시사항' },
    reference: { label: '참고 자료', desc: '작업에 참고할 자료나 컨텍스트' },
    feedback: { label: '피드백', desc: '이전 작업에 대한 개선 피드백' },
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
        <div className="flex border-b border-gray-800 flex-shrink-0 overflow-x-auto">
          {TABS.map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${tab === t ? 'text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}>
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
              {waiting > 3 && <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 text-xs text-amber-300">보고 대기 인원이 많습니다.</div>}
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
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <div>
                        <div className="text-sm font-bold text-blue-400">{wLogs.length + wRecords.length}</div>
                        <div className="text-xs text-gray-500">{wAvg > 0 ? `평균 ${wAvg}s` : '-'}</div>
                      </div>
                      <button onClick={() => { setSelectedWorkerForTraining(w.id); setTab('training'); loadTrainingData(w.roleKey); }}
                        className="text-[10px] px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors">
                        학습
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'training' && (
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-2">학습시킬 에이전트 선택</label>
                <div className="flex flex-wrap gap-1.5">
                  {regularWorkers.map(w => (
                    <button key={w.id}
                      onClick={() => { setSelectedWorkerForTraining(w.id); loadTrainingData(w.roleKey); }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedWorkerForTraining === w.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}>
                      {w.name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedWorkerForTraining && (() => {
                const w = regularWorkers.find(v => v.id === selectedWorkerForTraining);
                if (!w) return null;
                return (
                  <div className="space-y-3">
                    <div className="flex gap-1.5">
                      {(Object.entries(TRAINING_TYPES) as [string, { label: string; desc: string }][]).map(([key, { label }]) => (
                        <button key={key} onClick={() => setTrainingType(key as typeof trainingType)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            trainingType === key ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-gray-500 text-[11px]">{TRAINING_TYPES[trainingType].desc}</p>
                    <textarea value={trainingContent} onChange={e => setTrainingContent(e.target.value)}
                      placeholder={`${w.name}에게 전달할 ${TRAINING_TYPES[trainingType].label} 내용을 입력하세요...`}
                      rows={3}
                      className="w-full bg-gray-800 text-white text-xs rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none" />
                    <button onClick={saveTraining} disabled={!trainingContent.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-xl text-xs font-medium transition-colors">
                      학습 데이터 저장
                    </button>

                    <div className="border-t border-gray-800 pt-3">
                      <h4 className="text-gray-400 text-xs font-medium mb-2">저장된 학습 데이터 ({trainingItems.length}건)</h4>
                      {trainingLoading ? (
                        <div className="text-gray-600 text-xs text-center py-4">로딩 중...</div>
                      ) : trainingItems.length === 0 ? (
                        <div className="text-gray-600 text-xs text-center py-4">아직 학습 데이터가 없습니다</div>
                      ) : (
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                          {trainingItems.map(item => (
                            <div key={item.id} className="bg-gray-800/50 rounded-lg p-2 flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-purple-400 font-medium">{TRAINING_TYPES[item.training_type]?.label ?? item.training_type}</span>
                                <p className="text-gray-300 text-[11px] mt-0.5 line-clamp-2">{item.content}</p>
                              </div>
                              <button onClick={() => deleteTraining(item.id)}
                                className="text-gray-600 hover:text-red-400 text-xs flex-shrink-0 transition-colors">x</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {tab === 'intervene' && (
            <div className="space-y-4">
              <p className="text-gray-400 text-xs">에이전트에게 직접 메시지를 보내거나 작업에 개입합니다.</p>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-2">대상 에이전트</label>
                <div className="flex flex-wrap gap-1.5">
                  {regularWorkers.map(w => (
                    <button key={w.id} onClick={() => setInterventionTarget(w.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        interventionTarget === w.id ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${w.state === 'working' ? 'bg-green-400' : w.state === 'idle' ? 'bg-gray-500' : 'bg-amber-400'}`} />
                      {w.name}
                    </button>
                  ))}
                </div>
              </div>

              {interventionTarget && (
                <div className="space-y-2">
                  <textarea value={interventionMsg} onChange={e => setInterventionMsg(e.target.value)}
                    placeholder="에이전트에게 전달할 메시지..."
                    rows={3}
                    className="w-full bg-gray-800 text-white text-xs rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none" />
                  <button onClick={sendIntervention} disabled={!interventionMsg.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 text-white rounded-xl text-xs font-medium transition-colors">
                    메시지 전송
                  </button>
                </div>
              )}

              <div className="border-t border-gray-800 pt-3">
                <h4 className="text-gray-400 text-xs font-medium mb-2">현재 에이전트 상태</h4>
                <div className="space-y-1.5">
                  {regularWorkers.map(w => (
                    <div key={w.id} className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        w.state === 'working' ? 'bg-green-400' : w.state === 'idle' ? 'bg-gray-500' : 'bg-amber-400'
                      }`} />
                      <span className="text-white text-xs font-medium">{w.name}</span>
                      <span className="text-gray-500 text-[11px]">{w.title}</span>
                      <span className="text-gray-600 text-[10px] ml-auto">
                        {w.state === 'idle' ? '대기 중' : w.state === 'working' ? '작업 중' : w.state}
                      </span>
                      {w.streamingText && (
                        <span className="text-green-400 text-[10px]">{w.streamingText.length}자 작성 중</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
                      <span className="text-gray-500 text-xs">{new Date(log.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
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
              <p className="text-gray-400 text-sm">저장된 데이터를 내보냅니다.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => downloadFile(getAllRecordsAsCSV(), `office_data_${Date.now()}.csv`, 'text/csv')}
                  className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 text-center transition-colors">
                  <div className="text-2xl mb-1">CSV</div>
                  <div className="text-white text-sm font-medium">CSV 내보내기</div>
                  <div className="text-gray-500 text-xs">{allRecords.length}건</div>
                </button>
                <button onClick={() => downloadFile(getAllRecordsAsJSON(), `office_data_${Date.now()}.json`, 'application/json')}
                  className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 text-center transition-colors">
                  <div className="text-2xl mb-1">JSON</div>
                  <div className="text-white text-sm font-medium">JSON 내보내기</div>
                  <div className="text-gray-500 text-xs">{allRecords.length}건</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
