'use client'
import dynamic from 'next/dynamic'

const ContentCreator = dynamic(() => import('./ContentCreator'), { ssr: false })

interface PROPS{
  params:{
    'template-slug':string
  }
}

function CreateNewContent(props:PROPS) {
  return <ContentCreator templateSlug={props.params['template-slug']} />;
}

export default CreateNewContent
