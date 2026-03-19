'use client';

import { useOfficeStore } from '@/lib/store';
import { PROVIDER_COLORS } from '@/lib/llm-config';

export default function ManagerDashboard() {
  const modal = useOfficeStore(s => s.modal);
  const closeModal = useOfficeStore(s => s.closeModal);
  const managerLogs = useOfficeStore(s => s.managerLogs);
  const workers = useOfficeStore(s => s.workers);
  const tasks = useOfficeStore(s => s.tasks);

  if (modal.type !== 'manager') return null;

  const completedTasks = tasks.filter(t => t.status === 'reported');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const avgDuration = managerLogs.length > 0
    ? Math.round(managerLogs.reduce((sum, l) => sum + l.durationMs, 0) / managerLogs.length / 1000)
    : 0;

  const providerUsage = managerLogs.reduce<Record<string, number>>((acc, log) => {
    acc[log.provider] = (acc[log.provider] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white text-lg">
            📊
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold">중간관리자 대시보드</h3>
            <p className="text-gray-400 text-xs">전체 업무 현황 · 프로세스 분석 · 데이터 관리</p>
          </div>
          <button
            onClick={closeModal}
            className="text-gray-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Stats */}
        <div className="p-4 grid grid-cols-4 gap-3">
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{workers.length}</div>
            <div className="text-xs text-gray-400">직원 수</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{completedTasks.length}</div>
            <div className="text-xs text-gray-400">완료 업무</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{inProgressTasks.length}</div>
            <div className="text-xs text-gray-400">진행 중</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{avgDuration}s</div>
            <div className="text-xs text-gray-400">평균 소요</div>
          </div>
        </div>

        {/* Provider usage */}
        {Object.keys(providerUsage).length > 0 && (
          <div className="px-4 pb-3">
            <div className="text-xs text-gray-500 mb-2 font-medium">🤖 LLM 사용 현황</div>
            <div className="flex gap-2">
              {Object.entries(providerUsage).map(([provider, count]) => (
                <span
                  key={provider}
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: PROVIDER_COLORS[provider as keyof typeof PROVIDER_COLORS] + '22',
                    color: PROVIDER_COLORS[provider as keyof typeof PROVIDER_COLORS],
                  }}
                >
                  {provider}: {count}회
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="text-xs text-gray-500 mb-2 font-medium">📋 업무 로그</div>
          {managerLogs.length === 0 ? (
            <div className="text-gray-600 text-sm text-center py-8">
              아직 완료된 업무가 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {[...managerLogs].reverse().map(log => (
                <div key={log.id} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-medium">{log.workerName}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: PROVIDER_COLORS[log.provider] + '22',
                        color: PROVIDER_COLORS[log.provider],
                      }}
                    >
                      {log.model}
                    </span>
                    <span className="text-gray-500 text-xs ml-auto">
                      {Math.round(log.durationMs / 1000)}초
                    </span>
                  </div>
                  <div className="text-gray-400 text-xs mb-1">
                    지시: {log.taskInstruction.slice(0, 80)}{log.taskInstruction.length > 80 ? '...' : ''}
                  </div>
                  <div className="text-gray-300 text-xs">
                    결과: {log.taskResult.slice(0, 120)}{log.taskResult.length > 120 ? '...' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Process insights */}
        {managerLogs.length >= 2 && (
          <div className="p-4 border-t border-gray-800">
            <div className="text-xs text-gray-500 mb-1 font-medium">💡 프로세스 인사이트</div>
            <div className="text-xs text-gray-400 bg-gray-800 rounded-lg p-3 space-y-1">
              {workers.filter(w => w.state === 'waitingAtCEO').length > 2 && (
                <p>⚠️ CEO실 앞에 대기 인원이 많습니다. 보고를 처리해주세요.</p>
              )}
              {avgDuration > 30 && (
                <p>⚠️ 평균 업무 소요시간이 {avgDuration}초로 높습니다. 더 빠른 모델을 고려해보세요.</p>
              )}
              {workers.filter(w => w.state === 'idle').length === workers.length && managerLogs.length > 0 && (
                <p>✅ 모든 직원이 대기 중입니다. 새 업무를 배분해보세요.</p>
              )}
              <p>📊 총 {managerLogs.length}건의 업무가 처리되었습니다.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
