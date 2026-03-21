'use client';

import { useState, useEffect, useRef } from 'react';
import { useOfficeStore } from '@/lib/store';
import { getCharColor } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface AgentStats {
  roleKey: string;
  workerName: string;
  charId: number;
  messageCount: number;
  trainingCount: number;
  taskCount: number;
}

interface ConversationRow {
  id: string;
  from_id: string;
  from_name: string;
  to_id: string;
  to_name: string;
  message: string;
  type: string;
  created_at: string;
}

interface TrainingRow {
  id: string;
  role_key: string;
  training_type: string;
  content: string;
  created_at: string;
}

type Tab = 'overview' | 'conversations' | 'training' | 'tasks';

export default function DataStoragePanel() {
  const open = useOfficeStore(s => s.dataStorageOpen);
  const setOpen = useOfficeStore(s => s.setDataStorageOpen);
  const workers = useOfficeStore(s => s.workers);

  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AgentStats[]>([]);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [trainings, setTrainings] = useState<TrainingRow[]>([]);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [totalMsgs, setTotalMsgs] = useState(0);
  const [totalTraining, setTotalTraining] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const loadingRef = useRef(false);

  const regularWorkers = workers.filter(w => !w.isManager && w.roleKey !== 'manager');

  useEffect(() => {
    if (!open || loaded || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const rw = useOfficeStore.getState().workers.filter(w => !w.isManager && w.roleKey !== 'manager');

    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); loadingRef.current = false; return; }

        const [msgRes, trainRes, taskRes] = await Promise.all([
          supabase.from('office_messages').select('id, from_id, from_name, to_id, to_name, message, type, created_at', { count: 'exact' })
            .eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
          supabase.from('agent_training').select('*', { count: 'exact' })
            .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
          supabase.from('task_records').select('id, worker_id, worker_name', { count: 'exact' })
            .eq('user_id', user.id),
        ]);

        setTotalMsgs(msgRes.count ?? 0);
        setTotalTraining(trainRes.count ?? 0);
        setTotalTasks(taskRes.count ?? 0);

        setConversations((msgRes.data ?? []) as ConversationRow[]);
        setTrainings((trainRes.data ?? []) as TrainingRow[]);

        const agentMap = new Map<string, AgentStats>();
        for (const w of rw) {
          agentMap.set(w.id, {
            roleKey: w.roleKey, workerName: w.name, charId: w.charId,
            messageCount: 0, trainingCount: 0, taskCount: 0,
          });
        }

        for (const m of (msgRes.data ?? [])) {
          const a = agentMap.get(m.from_id);
          if (a) a.messageCount++;
          const b = agentMap.get(m.to_id);
          if (b) b.messageCount++;
        }

        for (const t of (trainRes.data ?? [])) {
          const w = rw.find(v => v.roleKey === t.role_key);
          if (w) { const a = agentMap.get(w.id); if (a) a.trainingCount++; }
        }

        for (const t of (taskRes.data ?? [])) {
          const a = agentMap.get(t.worker_id);
          if (a) a.taskCount++;
        }

        setStats(Array.from(agentMap.values()));
        setLoaded(true);
      } catch { /* noop */ }
      setLoading(false);
      loadingRef.current = false;
    })();
  }, [open, loaded]);

  useEffect(() => {
    if (!open) setLoaded(false);
  }, [open]);

  if (!open) return null;

  const filteredConversations = filterAgent === 'all'
    ? conversations
    : conversations.filter(c => c.from_name === filterAgent || c.to_name === filterAgent);

  const filteredTrainings = filterAgent === 'all'
    ? trainings
    : trainings.filter(t => {
        const w = regularWorkers.find(v => v.name === filterAgent);
        return w && t.role_key === w.roleKey;
      });

  const TABS: [Tab, string][] = [
    ['overview', '종합 현황'],
    ['conversations', '대화 기록'],
    ['training', '학습 데이터'],
    ['tasks', '작업 기록'],
  ];

  const TYPE_LABELS: Record<string, string> = {
    collab: '협업', manager_tip: '관리자 팁', ceo_note: 'CEO 메모',
    casual: '일상', handoff: '인수인계', feedback: '피드백',
    question: '질문', approval: '승인', status: '상태',
    user_intervention: '사용자 개입', dialogue: '대화',
    manager_check: '관리자 확인',
  };

  return (
    <div className="fixed left-0 top-0 bottom-0 z-50 w-[520px] bg-gray-900/98 backdrop-blur-xl border-r border-gray-700 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-white font-bold text-sm">데이터 저장소</h3>
          <p className="text-gray-500 text-xs mt-0.5">에이전트 학습 · 대화 · 작업 데이터 현황</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        {TABS.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${
              tab === t ? 'text-white border-b-2 border-violet-500' : 'text-gray-500 hover:text-gray-300'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Agent Filter */}
      {tab !== 'overview' && (
        <div className="px-4 py-2 border-b border-gray-800 flex gap-1 overflow-x-auto flex-shrink-0">
          <button onClick={() => setFilterAgent('all')}
            className={`px-2 py-1 rounded text-[11px] flex-shrink-0 ${
              filterAgent === 'all' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}>전체</button>
          {regularWorkers.map(w => (
            <button key={w.id} onClick={() => setFilterAgent(w.name)}
              className={`px-2 py-1 rounded text-[11px] flex-shrink-0 ${
                filterAgent === w.name ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}>{w.name}</button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <div className="text-gray-600 text-xs text-center py-8">로딩 중...</div>}

        {!loading && tab === 'overview' && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-cyan-400">{totalMsgs}</div>
                <div className="text-xs text-gray-500">대화 기록</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-violet-400">{totalTraining}</div>
                <div className="text-xs text-gray-500">학습 데이터</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{totalTasks}</div>
                <div className="text-xs text-gray-500">완료 작업</div>
              </div>
            </div>

            {/* Per-Agent Stats */}
            <div>
              <h4 className="text-gray-400 text-xs font-bold mb-2">에이전트별 학습 현황</h4>
              <div className="space-y-2">
                {stats.map(s => {
                  const total = s.messageCount + s.trainingCount + s.taskCount;
                  const maxTotal = Math.max(...stats.map(v => v.messageCount + v.trainingCount + v.taskCount), 1);
                  const pct = Math.round((total / maxTotal) * 100);
                  return (
                    <div key={s.roleKey} className="bg-gray-800/60 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden border flex-shrink-0"
                          style={{ borderColor: getCharColor(s.charId) }}>
                          <img src={`/sprites/characters/CH_${s.charId}_Front.png`} alt="" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-white text-sm font-medium">{s.workerName}</span>
                        <span className="text-gray-600 text-[10px] ml-auto">총 {total}건</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5 mb-1.5">
                        <div className="bg-gradient-to-r from-violet-500 to-cyan-400 h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex gap-3 text-[10px]">
                        <span className="text-cyan-400">대화 {s.messageCount}</span>
                        <span className="text-violet-400">학습 {s.trainingCount}</span>
                        <span className="text-green-400">작업 {s.taskCount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!loading && tab === 'conversations' && (
          <div className="space-y-1.5">
            {filteredConversations.length === 0 && (
              <div className="text-gray-600 text-xs text-center py-8">대화 기록이 없습니다</div>
            )}
            {filteredConversations.map(c => (
              <div key={c.id} className="bg-gray-800/40 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-white text-xs font-medium">{c.from_name}</span>
                  {c.to_name && <span className="text-gray-600 text-[10px]">→ {c.to_name}</span>}
                  <span className={`text-[9px] px-1 py-0.5 rounded ${
                    c.type === 'collab' ? 'bg-purple-500/20 text-purple-400'
                    : c.type === 'manager_tip' ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-gray-500/20 text-gray-400'
                  }`}>{TYPE_LABELS[c.type] ?? c.type}</span>
                  <span className="text-gray-600 text-[10px] ml-auto">
                    {new Date(c.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}
                  </span>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">{c.message}</p>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === 'training' && (
          <div className="space-y-2">
            {filteredTrainings.length === 0 && (
              <div className="text-gray-600 text-xs text-center py-8">학습 데이터가 없습니다</div>
            )}
            {filteredTrainings.map(t => {
              const w = regularWorkers.find(v => v.roleKey === t.role_key);
              return (
                <div key={t.id} className="bg-gray-800/40 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    {w && (
                      <div className="w-5 h-5 rounded-full overflow-hidden border flex-shrink-0"
                        style={{ borderColor: getCharColor(w.charId) }}>
                        <img src={`/sprites/characters/CH_${w.charId}_Front.png`} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <span className="text-white text-xs font-medium">{w?.name ?? t.role_key}</span>
                    <span className={`text-[9px] px-1 py-0.5 rounded ${
                      t.training_type === 'instruction' ? 'bg-blue-500/20 text-blue-400'
                      : t.training_type === 'reference' ? 'bg-green-500/20 text-green-400'
                      : 'bg-amber-500/20 text-amber-400'
                    }`}>{t.training_type === 'instruction' ? '지시' : t.training_type === 'reference' ? '참고' : '피드백'}</span>
                    <span className="text-gray-600 text-[10px] ml-auto">
                      {new Date(t.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', timeZone: 'Asia/Seoul' })}
                    </span>
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed">{t.content}</p>
                </div>
              );
            })}
          </div>
        )}

        {!loading && tab === 'tasks' && (
          <div className="text-gray-400 text-xs space-y-3">
            <p>총 {totalTasks}건의 작업이 기록되어 있습니다.</p>
            <p className="text-gray-600 text-[11px]">
              에이전트들은 대화, 학습 데이터, 과거 작업 기록을 종합하여 더 나은 결과물을 생성합니다.
              데이터가 쌓일수록 각 에이전트의 전문성이 향상됩니다.
            </p>
            <div className="bg-gray-800 rounded-xl p-3 space-y-1.5">
              <h4 className="text-gray-400 text-xs font-bold">데이터 활용 방식</h4>
              <div className="text-[11px] text-gray-500 space-y-1">
                <p>1. <span className="text-cyan-400">대화 데이터</span> — 에이전트 간 실시간 지식 교환이 축적되어 향후 작업에 컨텍스트로 활용</p>
                <p>2. <span className="text-violet-400">학습 데이터</span> — 사용자가 직접 입력한 지시/참고/피드백이 작업 프롬프트에 반영</p>
                <p>3. <span className="text-green-400">작업 기록</span> — 과거 프로젝트 결과물이 새 프로젝트의 품질 향상에 기여</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
