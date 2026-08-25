'use client'
import React, { useContext, useState } from 'react'
import FormSection from '../_component/FormSection'
import OutputSection from '../_component/OutputSection'
import { TEMPLATE } from '../../_components/TemplateListSection'
import Templates from '@/app/(data)/Templates'
import { ArrowLeft} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { chatSession } from '@/utils/AiModel'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { TotalUsageContext } from '@/app/(context)/TotalUsageContext'

interface PROPS {
  templateSlug: string;
}

function ContentCreator(props: PROPS) {
  const selectedtemplate:TEMPLATE|undefined = Templates?.find((item)=>item.slug == props.templateSlug)
  const [loading, setLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<string>('');
  const saveAiOutput = useMutation(api.aiOutputs.save);
  const [userEmail] = useState<string>('usuario@exemplo.com');
  const { totalUsage, setTotalUsage } = useContext(TotalUsageContext);
 
 
  const GenerateAIContent = async (formData: any) => {
    if (totalUsage >= 20000) {
      alert('Limite de uso gratuito atingido. Faça upgrade para continuar.');
      return;
    }else{
    setLoading(true);
    const selectedPrompt = selectedtemplate?.aiPrompt;
    const finalPrompt = JSON.stringify(formData) + ", " + selectedPrompt;
  
    const result = await chatSession.sendMessage(finalPrompt);
    console.log(result.response.text());
    setAiOutput(result?.response.text());
    await SaveInDb(JSON.stringify(formData), selectedtemplate?.slug,result?.response.text())
    setLoading(false);
    }
  };

  const SaveInDb = async (formData: string, slug: string | undefined, aiResp: string) => {
    if (!slug) {
      console.error("Template slug is undefined");
      return;
    }
    
    const createdBy = userEmail;
    if (!createdBy) {
      console.error("User email is undefined");
      return;
    }

    try {
      await saveAiOutput({
        formData: formData,
        templateSlug: slug,
        aiResponse: aiResp,
        createdBy: createdBy,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving to Convex:", error);
    }
  }
  return (
    <div className='p-10'>
      <Link href={"/dashboard"}>
        <Button ><ArrowLeft />Voltar</Button>
      </Link>
      <div className='grid grid-cols-1 md:grid-cols-3  gap-10 py-5'>
        <FormSection selectedTemplate={selectedtemplate} userFormInput={(v: any) => GenerateAIContent(v)} loading = {loading} />
        <div className='col-span-2'>
          <OutputSection aiOutput = {aiOutput} />
        </div>

      </div>
    </div>
    
  )
}

export default ContentCreator
