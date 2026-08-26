'use client'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

const HistoryContent = () => {
  const contents = useQuery(api.contents.listAll) || [];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Conteúdos Gerados</h1>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center font-semibold bg-gray-200 p-2 rounded-lg">
        <div>Título</div>
        <div>Plataforma</div>
        <div>Status</div>
        <div>Data</div>
        <div>Copiar</div>
      </div>
      {contents.map((item) => (
        <div key={item._id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-3 border-b">
          <div className="truncate font-medium">{item.title}</div>
          <div>{item.platform === 'youtube' ? '🎬 YouTube' : '📸 Instagram'}</div>
          <div className="text-xs">{item.status}</div>
          <div>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</div>
          <div>
            <Button variant='outline' size='sm' onClick={() => handleCopy(item.script || item.title)}>
              <Copy className='w-4 h-4 mr-1' /> Copiar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryContent;
