'use client'
import React, { useState } from 'react'
import SideNav from './_components/SideNav'
import { TotalUsageContext } from '../(context)/TotalUsageContext'

function Layout({ children }: { children: React.ReactNode }) {
  const [totalUsage, setTotalUsage] = useState<number>(0)

  return (
    <TotalUsageContext.Provider value={{ totalUsage, setTotalUsage }}>
      <div className='flex h-screen bg-gray-50'>
        {/* Sidebar */}
        <div className='w-64 flex-shrink-0 hidden md:block'>
          <SideNav />
        </div>

        {/* Main Content */}
        <div className='flex-1 overflow-y-auto'>
          {children}
        </div>
      </div>
    </TotalUsageContext.Provider>
  )
}

export default Layout
