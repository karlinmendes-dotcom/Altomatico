'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SideNav from './_components/SideNav'
import { TotalUsageContext } from '../(context)/TotalUsageContext'

function Layout({ children }: { children: React.ReactNode }) {
  const [totalUsage, setTotalUsage] = useState<number>(0)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check for auth session
    const user = localStorage.getItem('altomatico_user')
    if (!user) {
      router.push('/sign-in')
      return
    }
    try {
      const parsed = JSON.parse(user)
      if (!parsed.id || !parsed.email) {
        router.push('/sign-in')
        return
      }
      setIsAuthenticated(true)
    } catch {
      router.push('/sign-in')
    }
  }, [router])

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

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
