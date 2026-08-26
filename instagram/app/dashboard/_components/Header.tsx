import React from 'react'
import { Search } from 'lucide-react'

function Header() {
  return (
    <div className='relative p-5 shadow-sm border-2 flex justify-between items-center bg-white'>
      <hr className='my-6 border'/>
      <div className='flex gap-10 items-center'>
        <h2 className='bg-primary p-5 rounded-full text-md text-white px-7'> Altomatico - Automação de Conteúdo IA </h2>
      </div>
      
    </div>
  )
}

export default Header
