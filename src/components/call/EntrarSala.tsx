'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Loader2, LogIn } from 'lucide-react';
import { QUALIDADES, checarMixedContent, normalizarServidor } from '@/lib/webrtc';
import { PONTE_PUBLICA, SERVIDORES_PUBLICOS, montarPelaPonte } from '@/lib/servers';
import {
  carregarPreferencias,
  carregarServidoresRecentes,
  esquecerServidor,
} from '@/lib/storage';

type Props = {
  conectando: boolean;
  erro: string;
  temTela: boolean;
  qualidade: string;
  onQualidadeChange: (id: string) => void;
  onEntrar: (dados: { nome: string; servidor: string; sala: string }) => void;
};

const campo =
  'w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white ' +
  'placeholder:text-zinc-600 font-medium outline-none transition-colors ' +
  'focus:border-green-500/50 focus:bg-green-500/[0.06]';

const rotulo = 'block text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2';

export default function EntrarSala({
  conectando,
  erro,
  temTela,
  qualidade,
  onQualidadeChange,
  onEntrar,
}: Props) {
  const [nome, setNome] = useState('');
  const [servidor, setServidor] = useState('');
  const [sala, setSala] = useState('call1');
  const [recentes, setRecentes] = useState<string[]>([]);

  // O lint do React reclama de setState dentro de efeito, e com razão na maior
  // parte dos casos. Aqui não há alternativa: os valores vêm do localStorage e
  // da URL, que não existem quando o HTML estático é gerado. Calcular na
  // inicialização do useState renderizaria vazio no servidor e preenchido no
  // cliente - erro de hidratação. Este é o caminho que o próprio React indica
  // para semear estado a partir do navegador, e roda uma vez só.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const prefs = carregarPreferencias();
    setNome(prefs.nome);
    setRecentes(carregarServidoresRecentes());

    // O link de convite traz o servidor e a sala na própria URL, e eles ganham
    // das preferências: quem abriu um convite quer entrar NAQUELA sala, não na
    // última em que esteve.
    //
    // Lido do window, e não pelo useSearchParams: o site é exportado estático,
    // e lá aquele hook exige um limite de Suspense em volta da página inteira
    // só para ler dois campos.
    const url = new URLSearchParams(window.location.search);
    const servidorDoConvite = url.get('servidor');
    const salaDoConvite = url.get('sala');

    setServidor(servidorDoConvite || prefs.servidor);
    setSala(salaDoConvite || prefs.sala || 'call1');
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const normalizado = normalizarServidor(servidor);
  const avisoMisto = normalizado ? checarMixedContent(normalizado) : null;

  // A oferta só aparece quando a tentativa falhou numa página segura contra um
  // endereço wss:// - que é a assinatura de "o servidor não tem TLS". Mostrar
  // antes de falhar seria empurrar um intermediário para quem não precisa dele.
  const pelaPonte = montarPelaPonte(servidor);
  const ofereceRota =
    !!erro &&
    !conectando &&
    !!pelaPonte &&
    normalizado.startsWith('wss://') &&
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:';
  const podeEntrar = nome.trim().length > 0 && servidor.trim().length > 0 && !conectando;

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <form
        className="w-full max-w-md bg-zinc-900/50 border border-white/10 backdrop-blur-xl rounded-[2rem] p-7 sm:p-9"
        onSubmit={(e) => {
          e.preventDefault();
          if (podeEntrar) onEntrar({ nome: nome.trim(), servidor: servidor.trim(), sala: sala.trim() || 'call1' });
        }}
      >
        <div className="flex flex-col items-center text-center mb-7">
          <Image src="/images/logo-192.png" alt="" width={52} height={52} className="object-contain mb-3" priority />
          <h1 className="text-2xl font-black tracking-tighter text-white">Entrar numa sala</h1>
          <p className="text-zinc-500 text-sm mt-1.5 font-medium leading-relaxed">
            Sem cadastro. Só o endereço de quem está hospedando e como você quer aparecer.
          </p>
        </div>

        {erro && (
          <p className="mb-5 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm leading-relaxed">
            {erro}
          </p>
        )}

        {/*
          A saída, oferecida no momento em que a pessoa está travada.
          Antes o erro explicava o problema e parava aí - e o problema é de uma
          regra do navegador, então quem lia não tinha o que fazer com a
          informação. Aqui vão as duas saídas reais, com o custo de cada uma
          escrito: o túnel não tem intermediário, a ponte tem.
        */}
        {ofereceRota && (
          <div className="mb-5 px-4 py-3.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.07]">
            <p className="text-amber-300 text-sm font-bold mb-2">
              O servidor não tem certificado. Duas saídas:
            </p>
            <p className="text-zinc-400 text-xs leading-relaxed mb-3">
              <strong className="text-zinc-200">Se o servidor é seu</strong>, suba
              com <code className="px-1 py-0.5 rounded bg-white/10 text-zinc-200">--tunnel</code>:
              ele entrega um endereço <code className="px-1 py-0.5 rounded bg-white/10 text-zinc-200">wss://</code>{' '}
              pronto, sem intermediário e sem abrir porta no roteador.
            </p>
            <p className="text-zinc-400 text-xs leading-relaxed mb-3">
              <strong className="text-zinc-200">Ou passe pela ponte</strong> -
              ela recebe <code className="px-1 py-0.5 rounded bg-white/10 text-zinc-200">wss://</code>{' '}
              e repassa para o seu servidor. Só a sinalização passa por lá; vídeo
              e áudio continuam indo direto entre vocês.{' '}
              <span className="text-amber-300/90">
                Quem opera a ponte vê quem entrou em qual sala - não vê a imagem
                nem o som.
              </span>
            </p>
            <button
              type="button"
              onClick={() => setServidor(pelaPonte!)}
              className="w-full px-4 py-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 text-xs font-black uppercase tracking-widest hover:bg-amber-500/20 transition-colors"
            >
              Usar a ponte de {PONTE_PUBLICA}
            </button>
          </div>
        )}
        {avisoMisto && (
          <p className="mb-5 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm leading-relaxed">
            {avisoMisto}
          </p>
        )}

        <div className="mb-5">
          <label htmlFor="gl-nome" className={rotulo}>Seu apelido</label>
          <input
            id="gl-nome"
            className={campo}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como os outros vão te ver"
            maxLength={40}
            autoComplete="nickname"
          />
        </div>

        <div className="mb-3">
          <label htmlFor="gl-servidor" className={rotulo}>Servidor</label>
          <input
            id="gl-servidor"
            className={campo}
            value={servidor}
            onChange={(e) => setServidor(e.target.value)}
            placeholder="exemplo.com:25640"
            autoComplete="url"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
          />
          {normalizado && (
            <p className="mt-2 text-xs text-zinc-600 font-medium break-all">
              Conecta em <span className="text-zinc-400">{normalizado}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-xs text-zinc-600 font-bold">Sem servidor?</span>
          {SERVIDORES_PUBLICOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setServidor(s.endereco)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors"
            >
              <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-[10px] font-black">{s.regiao}</span>
              {s.nome}
            </button>
          ))}
        </div>

        {recentes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {recentes.map((endereco) => (
              <button
                key={endereco}
                type="button"
                onClick={() => setServidor(endereco)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setRecentes(esquecerServidor(endereco));
                }}
                title="Clique para usar · botão direito para remover"
                className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-zinc-500 text-xs font-medium hover:text-white hover:border-green-500/30 transition-colors max-w-full truncate"
              >
                {endereco}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-7">
          <div>
            <label htmlFor="gl-sala" className={rotulo}>Sala</label>
            <input
              id="gl-sala"
              className={campo}
              value={sala}
              onChange={(e) => setSala(e.target.value)}
              placeholder="call1"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          <div>
            <label htmlFor="gl-qualidade" className={rotulo}>Qualidade</label>
            <select
              id="gl-qualidade"
              className={campo}
              value={qualidade}
              onChange={(e) => onQualidadeChange(e.target.value)}
            >
              {QUALIDADES.map((q) => (
                <option key={q.id} value={q.id} className="bg-zinc-900">{q.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!podeEntrar}
          className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-black font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all hover:shadow-[0_0_30px_rgba(34,197,94,0.35)] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {conectando ? (
            <>
              <Loader2 size={17} className="animate-spin" aria-hidden="true" />
              Conectando…
            </>
          ) : (
            <>
              <LogIn size={17} aria-hidden="true" />
              Entrar na sala
            </>
          )}
        </button>

        {!temTela && (
          <p className="mt-5 text-xs text-zinc-600 leading-relaxed font-medium">
            Seu navegador não permite transmitir a tela - no celular isso é
            limitação do sistema, não do site. Você ainda assiste e entra com
            câmera e microfone.
          </p>
        )}

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Voltar ao início
        </Link>
      </form>
    </div>
  );
}
