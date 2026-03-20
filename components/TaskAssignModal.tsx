'use client';

import { useOfficeStore } from '@/lib/store';
import SPPlannerModal from './role-modals/SPPlannerModal';
import SPCopyModal from './role-modals/SPCopyModal';
import SPImageModal from './role-modals/SPImageModal';
import SPCROModal from './role-modals/SPCROModal';
import DAStrategyModal from './role-modals/DAStrategyModal';
import DACopyModal from './role-modals/DACopyModal';
import DAAnalysisModal from './role-modals/DAAnalysisModal';
import DACreativeModal from './role-modals/DACreativeModal';

export default function TaskAssignModal() {
  const modal = useOfficeStore(s => s.modal);
  const workers = useOfficeStore(s => s.workers);
  const closeModal = useOfficeStore(s => s.closeModal);

  if (modal.type !== 'task' || !modal.workerId) return null;
  const worker = workers.find(w => w.id === modal.workerId);
  if (!worker) return null;

  switch (worker.roleKey) {
    case 'spPlanner':
      return <SPPlannerModal worker={worker} onClose={closeModal} />;
    case 'spCopy':
      return <SPCopyModal worker={worker} onClose={closeModal} />;
    case 'spImage':
      return <SPImageModal worker={worker} onClose={closeModal} />;
    case 'spCRO':
      return <SPCROModal worker={worker} onClose={closeModal} />;
    case 'daStrategy':
      return <DAStrategyModal worker={worker} onClose={closeModal} />;
    case 'daCopy':
      return <DACopyModal worker={worker} onClose={closeModal} />;
    case 'daAnalysis':
      return <DAAnalysisModal worker={worker} onClose={closeModal} />;
    case 'daCreative':
      return <DACreativeModal worker={worker} onClose={closeModal} />;
    default:
      return null;
  }
}
