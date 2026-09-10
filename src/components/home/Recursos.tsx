import Link from 'next/link';
import { ArrowRight, MonitorSpeaker, Server, ShieldCheck, Users, Zap } from 'lucide-react';
import { REPO_SERVER } from '@/lib/links';

const CARDS = [
  {
    Icone: ShieldCheck,
    titulo: 'Nenhuma conta',
    texto:
      'Não pedimos e-mail nem senha. Seu apelido e o endereço do servidor ficam salvos só no seu navegador.',
  },
  {
    Icone: Zap,
    titulo: 'Direto entre vocês',
    texto:
      'Vídeo e áudio vão peer-to-peer. O servidor só apresenta os participantes uns aos outros e sai da frente.',
  },
  {
    Icone: Users,
    titulo: 'Todo mundo junto',
    texto:
      'Navegador, Windows e Android na mesma sala. Quem estiver no celular assiste e entra com câmera.',
  },
];

export default function Recursos() {
  return (
    <section
      className="py-20 sm:py-28 lg:py-36 relative overflow-hidden bg-zinc-950"
      aria-labelledby="recursos-titulo"
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-7xl 2xl:max-w-[88rem] px-4 sm:px-6 lg:px-10 relative z-10">
        <div className="mb-12 sm:mb-16">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-green-500 mb-4 block">
            Por que assim
          </span>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <h2
              id="recursos-titulo"
              className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-black tracking-tighter uppercase text-white"
            >
              Feito pra{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600">
                jogar junto
              </span>
            </h2>
            <a
              href={REPO_SERVER}
              target="_blank"
              rel="noreferrer"
              className="group text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-green-400 transition-colors flex items-center gap-2 shrink-0"
            >
              Como hospedar o servidor
              <ArrowRight
                size={14}
                className="group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
          <article className="md:col-span-7 bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-[2.5rem] p-8 sm:p-12 flex flex-col justify-between hover:border-green-500/30 transition-all duration-500 group overflow-hidden relative min-h-[380px] lg:min-h-[440px]">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-green-500/10 text-green-400" aria-hidden="true">
                  <MonitorSpeaker className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-green-500/70">
                  Só no app de Windows
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl xl:text-4xl font-black text-white mb-4 group-hover:text-green-400 transition-colors">
                Áudio sem o Discord junto
              </h3>
              <p className="text-zinc-400 max-w-lg font-medium text-base lg:text-lg leading-relaxed text-pretty">
                O app captura o som do sistema tirando o Discord da transmissão -
                sem mutar nada. Você continua ouvindo seus amigos normalmente,
                só quem assiste é que não escuta a conversa.
              </p>
            </div>
            <p className="mt-8 text-xs text-zinc-600 font-medium relative z-10">
              Usa WASAPI process loopback. Pelo navegador isso não existe - dá
              pra escolher a fonte do áudio, mas não separar um aplicativo.
            </p>
            <div
              className="absolute -bottom-16 -right-16 opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-700 pointer-events-none"
              aria-hidden="true"
            >
              <MonitorSpeaker size={300} className="text-green-400" />
            </div>
          </article>

          <div className="md:col-span-5 grid gap-4 sm:gap-6">
            <Link
              href="/call"
              className="bg-green-500 rounded-[2.5rem] p-8 flex flex-col justify-between group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(34,197,94,0.2)] transition-all duration-300"
            >
              <div>
                <h3 className="text-xl font-black text-black mb-2">Entrar agora</h3>
                <p className="text-black/70 text-sm font-medium leading-relaxed">
                  Sem baixar nada. Funciona no celular e no computador.
                </p>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-black font-black text-xs uppercase tracking-widest">
                Abrir sala
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            <a
              href={REPO_SERVER}
              target="_blank"
              rel="noreferrer"
              className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between group hover:border-green-500/30 transition-all duration-300"
            >
              <div>
                <div className="p-2.5 w-fit rounded-xl bg-green-500/10 text-green-400 mb-4" aria-hidden="true">
                  <Server className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-white mb-2 group-hover:text-green-400 transition-colors">
                  Servidor leve
                </h3>
                <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                  Medido: 56 MB de RAM com 30 pessoas. Roda numa VPS barata ou
                  num painel de jogos.
                </p>
              </div>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-4 sm:mt-6">
          {CARDS.map(({ Icone, titulo, texto }) => (
            <article
              key={titulo}
              className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-7 hover:border-green-500/20 transition-all duration-300"
            >
              <div className="p-2.5 w-fit rounded-xl bg-green-500/10 text-green-400 mb-4" aria-hidden="true">
                <Icone className="w-5 h-5" />
              </div>
              <h3 className="text-base lg:text-lg font-black text-white mb-2">{titulo}</h3>
              <p className="text-zinc-400 text-sm font-medium leading-relaxed">{texto}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
