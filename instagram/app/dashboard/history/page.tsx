'use client'
import dynamic from 'next/dynamic'

const HistoryContent = dynamic(() => import('./HistoryContent'), { ssr: false })

const HistoryPage = () => {
  return <HistoryContent />;
};

export default HistoryPage;
