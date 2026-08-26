'use client'
import React, { useRef } from 'react'
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PROPS{
  aiOutput:string;
}

function OutputSection({aiOutput}:PROPS) {
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = () => {
    if (aiOutput) {
      navigator.clipboard.writeText(aiOutput);
    }
  };

  return (
    <div className='bg-white shadow-lg border rounded-lg'>
      <div className='flex justify-between items-center p-5 border-b'>
        <h2 className='font-medium text-lg'>Conteúdo Gerado</h2>
        <Button className='flex gap-2' onClick={handleCopy}>
          <Copy className='w-4 h-4'/> Copiar
        </Button>
      </div>
      <div className='p-5'>
        {aiOutput ? (
          <div className='prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed'>
            {aiOutput}
          </div>
        ) : (
          <div className='text-gray-400 text-center py-20'>
            O conteúdo gerado aparecerá aqui...
          </div>
        )}
      </div>
    </div>
  )
}

export default OutputSection
