'use client'
import React, { useState } from 'react'
import SideNav from './_components/SideNav';
import { TotalUsageContext } from '../(context)/TotalUsageContext';


function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [totalUsage, setTotalUsage] = useState<number>(0);

  return (
    <TotalUsageContext.Provider value={{ totalUsage, setTotalUsage }}>
    <div className='bg-slate-100 h-full'>
      <div className='md:w-64 hidden md:block fixed'>
        <SideNav />
      </div>

      <div className='md:ml-64'>
        {children}
      </div>
    </div>
    </TotalUsageContext.Provider>

  )
}

export default DashboardLayout

