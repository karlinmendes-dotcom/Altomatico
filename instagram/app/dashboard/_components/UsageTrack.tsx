'use client'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import React, { useContext } from 'react'
import { TotalUsageContext } from '@/app/(context)/TotalUsageContext'

function UsageTrack() {
  const context = useContext(TotalUsageContext);
  const contents = useQuery(api.contents.listAll) ?? [];

  if (!context) {
    throw new Error('UsageTrack must be used within a TotalUsageContext.Provider');
  }

  const { totalUsage, setTotalUsage } = context;

  // Calculate total usage from contents
  const total = contents.length;
  if (total !== totalUsage) {
    setTotalUsage(total);
  }

  const published = contents.filter(c => c.status === 'published').length;

  return (
    <div className='m-5'>
      <div className='bg-gradient-to-r from-purple-600 to-pink-600 p-4 text-white rounded-xl'>
        <h2 className='font-bold text-lg'>Altomatico</h2>
        <div className='h-2 bg-white/20 w-full rounded-full mt-3'>
          <div className='h-2 bg-white rounded-full'
            style={{
              width: `${Math.min((total / 100) * 100, 100)}%`
            }}></div>
        </div>
        <div className='flex justify-between text-sm my-2'>
          <span>{total} conteúdos criados</span>
          <span>{published} publicados</span>
        </div>
      </div>
    </div>
  )
}

export default UsageTrack
