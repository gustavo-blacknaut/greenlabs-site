'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, MessageCircle, Server } from 'lucide-react';
import { HOSTMINE, HOSTMINE_DISCORD } from '@/lib/links';
import { SERVIDORES_PUBLICOS } from '@/lib/servers';

const botao =
  'inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-black ' +
  'uppercase tracking-widest transition-all active:scale-[0.99]';

export default function Patrocinio() {
  // A logo é enviada pelo patrocinador e pode não estar na pasta ainda. Um
  // ícone de imagem quebrada no meio da página inicial é pior do que o nome
  // escrito, então o texto assume quando o arquivo não carrega.
  const [semLogo, setSemLogo] = useState(false);
  const logo = useRef<HTMLImageElement>(null);
  const publico = SERVIDORES_PUBLICOS[0];

  // O onError sozinho não basta: a imagem vem no HTML do servidor e o
  // navegador já tentou carregá-la antes do React hidratar. Quando o arquivo
  // não existe, o evento de erro acontece nesse intervalo e ninguém está
  // ouvindo - o handler é atado depois, para uma falha que já passou. Aqui a
  // checagem é do estado final, que não depende de ter visto o evento:
  // terminou de carregar e não tem largura nenhuma quer dizer que falhou.
  useEffect(() => {
    const img = logo.current;
    if (img && img.complete && img.naturalWidth === 0) setSemLogo(true);
  }, []);

  return (
    <section className="py-20 sm:py-28 lg:py-32 relative" aria-labelledby="patrocinio-titulo">
      <div className="mx-auto w-full max-w-7xl 2xl:max-w-[88rem] px-4 sm:px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-zinc-900/40 backdrop-blur-md">
          <div
            className="absolute -top-24 -right-16 w-[26rem] h-[26rem] bg-green-500/10 rounded-full blur-[110px] pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16 p-8 sm:p-10 lg:p-14 lg:items-center">
            <div>
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-green-500 block mb-5">
                Patrocinado por
              </span>

              <a
                href={HOSTMINE}
                target="_blank"
                rel="noreferrer sponsored"
                className="inline-flex items-center group"
              >
                {semLogo ? (
                  <span className="text-3xl sm:text-4xl font-black tracking-tighter text-white group-hover:text-green-400 transition-colors">
                    Hostmine
                  </span>
                ) : (
                  // <img> puro, e nao next/image: o onError do next/image nao
                  // dispara quando o arquivo nao existe - fica o icone de
                  // imagem quebrada, que e justamente o que o texto acima
                  // existe para evitar. Como images.unoptimized ja esta ligado
                  // no next.config, o componente nao acrescentava nada aqui.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    ref={logo}
                    src="/images/hostmine.png"
                    alt="Hostmine"
                    width={260}
                    height={72}
                    onError={() => setSemLogo(true)}
                    className="h-14 sm:h-16 w-auto object-contain object-left transition-opacity group-hover:opacity-80"
                  />
                )}
              </a>
            </div>

            <div>
              <h2
                id="patrocinio-titulo"
                className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter uppercase text-white text-balance"
              >
                Quem paga o servidor que{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600">
                  você usa de graça
                </span>
              </h2>

              <p className="mt-5 text-sm lg:text-base text-zinc-500 leading-relaxed font-medium text-pretty max-w-2xl">
                O GreenLabs foi feito para rodar no servidor de quem usa - é o
                ponto do projeto. Mas ninguém aluga uma máquina só para
                experimentar, e por isso existe um servidor público na tela de
                entrar, aberto e sem cadastro. Ele é da Hostmine, que banca a
                hospedagem para o projeto continuar sendo testável sem custo.
              </p>

              {publico && (
                <p className="mt-5 inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-bold text-zinc-400">
                  <Server size={14} className="text-green-500 shrink-0" aria-hidden="true" />
                  Servidor público
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-300 font-mono">{publico.endereco}</span>
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={HOSTMINE}
                  target="_blank"
                  rel="noreferrer sponsored"
                  className={`${botao} bg-gradient-to-r from-green-500 to-emerald-500 text-black hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]`}
                >
                  Conhecer a Hostmine
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
                <a
                  href={HOSTMINE_DISCORD}
                  target="_blank"
                  rel="noreferrer"
                  className={`${botao} border border-white/10 bg-white/[0.03] text-zinc-300 hover:text-white hover:border-green-500/30`}
                >
                  <MessageCircle size={16} aria-hidden="true" />
                  Discord
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
