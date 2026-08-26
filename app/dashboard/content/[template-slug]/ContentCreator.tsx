'use client'
import React, { useContext, useState } from 'react'
import FormSection from '../_component/FormSection'
import OutputSection from '../_component/OutputSection'
import { TEMPLATE } from '../../_components/TemplateListSection'
import Templates from '@/app/(data)/Templates'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { TotalUsageContext } from '@/app/(context)/TotalUsageContext'

interface PROPS {
  templateSlug: string;
}

function generateLocalContent(formData: Record<string, string>, template: TEMPLATE | undefined): string {
  const entries = Object.entries(formData).filter(([, v]) => v);
  if (entries.length === 0) return `Conteúdo gerado a partir do template: ${template?.name || 'Desconhecido'}`;
  
  const context = entries.map(([k, v]) => `${k}: ${v}`).join('\n');
  const prompt = template?.aiPrompt || 'Gere conteúdo baseado nas informações fornecidas.';
  
  return `📋 Template: ${template?.name || 'N/A'}\n📝 Prompt: ${prompt}\n\n---\n\nContexto fornecido:\n${context}\n\n---\n\n⚠️ Conteúdo gerado localmente.\nPara usar IA real, configure a API Key do Gemini no backend (Convex Action).`;
}

function ContentCreator(props: PROPS) {
  const selectedtemplate: TEMPLATE | undefined = Templates?.find((item) => item.slug == props.templateSlug)
  const [loading, setLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<string>('');
  const createContent = useMutation(api.contents.create)
  const updateScript = useMutation(api.contents.updateScript)
  const [userEmail] = useState<string>('usuario@exemplo.com');
  const { totalUsage, setTotalUsage } = useContext(TotalUsageContext);

  const GenerateAIContent = async (formData: any) => {
    if (totalUsage >= 20000) {
      alert('Limite de uso gratuito atingido. Faça upgrade para continuar.');
      return;
    } else {
      setLoading(true);

      try {
        // Geração local segura (sem exposição de API key)
        // Para IA real, usar Convex Action generateContent.generateInstagramPost
        const responseText = generateLocalContent(formData, selectedtemplate);
        setAiOutput(responseText);

        // Salvar no Convex
        const contentId = await createContent({
          title: selectedtemplate?.name || 'Conteúdo IA',
          topic: JSON.stringify(formData),
          platform: 'instagram',
          contentType: 'post',
          createdBy: userEmail,
        });

        await updateScript({
          contentId,
          script: responseText,
          aiModel: 'local',
          aiPrompt: JSON.stringify(formData),
          aiResponse: responseText,
        });

        setTotalUsage(totalUsage + responseText.length);
      } catch (error) {
        console.error("Erro ao gerar conteúdo:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className='p-10'>
      <Link href={"/dashboard"}>
        <Button><ArrowLeft />Voltar</Button>
      </Link>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-10 py-5'>
        <FormSection selectedTemplate={selectedtemplate} userFormInput={(v: any) => GenerateAIContent(v)} loading={loading} />
        <div className='col-span-2'>
          <OutputSection aiOutput={aiOutput} />
        </div>
      </div>
    </div>
  )
}

export default ContentCreator
