'use client'
import { Button } from '@/components/ui/button'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import React, { useContext } from 'react'
import { TotalUsageContext } from '@/app/(context)/TotalUsageContext'

function UsageTrack() {
  const context = useContext(TotalUsageContext);
  const history = useQuery(api.aiOutputs.listByUser, { createdBy: "usuario@exemplo.com" }) ?? [];

  if (!context) {
    throw new Error('UsageTrack must be used within a TotalUsageContext.Provider');
  }

  const { totalUsage, setTotalUsage } = context;

  // Calculate total usage from history
  const total = history.reduce((acc, item) => acc + (item.aiResponse?.length ?? 0), 0);
  if (total !== totalUsage) {
    setTotalUsage(total);
  }

  return (
    <div className='m-5'>
      <div className='bg-primary p-3 text-white rounded-lg'>
        <h2>Credits</h2>
        <div className='h-2 bg-[#9981f9] w-full rounded-full mt-3'>
            <div className='h-2 bg-white rounded-full'
            style={{
                width:`${Math.min((totalUsage / 20000) * 100, 100)}%`
            }}></div>
        </div>
        <h2 className='text-sm my-2'>{totalUsage}/20,000 Credits used</h2>
      </div>
      <Button variant = {'secondary'} className = 'w-full my-3 text-primary'>Upgrade</Button>
    </div>
  )
}

export default UsageTrack
