import Link from 'next/link'

export default function Home() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'>
      {/* Navbar */}
      <nav className='flex items-center justify-between px-8 py-4 border-b border-white/10'>
        <div className='flex items-center gap-2'>
          <div className='w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center'>
            <span className='text-white font-bold text-lg'>A</span>
          </div>
          <span className='text-white font-bold text-xl'>Altomatico</span>
        </div>
        <div className='flex gap-4'>
          <Link href='/sign-in' className='text-gray-300 hover:text-white transition px-4 py-2'>Entrar</Link>
          <Link href='/sign-up' className='bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition'>Começar Grátis</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className='max-w-6xl mx-auto px-8 pt-20 pb-16 text-center'>
        <div className='inline-block bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-1 mb-6'>
          <span className='text-purple-300 text-sm'>🚀 Automação de Conteúdo com IA</span>
        </div>
        <h1 className='text-5xl md:text-7xl font-bold text-white mb-6 leading-tight'>
          Gere conteúdo<br />
          <span className='bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent'>automaticamente</span>
        </h1>
        <p className='text-xl text-gray-300 mb-10 max-w-2xl mx-auto'>
          Conecte seu Instagram, YouTube e TikTok. A IA cria posts, vídeos, legendas e você publica quando quiser.
        </p>
        <div className='flex gap-4 justify-center'>
          <Link href='/dashboard' className='bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition shadow-lg shadow-purple-500/25'>
            Abrir Dashboard →
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className='max-w-6xl mx-auto px-8 pb-12'>
        <div className='grid md:grid-cols-3 gap-6'>
          {/* Instagram Card */}
          <div className='bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition group'>
            <div className='w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition'>
              <svg className='w-6 h-6 text-white' fill='currentColor' viewBox='0 0 24 24'><path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z'/></svg>
            </div>
            <h3 className='text-xl font-bold text-white mb-2'>Instagram</h3>
            <p className='text-gray-400 text-sm mb-4'>Posts, legendas e hashtags com IA</p>
            <div className='flex flex-wrap gap-1.5'>
              <span className='bg-pink-500/20 text-pink-300 text-xs px-2 py-0.5 rounded-full'>Posts</span>
              <span className='bg-pink-500/20 text-pink-300 text-xs px-2 py-0.5 rounded-full'>Legendas</span>
              <span className='bg-pink-500/20 text-pink-300 text-xs px-2 py-0.5 rounded-full'>Hashtags</span>
            </div>
          </div>

          {/* YouTube Card */}
          <div className='bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition group'>
            <div className='w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition'>
              <svg className='w-6 h-6 text-white' fill='currentColor' viewBox='0 0 24 24'><path d='M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z'/></svg>
            </div>
            <h3 className='text-xl font-bold text-white mb-2'>YouTube</h3>
            <p className='text-gray-400 text-sm mb-4'>Roteiros, narração e SEO com IA</p>
            <div className='flex flex-wrap gap-1.5'>
              <span className='bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full'>Roteiros</span>
              <span className='bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full'>Narração</span>
              <span className='bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full'>SEO</span>
            </div>
          </div>

          {/* TikTok Card */}
          <div className='bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition group'>
            <div className='w-12 h-12 bg-gradient-to-br from-cyan-400 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition'>
              <svg className='w-6 h-6 text-white' fill='currentColor' viewBox='0 0 24 24'><path d='M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.57 6.33 6.33 0 0 0 9.37 22a6.33 6.33 0 0 0 6.38-6.22V9.4a8.16 8.16 0 0 0 4.78 1.52V7.49a4.85 4.85 0 0 1-.94-.8z'/></svg>
            </div>
            <h3 className='text-xl font-bold text-white mb-2'>TikTok</h3>
            <p className='text-gray-400 text-sm mb-4'>Vídeos curtos virais com IA</p>
            <div className='flex flex-wrap gap-1.5'>
              <span className='bg-cyan-500/20 text-cyan-300 text-xs px-2 py-0.5 rounded-full'>Roteiros</span>
              <span className='bg-cyan-500/20 text-cyan-300 text-xs px-2 py-0.5 rounded-full'>Músicas</span>
              <span className='bg-cyan-500/20 text-cyan-300 text-xs px-2 py-0.5 rounded-full'>Trends</span>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className='max-w-4xl mx-auto px-8 pb-16'>
        <h2 className='text-2xl font-bold text-white text-center mb-8'>Como Funciona</h2>
        <div className='grid md:grid-cols-3 gap-6'>
          <div className='text-center'>
            <div className='w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4'>
              <span className='text-2xl'>1️⃣</span>
            </div>
            <h3 className='text-white font-bold mb-2'>Configure</h3>
            <p className='text-gray-400 text-sm'>Conecte suas contas e defina o nicho e tom de voz</p>
          </div>
          <div className='text-center'>
            <div className='w-14 h-14 bg-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4'>
              <span className='text-2xl'>2️⃣</span>
            </div>
            <h3 className='text-white font-bold mb-2'>Gere</h3>
            <p className='text-gray-400 text-sm'>A IA cria roteiros, legendas, hashtags e mais</p>
          </div>
          <div className='text-center'>
            <div className='w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4'>
              <span className='text-2xl'>3️⃣</span>
            </div>
            <h3 className='text-white font-bold mb-2'>Publique</h3>
            <p className='text-gray-400 text-sm'>Revise e publique quando quiser (ou agende)</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className='max-w-4xl mx-auto px-8 pb-16 text-center'>
        <div className='bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-10'>
          <h2 className='text-3xl font-bold text-white mb-4'>Comece agora mesmo</h2>
          <p className='text-gray-300 mb-6'>Crie sua conta gratuita e comece a gerar conteúdo</p>
          <Link href='/sign-up' className='inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition'>
            Criar Conta Grátis →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className='border-t border-white/10 py-8'>
        <div className='max-w-6xl mx-auto px-8'>
          <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center'>
                <span className='text-white font-bold text-sm'>A</span>
              </div>
              <span className='text-white font-bold'>Altomatico</span>
            </div>
            <div className='flex gap-6 text-sm text-gray-400'>
              <Link href='/privacy' className='hover:text-white transition'>Política de Privacidade</Link>
              <Link href='/terms' className='hover:text-white transition'>Termos de Uso</Link>
            </div>
            <p className='text-gray-500 text-xs'>© 2026 Altomatico — Uso pessoal</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
