'use client';

import { useEffect } from 'react';
import WalletPipelinePage from '@/components/WalletPipelinePage';

export default function PipelinePageRoute() {
  useEffect(() => {
    console.log('✅ Pipeline page loaded successfully');
  }, []);

  return (
    <div>
      <WalletPipelinePage />
    </div>
  );
}