'use client'
import React, { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Instagram, Youtube, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  idea: { color: 'bg-yellow-100 border-yellow-300', icon: '💡' },
  research: { color: 'bg-blue-100 border-blue-300', icon: '🔍' },
  strategy: { color: 'bg-purple-100 border-purple-300', icon: '📋' },
  script: { color: 'bg-indigo-100 border-indigo-300', icon: '📝' },
  production: { color: 'bg-orange-100 border-orange-300', icon: '🎬' },
  review: { color: 'bg-yellow-100 border-yellow-300', icon: '👁️' },
  approved: { color: 'bg-green-100 border-green-300', icon: '✅' },
  scheduled: { color: 'bg-blue-100 border-blue-300', icon: '⏰' },
  published: { color: 'bg-green-50 border-green-200', icon: '🚀' },
  failed: { color: 'bg-red-100 border-red-300', icon: '❌' },
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const events = useQuery(api.scheduler.getCalendarEvents, { month, year }) ?? []

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()

  const navigateMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1))
  }

  const getEventsForDay = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.date)
      return eventDate.getDate() === day &&
             eventDate.getMonth() === month &&
             eventDate.getFullYear() === year
    })
  }

  const today = new Date()
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear()

  return (
    <div className='min-h-screen bg-gray-50 p-6 md:p-10'>
      {/* Header */}
      <div className='flex items-center justify-between mb-8'>
        <div className='flex items-center gap-3'>
          <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center'>
            <Calendar className='w-6 h-6 text-white' />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Calendário</h1>
            <p className='text-gray-500 text-sm'>Organize seus conteúdos</p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className='flex items-center gap-4'>
          <button
            onClick={() => navigateMonth(-1)}
            className='p-2 hover:bg-gray-100 rounded-lg transition'
          >
            <ChevronLeft className='w-5 h-5' />
          </button>
          <h2 className='text-xl font-bold text-gray-900 min-w-[200px] text-center'>
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            className='p-2 hover:bg-gray-100 rounded-lg transition'
          >
            <ChevronRight className='w-5 h-5' />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className='flex flex-wrap gap-3 mb-6'>
        {Object.entries(statusConfig).slice(0, 6).map(([status, config]) => (
          <div key={status} className='flex items-center gap-1.5 text-xs text-gray-600'>
            <span>{config.icon}</span>
            <span className='capitalize'>{status === 'idea' ? 'Ideia' : status === 'script' ? 'Roteiro' : status === 'production' ? 'Produção' : status === 'scheduled' ? 'Agendado' : status === 'published' ? 'Publicado' : status}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
        {/* Day Headers */}
        <div className='grid grid-cols-7 bg-gray-50 border-b'>
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className='p-3 text-center text-sm font-medium text-gray-600'>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className='grid grid-cols-7'>
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className='min-h-[120px] border-b border-r bg-gray-50/50' />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayEvents = getEventsForDay(day)

            return (
              <div
                key={day}
                className={`min-h-[120px] border-b border-r p-2 transition
                  ${isToday(day) ? 'bg-purple-50' : 'hover:bg-gray-50'}
                `}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday(day) ? 'text-purple-600' : 'text-gray-700'
                }`}>
                  {isToday(day) ? (
                    <span className='bg-purple-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs'>
                      {day}
                    </span>
                  ) : day}
                </div>

                <div className='space-y-1'>
                  {dayEvents.slice(0, 3).map(event => {
                    const config = statusConfig[event.status] || statusConfig.idea
                    return (
                      <div
                        key={event.id}
                        className={`text-xs p-1.5 rounded border ${config.color} truncate`}
                        title={event.title}
                      >
                        <div className='flex items-center gap-1'>
                          {event.platform === 'youtube' ? (
                            <Youtube className='w-3 h-3 text-red-500 flex-shrink-0' />
                          ) : (
                            <Instagram className='w-3 h-3 text-pink-500 flex-shrink-0' />
                          )}
                          <span className='truncate'>{event.title}</span>
                        </div>
                      </div>
                    )
                  })}
                  {dayEvents.length > 3 && (
                    <div className='text-xs text-gray-400 text-center'>
                      +{dayEvents.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming Scheduled */}
      {events.filter(e => e.status === 'scheduled').length > 0 && (
        <div className='mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
          <h3 className='text-lg font-bold text-gray-900 mb-4'>⏰ Agendados</h3>
          <div className='space-y-3'>
            {events
              .filter(e => e.status === 'scheduled')
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map(event => (
                <div key={event.id} className='flex items-center justify-between p-3 bg-blue-50 rounded-lg'>
                  <div className='flex items-center gap-3'>
                    <Clock className='w-4 h-4 text-blue-500' />
                    <div>
                      <p className='font-medium text-sm'>{event.title}</p>
                      <p className='text-xs text-gray-500'>
                        {new Date(event.date).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    {event.platform === 'youtube' ? (
                      <Youtube className='w-4 h-4 text-red-500' />
                    ) : (
                      <Instagram className='w-4 h-4 text-pink-500' />
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
