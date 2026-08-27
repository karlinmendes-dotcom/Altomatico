import Link from 'next/link'

export default function TermsOfService() {
  return (
    <div className='min-h-screen bg-white'>
      {/* Navbar */}
      <nav className='border-b border-gray-100 px-8 py-4'>
        <div className='max-w-4xl mx-auto flex items-center justify-between'>
          <Link href='/' className='flex items-center gap-2'>
            <div className='w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center'>
              <span className='text-white font-bold text-lg'>A</span>
            </div>
            <span className='font-bold text-xl text-gray-900'>Altomatico</span>
          </Link>
          <Link href='/' className='text-sm text-purple-600 hover:text-purple-700'>← Voltar</Link>
        </div>
      </nav>

      <div className='max-w-4xl mx-auto px-8 py-12'>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>Termos de Uso</h1>
        <p className='text-sm text-gray-500 mb-8'>Última atualização: 27 de agosto de 2026</p>

        <div className='prose prose-gray max-w-none space-y-8'>
          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>1. Aceitação dos Termos</h2>
            <p className='text-gray-600 leading-relaxed'>
              Ao acessar e utilizar o <strong>Altomatico</strong>, você concorda com estes Termos de Uso. Esta plataforma é destinada exclusivamente para uso pessoal e interno do proprietário.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>2. Descrição do Serviço</h2>
            <p className='text-gray-600 leading-relaxed mb-3'>
              O Altomatico é uma plataforma de automação de conteúdo para redes sociais que utiliza inteligência artificial para:
            </p>
            <ul className='list-disc list-inside text-gray-600 space-y-2 ml-4'>
              <li>Gerar roteiros, legendas, hashtags e metadados para conteúdo.</li>
              <li>Automatizar publicações no YouTube, Instagram e TikTok.</li>
              <li>Gerenciar agendamentos e calendários de conteúdo.</li>
              <li>Fornecer analytics e insights de desempenho.</li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>3. Uso Pessoal e Interno</h2>
            <div className='bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4'>
              <p className='text-amber-800 font-medium'>⚠️ Restrição de Uso</p>
              <p className='text-amber-700 text-sm mt-1'>
                Esta plataforma é de <strong>uso exclusivo do proprietário</strong>. Não é um serviço SaaS, não é oferecido ao público e não é destinado a terceiros. O proprietário utiliza a plataforma para gerenciar suas próprias contas pessoais em redes sociais.
              </p>
            </div>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>4. Contas do Usuário</h2>
            <ul className='list-disc list-inside text-gray-600 space-y-2 ml-4'>
              <li>O proprietário é responsável por manter a segurança de suas credenciais de acesso.</li>
              <li>O proprietário é responsável por todas as atividades realizadas em sua conta.</li>
              <li>As credenciais de API (YouTube, Instagram, TikTok) são de propriedade do proprietário.</li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>5. Conteúdo Gerado por IA</h2>
            <ul className='list-disc list-inside text-gray-600 space-y-2 ml-4'>
              <li>Todo conteúdo gerado pela IA é de responsabilidade do proprietário ao publicá-lo.</li>
              <li>O proprietário revisa e aprova o conteúdo antes da publicação (modo semi-automático).</li>
              <li>O conteúdo é publicado apenas nas contas autorizadas pelo proprietário.</li>
              <li>O proprietário é responsável por cumprir as políticas de cada plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>6. Conformidade com Plataformas</h2>
            <p className='text-gray-600 leading-relaxed mb-3'>O uso do Altomatico está sujeito aos termos de cada plataforma:</p>
            <ul className='list-disc list-inside text-gray-600 space-y-2 ml-4'>
              <li><strong>YouTube:</strong> Conforme os Termos de Serviço do YouTube e as Diretrizes da Comunidade.</li>
              <li><strong>Instagram:</strong> Conforme os Termos de Uso do Instagram e as Políticas da Comunidade.</li>
              <li><strong>TikTok:</strong> Conforme os Termos de Serviço do TikTok e as Comunidades Diretrizes.</li>
            </ul>
            <p className='text-gray-600 leading-relaxed mt-3'>
              O proprietário se compromete a não utilizar a plataforma para atividades que violem os termos de serviço dessas plataformas.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>7. Propriedade Intelectual</h2>
            <ul className='list-disc list-inside text-gray-600 space-y-2 ml-4'>
              <li>O código-fonte do Altomatico é de propriedade do proprietário.</li>
              <li>O conteúdo gerado pela IA é de propriedade do proprietário.</li>
              <li>Os dados coletados pertencem exclusivamente ao proprietário.</li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>8. Isenção de Responsabilidade</h2>
            <ul className='list-disc list-inside text-gray-600 space-y-2 ml-4'>
              <li>O Altomatico é fornozido &quot;como está&quot;, sem garantias de disponibilidade 24/7.</li>
              <li>Não nos responsabilizamos por bloqueios ou mudanças nas APIs das plataformas.</li>
              <li>O proprietário é responsável por manter suas credenciais de API atualizadas.</li>
              <li>Recomenda-se o uso do modo semi-automático para revisar conteúdo antes da publicação.</li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>9. Privacidade</h2>
            <p className='text-gray-600 leading-relaxed'>
              Consulte nossa <Link href='/privacy' className='text-purple-600 hover:underline'>Política de Privacidade</Link> para informações sobre como coletamos, usamos e protegemos seus dados.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>10. Alterações</h2>
            <p className='text-gray-600 leading-relaxed'>
              Estes Termos de Uso podem ser atualizados a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação nesta página.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>11. Contato</h2>
            <p className='text-gray-600 leading-relaxed'>
              Em caso de dúvidas sobre estes Termos, entre em contato pelo e-mail do proprietário da plataforma.
            </p>
          </section>
        </div>

        <div className='mt-12 pt-8 border-t border-gray-100 text-center'>
          <Link href='/' className='text-purple-600 hover:text-purple-700 text-sm font-medium'>
            ← Voltar para o Altomatico
          </Link>
        </div>
      </div>
    </div>
  )
}
