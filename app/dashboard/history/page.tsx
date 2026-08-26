'use client'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Copy, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HistoryPage() {
  const contents = useQuery(api.contents.listAll) ?? [];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      idea: '💡 Ideia',
      research: '🔍 Pesquisa',
      strategy: '📋 Estratégia',
      script: '📝 Roteiro',
      production: '🎬 Produção',
      review: '👁️ Revisão',
      approved: '✅ Aprovado',
      scheduled: '⏰ Agendado',
      published: '🚀 Publicado',
      failed: '❌ Falhou',
      archived: '📦 Arquivado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      published: 'bg-green-100 text-green-700',
      scheduled: 'bg-blue-100 text-blue-700',
      failed: 'bg-red-100 text-red-700',
      review: 'bg-yellow-100 text-yellow-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Histórico de Conteúdos</h1>
      
      {contents.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum conteúdo criado ainda</p>
          <p className="text-sm mt-1">Comece gerando conteúdo na página Instagram ou YouTube</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contents.map((item) => (
            <div key={item._id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                  {getStatusLabel(item.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500">
                    {item.platform === 'youtube' ? '🎬 YouTube' : '📸 Instagram'} • {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleCopy(item.script || item.title)}
              >
                <Copy className='w-4 h-4' />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
