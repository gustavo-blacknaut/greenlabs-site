
import Link from 'next/link';
import { ArrowRight, Download, Globe } from 'lucide-react';
import JanelaDemo from './JanelaDemo';

const NUMEROS = [
  { valor: '1080p60', rotulo: 'na transmissão' },
  { valor: 'P2P / SFU', rotulo: 'modos de chamada' },
  { valor: '0', rotulo: 'cadastros' },
];

// Sem 'use client': esta secao virou estatica de novo.
//
// Ela adivinhava a plataforma pelo userAgent para trocar o botao entre Windows
// e Android - e errava com quem estava no Linux, e nunca oferecia a versao
// nativa. Agora o botao leva para /downloads, onde a escolha e de quem baixa.
export default function Hero() {
  return (
    <section
      className="relative pt-32 sm:pt-40 lg:pt-36 pb-20 sm:pb-28 overflow-hidden lg:min-h-screen flex items-center"
      aria-labelledby="hero-titulo"
    >
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_15%,rgba(34,197,94,0.10),transparent_50%),radial-gradient(ellipse_at_75%_65%,rgba(16,185,129,0.08),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-zinc-950" />
      </div>

      <div className="mx-auto w-full max-w-7xl 2xl:max-w-[88rem] px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] 2xl:grid-cols-[1fr_1.15fr] gap-12 lg:gap-10 xl:gap-14 items-center">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-[11px] font-black uppercase tracking-[0.2em]">
            Sem conta · sem limite de tempo
          </span>

          <h1
            id="hero-titulo"
            className="text-4xl sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-7xl 2xl:text-[5rem] font-black leading-[0.92] tracking-tighter text-white text-balance"
          >
            SUA TELA,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-500 to-green-600">
              AO VIVO PRA GALERA.
            </span>
          </h1>

          <p className="max-w-xl mx-auto lg:mx-0 mt-6 mb-9 text-zinc-400 text-base sm:text-lg xl:text-xl leading-relaxed font-medium text-pretty">
            Transmissão de tela e chamadas no seu próprio servidor, em P2P ou
            com retransmissão SFU.{' '}
            <span className="text-white font-semibold">
              Sem cadastro e sem limite de tempo por chamada.
            </span>
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-4">
            <Link
              href="/call"
              className="group bg-gradient-to-r from-green-500 to-emerald-500 text-black px-6 xl:px-7 py-4 sm:py-5 rounded-2xl font-black text-[13px] uppercase tracking-wider whitespace-nowrap flex items-center justify-center gap-2.5 transition-all hover:shadow-[0_0_40px_rgba(34,197,94,0.4)] hover:scale-[1.03] active:scale-95"
            >
              <Globe size={18} aria-hidden="true" />
              Entrar pelo navegador
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </Link>

            <Link
              href="/downloads"
              className="group border border-white/10 hover:border-green-500/40 bg-white/[0.03] hover:bg-white/[0.06] px-6 xl:px-7 py-4 sm:py-5 rounded-2xl font-black text-[13px] uppercase tracking-wider whitespace-nowrap flex items-center justify-center gap-2.5 transition-all text-zinc-300 hover:text-white"
            >
              <Download size={18} aria-hidden="true" />
              Baixar
            </Link>
          </div>

          <p className="mt-4 text-xs text-zinc-600 font-medium">
            Windows, Linux e Android · o navegador não precisa de instalação nenhuma
          </p>

          <dl className="mt-12 hidden lg:grid grid-cols-3 gap-6 border-t border-white/5 pt-8 max-w-lg">
            {NUMEROS.map(({ valor, rotulo }) => (
              <div key={rotulo}>
                <dt className="sr-only">{rotulo}</dt>
                <dd className="text-2xl xl:text-3xl font-black text-white tabular-nums leading-none">
                  {valor}
                </dd>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-zinc-600">
                  {rotulo}
                </p>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <JanelaDemo />
        </div>
      </div>
    </section>
  );
}
