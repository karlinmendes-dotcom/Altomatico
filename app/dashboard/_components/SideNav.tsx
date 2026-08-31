"use client"
import React, { useState, useEffect } from 'react'
import { Home, Instagram, Youtube, Music, Settings, BarChart3, Calendar, Link2, LogOut, Menu, X, ChevronRight, FileText, BookOpen } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

function SideNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userName, setUserName] = useState('Usuário')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    try {
      const userData = localStorage.getItem('altomatico_user')
      if (userData) {
        const parsed = JSON.parse(userData)
        setUserName(parsed.displayName || parsed.email?.split('@')[0] || 'Usuário')
        setUserEmail(parsed.email || '')
      }
    } catch {}
  }, [])

  const MenuList = [
    { name: 'Dashboard', icon: Home, path: '/dashboard/', color: 'text-purple-500', bg: 'bg-purple-500' },
    { name: 'Instagram', icon: Instagram, path: '/dashboard/instagram', color: 'text-pink-500', bg: 'bg-pink-500' },
    { name: 'YouTube', icon: Youtube, path: '/dashboard/youtube', color: 'text-red-500', bg: 'bg-red-500' },
    { name: 'TikTok', icon: Music, path: '/dashboard/tiktok', color: 'text-cyan-500', bg: 'bg-cyan-500' },
    { name: 'Calendário', icon: Calendar, path: '/dashboard/calendar', color: 'text-blue-500', bg: 'bg-blue-500' },
    { name: 'Histórico', icon: BarChart3, path: '/dashboard/history', color: 'text-green-500', bg: 'bg-green-500' },
    { name: 'Mangá Video', icon: BookOpen, path: '/manga-video', color: 'text-orange-500', bg: 'bg-orange-500' },
    { name: 'Rascunhos', icon: FileText, path: '/dashboard/queue', color: 'text-amber-500', bg: 'bg-amber-500' },
    { name: 'Conexões', icon: Link2, path: '/dashboard/connections', color: 'text-emerald-500', bg: 'bg-emerald-500' },
    { name: 'Configurações', icon: Settings, path: '/dashboard/settings', color: 'text-gray-400', bg: 'bg-gray-500' },
  ]
  const path = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('altomatico_user')
    router.push('/sign-in')
  }

  const SidebarContent = () => (
    <div className='h-full flex flex-col'>
      {/* Logo */}
      <div className='flex items-center justify-between mb-8 px-2'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center'>
            <span className='font-bold text-lg'>A</span>
          </div>
          <div>
            <h2 className='font-bold text-lg leading-tight'>Altomatico</h2>
            <p className='text-xs text-gray-400'>Conteúdo com IA</p>
          </div>
        </div>
        <button onClick={() => setMobileOpen(false)} className='md:hidden text-gray-400 hover:text-white'>
          <X className='w-5 h-5' />
        </button>
      </div>

      {/* Menu */}
      <div className='flex-1'>
        <p className='text-xs text-gray-500 uppercase tracking-wider mb-3 px-2'>Menu</p>
        {MenuList.map((menu, index) => (
          <Link href={menu.path} key={index} onClick={() => setMobileOpen(false)}>
            <div className={`flex items-center gap-3 mb-1 px-3 py-2.5 rounded-lg cursor-pointer transition group
              ${path === menu.path
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                path === menu.path ? `${menu.bg} text-white` : 'bg-white/5 text-gray-400 group-hover:text-white'
              }`}>
                <menu.icon className='w-4 h-4' />
              </div>
              <span className='font-medium flex-1'>{menu.name}</span>
              {path === menu.path && (
                <ChevronRight className='w-4 h-4 text-gray-400' />
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* User */}
      <div className='border-t border-white/10 pt-4 px-2'>
        <div className='flex items-center gap-3 mb-3 p-2'>
          <div className='w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center'>
            <span className='text-white text-sm font-bold'>
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-medium truncate'>{userName}</p>
            <p className='text-xs text-gray-500 truncate'>{userEmail || 'Plano Gratuito'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className='w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition text-sm'
        >
          <LogOut className='w-4 h-4' />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Header */}
      <div className='md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-white/10 px-4 py-3 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center'>
            <span className='font-bold text-sm'>A</span>
          </div>
          <span className='font-bold text-white'>Altomatico</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className='text-gray-400 hover:text-white'>
          <Menu className='w-6 h-6' />
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className='md:hidden fixed inset-0 z-50 bg-black/50' onClick={() => setMobileOpen(false)}>
          <div className='w-72 h-full bg-gray-900' onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className='hidden md:block h-screen relative bg-gray-900 text-white flex flex-col w-64'>
        <SidebarContent />
      </div>
    </>
  )
}

export default SideNav
