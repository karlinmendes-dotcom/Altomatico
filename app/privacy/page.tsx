import Link from 'next/link'

export default function PrivacyPolicy() {
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
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>Política de Privacidade</h1>
        <p className='text-sm text-gray-500 mb-8'>Última atualização: 27 de agosto de 2026</p>

        <div className='prose prose-gray max-w-none space-y-8'>
          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>1. Introdução</h2>
            <p className='text-gray-600 leading-relaxed'>
              Esta Política de Privacidade descreve como o <strong>Altomatico</strong> (&quot;nós&quot;, &quot;nosso&quot;) coleta, usa e protege informações quando você utiliza nossa plataforma de automação de conteúdo para redes sociais.
            </p>
            <p className='text-gray-600 leading-relaxed mt-3'>
              O Altomatico é uma ferramenta de <strong>uso pessoal e interno</strong>, projetada para gerenciar e automatizar conteúdo nas contas pessoais do proprietário nas plataformas YouTube, Instagram e TikTok.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>2. Dados Coletados</h2>
            <p className='text-gray-600 leading-relaxed mb-3'>Coletamos apenas os dados estritamente necessários para o funcionamento da plataforma:</p>
            <ul className='list-disc list-inside text-gray-600 space-y-2 ml-4'>
              <li><strong>Dados de Autenticação:</strong> Endereço de e-mail e nome do usuário para acesso à plataforma.</li>
              <li><strong>Tokens de Acesso:</strong> Tokens de autenticação das plataformas (YouTube, Instagram, TikTok) fornecidos pelo próprio proprietário para permitir a publicação automatizada de conteúdo.</li>
              <li><strong>Configurações:</strong> Preferências de nicho, tom de voz, marca e automação definidas pelo usuário.</li>
              <li><strong>Conteúdo Gerado:</strong> Textos, roteiros, legendas, hashtags e metadados gerados pela IA para publicação.</li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>3. Uso dos Dados</h2>
            <p className='text-gray-600 leading-relaxed mb-3'>Os dados coletados são utilizados exclusivamente para:</p>
            <ul className='list-disc list-inside text-gray-600 space-y-2 ml-4'>
              <li>Gerar conteúdo automatizado para as contas pessoais do proprietário.</li>
              <li>Conectar e publicar conteúdo nas plataformas YouTube, Instagram e TikTok.</li>
              <li>Melhorar a qualidade do conteúdo gerado através de aprendizado de padrões.</li>
              <li>Gerenciar agendamentos e publicações.</li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>4. Uso Pessoal e Interno</h2>
            <div className='bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4'>
              <p className='text-purple-800 font-medium'>⚠️ Aviso Importante</p>
              <p className='text-purple-700 text-sm mt-1'>
                Esta plataforma é de <strong>uso exclusivo do proprietário</strong>. Não é um serviço público ou SaaS. Todos os dados processados pertencem ao proprietário e são utilizados apenas para gerenciar suas próprias contas em redes sociais.
              </p>
            </div>
            <ul className='list-disc list-inside text-gray-600 space-y-2 ml-4'>
              <li>Não vendemos, alugamos ou compartilhamos dados com terceiros.</li>
              <li>Não coletamos dados de usuários finais ou clientes.</li>
              <li>Todos os dados de Instagram, YouTube e TikTok são das contas pessoais do proprietário.</li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>5. APIs e Serviços de Terceiros</h2>
            <p className='text-gray-600 leading-relaxed mb-3'>O Altomatico se conecta aos seguintes serviços:</p>
            <ul className='list-disc list-inside text-gray-600 space-y-2 ml-4'>
              <li><strong>Google YouTube Data API v3:</strong> Para upload e gerenciamento de vídeos no YouTube.</li>
              <li><strong>Meta Graph API (Instagram):</strong> Para publicação de conteúdo no Instagram.</li>
              <li><strong>TikTok Content Posting API:</strong> Para publicação de vídeos no TikTok.</li>
              <li><strong>Google Gemini API:</strong> Para geração de conteúdo por inteligência artificial.</li>
              <li><strong>Pixabay API:</strong> Para busca de imagens e vídeos gratuitos.</li>
            </ul>
            <p className='text-gray-600 leading-relaxed mt-3'>
              O uso desses serviços é regido pelas respectivas políticas de privacidade:
            </p>
            <ul className='list-disc list-inside text-gray-600 space-y-1 ml-4'>
              <li><a href='https://policies.google.com/privacy' className='text-purple-600 hover:underline' target='_blank' rel='noopener noreferrer'>Política de Privacidade do Google</a></li>
              <li><a href='https://www.facebook.com/privacy/policy/' className='text-purple-600 hover:underline' target='_blank' rel='noopener noreferrer'>Política de Privacidade do Meta</a></li>
              <li><a href='https://www.tiktok.com/legal/privacy-policy' className='text-purple-600 hover:underline' target='_blank' rel='noopener noreferrer'>Política de Privacidade do TikTok</a></li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>6. Segurança dos Dados</h2>
            <ul className='list-disc list-inside text-gray-600 space-y-2 ml-4'>
              <li>Todas as chaves de API e tokens são armazenados de forma criptografada.</li>
              <li>As comunicação com servidores utilizam HTTPS/TLS.</li>
              <li>O banco de dados Convex utiliza autenticação e controle de acesso.</li>
              <li>A plataforma é hospedada na Vercel com proteção integrada.</li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>7. Retenção de Dados</h2>
            <p className='text-gray-600 leading-relaxed'>
              Os dados são mantidos enquanto a plataforma estiver em uso pelo proprietário. O proprietário pode solicitar a exclusão de todos os dados a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>8. Conformidade com APIs</h2>
            <div className='bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4'>
              <p className='text-blue-800 font-medium'>Conformidade com Google, Meta e TikTok</p>
              <ul className='text-blue-700 text-sm mt-2 space-y-1 list-disc list-inside'>
                <li>O conteúdo gerado é publicado apenas nas contas autorizadas pelo proprietário.</li>
                <li>Os dados de API são utilizados conforme os termos de serviço de cada plataforma.</li>
                <li>Não é realizado scraping ou coleta de dados de terceiros.</li>
                <li>O proprietário mantém total controle sobre o que é publicado.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>9. Seus Direitos</h2>
            <p className='text-gray-600 leading-relaxed'>
              Como proprietário da plataforma, você tem direito a:
            </p>
            <ul className='list-disc list-inside text-gray-600 space-y-2 ml-4 mt-2'>
              <li>Acessar todos os seus dados armazenados.</li>
              <li>Modificar ou atualizar suas informações.</li>
              <li>Solicitar a exclusão completa de todos os dados.</li>
              <li>Desconectar qualquer plataforma a qualquer momento.</li>
              <li>Exportar seus dados em formato legível.</li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold text-gray-900 mb-3'>10. Contato</h2>
            <p className='text-gray-600 leading-relaxed'>
              Em caso de dúvidas sobre esta Política de Privacidade, entre em contato pelo e-mail do proprietário da plataforma.
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
