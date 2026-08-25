'use client'
import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface HISTORY {
  _id: string;
  formData: string;
  aiResponse: string;
  templateSlug: string;
  createdBy: string;
  createdAt: string;
}

const HistoryPage = () => {
  const [userEmail] = useState<string>('usuario@exemplo.com');
  const history = useQuery(api.aiOutputs.listByUser, { createdBy: userEmail }) || [];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">History</h1>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center font-semibold bg-gray-200 p-2">
        <div>Template</div>
        <div className="col-span-2">AI Response</div>
        <div>Date</div>
        <div>Copy</div>
      </div>
      {history.map((item) => (
        <div key={item.id} className="grid grid-cols-1 md:grid-cols-5 gap-6 p-3 border-b">
          <div>{item.templateSlug}</div>
          <div className="col-span-2 truncate">{item.aiResponse}</div>
          <div className='md:mx-14'>{new Date(item.createdAt).toLocaleDateString()}</div>
          <div className='md:mx-14'>
            <Button className='flex gap-2' onClick={() => handleCopy(item.aiResponse)}><Copy className='w-4 h-4' /> Copy</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryPage;




