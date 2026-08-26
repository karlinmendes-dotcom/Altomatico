"use client"
import React from 'react'
import { Home, Instagram, Youtube, Settings, BarChart3, Calendar, Link2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

function SideNav() {
  const MenuList = [
    {
      name: 'Dashboard',
      icon: Home,
      path: '/dashboard/',
      color: 'text-purple-500',
    },
    {
      name: 'Instagram',
      icon: Instagram,
      path: '/dashboard/instagram',
      color: 'text-pink-500',
    },
    {
      name: 'YouTube',
      icon: Youtube,
      path: '/dashboard/youtube',
      color: 'text-red-500',
    },
    {
      name: 'Calendário',
      icon: Calendar,
      path: '/dashboard/calendar',
      color: 'text-blue-500',
    },
    {
      name: 'Histórico',
      icon: BarChart3,
      path: '/dashboard/history',
      color: 'text-green-500',
    },
    {
      name: 'Conexões',
      icon: Link2,
      path: '/dashboard/connections',
      color: 'text-cyan-500',
    },
    {
      name: 'Configurações',
      icon: Settings,
      path: '/dashboard/settings',
      color: 'text-gray-500',
    },
  ]
  const path = usePathname()

  return (
    <div className='h-screen relative p-5 bg-gray-900 text-white flex flex-col'>
      {/* Logo */}
      <div className='flex items-center gap-3 mb-8 px-2'>
        <div className='w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center'>
          <span className='font-bold text-lg'>A</span>
        </div>
        <div>
          <h2 className='font-bold text-lg leading-tight'>Altomatico</h2>
          <p className='text-xs text-gray-400'>Conteúdo com IA</p>
        </div>
      </div>

      {/* Menu */}
      <div className='flex-1'>
        <p className='text-xs text-gray-500 uppercase tracking-wider mb-3 px-2'>Menu</p>
        {MenuList.map((menu, index) => (
          <Link href={menu.path} key={index}>
            <div className={`flex items-center gap-3 mb-1 px-3 py-2.5 rounded-lg cursor-pointer transition
              ${path === menu.path
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              <menu.icon className={`w-5 h-5 ${path === menu.path ? menu.color : ''}`} />
              <span className='font-medium'>{menu.name}</span>
              {path === menu.path && (
                <div className='ml-auto w-1.5 h-1.5 bg-purple-500 rounded-full'></div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* User */}
      <div className='border-t border-white/10 pt-4 px-2'>
        <div className='flex items-center gap-3'>
          <div className='w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center'>
            <span className='text-white text-sm font-medium'>K</span>
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-medium truncate'>Karlyn</p>
            <p className='text-xs text-gray-500 truncate'>Plano Gratuito</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SideNav
