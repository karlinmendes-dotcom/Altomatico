'use client'
import { Button } from '@/components/ui/button'
import React, { useContext, useEffect, useState, Suspense } from 'react'
import { TotalUsageContext } from '@/app/(context)/TotalUsageContext';

function UsageTrackInner() {
  const [totalCredits] = useState(0);
  return (
    <div className='m-5'>
      <div className='bg-primary p-3 text-white rounded-lg'>
        <h2>Credits</h2>
        <div className='h-2 bg-[#9981f9] w-full rounded-full mt-3'>
            <div className='h-2 bg-white rounded-full'
            style={{
                width:`${Math.min((totalCredits / 20000) * 100, 100)}%`
            }}></div>
        </div>
        <h2 className='text-sm my-2'>{totalCredits}/20,000 Credits used</h2>
      </div>
      <Button variant = {'secondary'} className = 'w-full my-3 text-primary'>Upgrade</Button>
    </div>
  )
}

function UsageTrack() {
  return (
    <Suspense fallback={<div className='m-5'>Carregando...</div>}>
      <UsageTrackInner />
    </Suspense>
  )
}

export default UsageTrack
