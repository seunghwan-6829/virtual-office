'use client';

import { useOfficeStore } from '@/lib/store';
import BlogWriterModal from './role-modals/BlogWriterModal';
import SNSManagerModal from './role-modals/SNSManagerModal';
import CopywriterModal from './role-modals/CopywriterModal';
import SalesPageModal from './role-modals/SalesPageModal';
import ResearcherModal from './role-modals/ResearcherModal';
import VideoWriterModal from './role-modals/VideoWriterModal';
import SEOExpertModal from './role-modals/SEOExpertModal';
import DesignerModal from './role-modals/DesignerModal';

export default function TaskAssignModal() {
  const modal = useOfficeStore(s => s.modal);
  const workers = useOfficeStore(s => s.workers);
  const closeModal = useOfficeStore(s => s.closeModal);

  if (modal.type !== 'task' || !modal.workerId) return null;
  const worker = workers.find(w => w.id === modal.workerId);
  if (!worker) return null;

  switch (worker.roleKey) {
    case 'blog':
      return <BlogWriterModal worker={worker} onClose={closeModal} />;
    case 'sns':
      return <SNSManagerModal worker={worker} onClose={closeModal} />;
    case 'copy':
      return <CopywriterModal worker={worker} onClose={closeModal} />;
    case 'salesPage':
      return <SalesPageModal worker={worker} onClose={closeModal} />;
    case 'research':
      return <ResearcherModal worker={worker} onClose={closeModal} />;
    case 'video':
      return <VideoWriterModal worker={worker} onClose={closeModal} />;
    case 'seo':
      return <SEOExpertModal worker={worker} onClose={closeModal} />;
    case 'designer':
      return <DesignerModal worker={worker} onClose={closeModal} />;
    default:
      return null;
  }
}
