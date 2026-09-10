import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Globe } from 'lucide-react';

import CartaoDeDownload, { type Baixavel } from '@/components/downloads/CartaoDeDownload';
import {
  RELEASE_ANDROID,
  RELEASE_SERVER,
  RELEASE_WINDOWS,
  RELEASE_WINDOWS_NATIVO,
  REPO,
  REPO_MOBILE,
  REPO_SERVER,
  REPO_WINDOWS,
} from '@/lib/links';

export const metadata: Metadata = {
  title: 'Downloads - GreenLabs',
  description:
    'Baixe o GreenLabs para Windows, Linux ou Android. De graça, sem conta e sem limite de tempo.',
};

/**
 * Na ordem em que fazem sentido para quem chega.
 *
 * O texto de cada um fala do que a pessoa GANHA, e nao de como foi feito -
 * ninguem baixa um aplicativo por causa da linguagem em que foi escrito. Quem
 * quiser saber disso clica no icone do GitHub no canto do cartao.
 */
const CLIENTES: Baixavel[] = [
  {
    id: 'windows-nativo',
    plataforma: 'Windows',
    titulo: 'GreenLabs',
    resumo:
      'Pra jogar e mostrar a tela sem perder FPS. Roda leve, e seus amigos ouvem o jogo - mas não a conversa do Discord.',
    detalhes: [
      'Não pesa no jogo',
      'Manda o som do jogo, sem o Discord junto',
      'Imagem em 1080p a 60 quadros',
    ],
    href: RELEASE_WINDOWS_NATIVO,
    repo: REPO_WINDOWS,
    recomendado: true,
  },
  {
    id: 'windows-electron',
    plataforma: 'Windows',
    titulo: 'GreenLabs Completo',
    resumo:
      'Tem câmera, escolhe uma janela em vez da tela toda, e cria a sala pra galera entrar direto do seu PC.',
    detalhes: [
      'Câmera e microfone',
      'Compartilha só uma janela, se quiser',
      'Cria a sala sem precisar de servidor',
    ],
    href: RELEASE_WINDOWS,
    repo: REPO,
  },
  {
    id: 'linux',
    plataforma: 'Linux',
    titulo: 'GreenLabs Completo',
    resumo: 'Baixa e abre. Não instala nada, não mexe no sistema.',
    detalhes: ['Um arquivo só', 'Não precisa instalar', 'Tudo que a versão do Windows faz'],
    href: RELEASE_WINDOWS,
    repo: REPO,
  },
  {
    id: 'android',
    plataforma: 'Android',
    titulo: 'GreenLabs no celular',
    resumo:
      'Assiste, entra com câmera e mostra a tela do celular - coisa que nenhum navegador de celular faz.',
    detalhes: ['Mostra a tela do celular', 'Assiste de qualquer lugar', 'Android 8 ou mais novo'],
    href: RELEASE_ANDROID,
    repo: REPO_MOBILE,
  },
];

const SERVIDOR: Baixavel = {
  id: 'servidor',
  plataforma: 'Servidor',
  titulo: 'Servidor GreenLabs',
  resumo:
    'Só precisa disso se quiser sua própria sala fixa, num servidor seu. Pra chamada normal, os aplicativos acima já resolvem sozinhos.',
  detalhes: ['Um arquivo, sem instalar nada', 'Quase não consome memória', 'Windows, Linux e Docker'],
  href: RELEASE_SERVER,
  repo: REPO_SERVER,
};

export default function Downloads() {
  return (
    <main className="relative min-h-screen pt-32 sm:pt-36 pb-24">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar
        </Link>

        <header className="mt-8 mb-14 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white text-balance">
            Baixe e{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
              chame a galera.
            </span>
          </h1>
          <p className="mt-5 text-zinc-400 text-base sm:text-lg leading-relaxed font-medium text-pretty">
            Tudo de graça, sem conta e sem hora pra acabar. Se nem quiser
            instalar,{' '}
            <Link href="/call" className="text-green-400 hover:text-green-300 font-semibold">
              o navegador já resolve
            </Link>
            .
          </p>
        </header>

        <section aria-labelledby="clientes">
          <h2
            id="clientes"
            className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-5"
          >
            Escolha o seu
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {CLIENTES.map((item) => (
              <CartaoDeDownload key={item.id} item={item} />
            ))}
          </div>
        </section>

        <section aria-labelledby="servidor" className="mt-14">
          <h2
            id="servidor"
            className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-5"
          >
            Avançado - só se você quiser
          </h2>
          <CartaoDeDownload item={SERVIDOR} />
        </section>

        {/* O navegador nao e um download, entao nao vira cartao: viraria um
            cartao com um botao que nao baixa nada. */}
        <section className="mt-14 rounded-3xl border border-white/10 bg-white/[0.03] p-7 sm:p-9">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <Globe size={18} className="text-green-400" aria-hidden="true" />
                <h2 className="text-lg font-black text-white">Sem instalar nada</h2>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                No computador dá pra mostrar a tela, ligar a câmera e o microfone
                direto do navegador. No celular você assiste e entra com câmera -
                pra mostrar a tela do celular só com o aplicativo.
              </p>
            </div>
            <Link
              href="/call"
              className="shrink-0 bg-gradient-to-r from-green-500 to-emerald-500 text-black px-6 py-4 rounded-2xl font-black text-[13px] uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all hover:shadow-[0_0_40px_rgba(34,197,94,0.35)] hover:scale-[1.03] active:scale-95"
            >
              <Globe size={17} aria-hidden="true" />
              Entrar pelo navegador
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
