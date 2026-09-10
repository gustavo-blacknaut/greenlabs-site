'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import {
  Camera,
  Check,
  Columns2,
  Grid2x2,
  Link2,
  Loader2,
  LogOut,
  MonitorPlay,
  MonitorUp,
  Settings,
  Square,
  Users,
  X,
} from 'lucide-react';
import {
  MODOS_AUDIO,
  QUALIDADES,
  pegarModoAudio,
  soDaParaAssistir,
  type ParticipanteFormatado,
} from '@/lib/webrtc';
import type { StreamNaTela } from '@/lib/useCall';
import { cn } from '@/lib/utils';

function Video({ stream, mudo }: { stream: MediaStream; mudo: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.srcObject !== stream) el.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      className="w-full h-full object-contain block"
      autoPlay
      playsInline
      muted={mudo}
      disablePictureInPicture
    />
  );
}

/**
 * A resolução real que está chegando, lida da própria faixa.
 *
 * Não vem do `stream-meta`: aquilo é o que quem transmite PEDIU, e o navegador
 * entrega o que consegue - quem escolhe 1080p e compartilha uma janela de
 * 1280x720 transmite 1280x720. Mostrar o pedido em vez do recebido faria o
 * rótulo mentir justamente para quem está conferindo a qualidade.
 */
function Resolucao({ stream }: { stream: MediaStream }) {
  const [texto, setTexto] = useState('');

  useEffect(() => {
    const faixa = stream.getVideoTracks()[0];
    if (!faixa) return;

    const ler = () => {
      const { width, height, frameRate } = faixa.getSettings();
      if (!width || !height) return;
      const fps = frameRate ? ` ${Math.round(frameRate)}fps` : '';
      setTexto(`${width}×${height}${fps}`);
    };

    ler();
    // A resolução muda quando quem transmite troca de janela, e no início ela
    // costuma vir zerada enquanto o primeiro quadro não chegou.
    const relogio = window.setInterval(ler, 2000);
    return () => window.clearInterval(relogio);
  }, [stream]);

  if (!texto) return null;
  return <span className="text-zinc-400 font-medium shrink-0">{texto}</span>;
}

type Props = {
  nome: string;
  servidor: string;
  sala: string;
  pingMs: number;
  reconectando: boolean;
  streams: StreamNaTela[];
  participantes: ParticipanteFormatado[];
  temTela: boolean;
  modoAudio: string;
  qualidade: string;
  aviso: string;
  onModoAudioChange: (id: string) => void;
  onQualidadeChange: (id: string) => void;
  onCompartilharTela: () => void;
  onLigarCamera: () => void;
  onEncerrarStream: (id: string) => void;
  onSair: () => void;
  onFecharAviso: () => void;
};

/** As tres divisoes do palco, como no aplicativo nativo. */
const DIVISOES = [
  { quantas: 1, Icone: Square, titulo: 'Uma tela' },
  { quantas: 2, Icone: Columns2, titulo: 'Duas telas' },
  { quantas: 4, Icone: Grid2x2, titulo: 'Quatro telas' },
] as const;

const acao =
  'flex-1 flex flex-col items-center justify-center gap-1.5 min-h-[58px] rounded-xl ' +
  'text-[11px] font-black uppercase tracking-wider transition-colors ' +
  // Em telas maiores vira uma linha compacta, com largura pelo conteúdo.
  'sm:flex-none sm:flex-row sm:gap-2 sm:px-5 sm:min-h-[46px]';

const iconeDoTopo =
  'grid place-items-center w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] ' +
  'text-zinc-400 transition-colors hover:text-white hover:bg-white/[0.08] shrink-0';

const pastilha =
  'px-3.5 py-2 rounded-lg border text-xs font-bold transition-colors text-left';

// Contexto seguro só se sabe no navegador. O `subscribe` não faz nada de
// propósito: o protocolo da página não muda enquanto ela está aberta.
const semInscricao = () => () => {};
const inseguroNoCliente = () => soDaParaAssistir();
const inseguroNoServidor = () => false;

export default function SalaAoVivo({
  nome,
  servidor,
  sala,
  pingMs,
  reconectando,
  streams,
  participantes,
  temTela,
  modoAudio,
  qualidade,
  aviso,
  onModoAudioChange,
  onQualidadeChange,
  onCompartilharTela,
  onLigarCamera,
  onEncerrarStream,
  onSair,
  onFecharAviso,
}: Props) {
  const [painelAberto, setPainelAberto] = useState(false);
  const [configAberta, setConfigAberta] = useState(false);
  const [divisoes, setDivisoes] = useState(1);
  const [fixada, setFixada] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const total = participantes.length + 1;

  // Só existe resposta no navegador, então o HTML estático sai como "dá para
  // transmitir" e o aviso aparece na hidratação, se for o caso.
  const soAssiste = useSyncExternalStore(semInscricao, inseguroNoCliente, inseguroNoServidor);

  // Só quem tem imagem ocupa o palco. O servidor retransmissor entrega uma
  // faixa de áudio mesmo sem ninguém falando, e ela virava um quadro
  // "Participante - áudio" tomando uma vaga - inclusive depois de parar a tela,
  // o que fazia parecer que não tinha parado. O áudio continua tocando, num
  // player fora da tela.
  const comImagem = streams.filter((s) => s.temVideo);
  const soSom = streams.filter((s) => !s.temVideo && !s.local);

  // A sua própria tela não disputa vaga com a dos outros.
  //
  // Ela entrava na mesma fila, então quem transmitia com divisão 1 via a si
  // mesmo e não via mais ninguém - você já está olhando a sua tela, ela é a
  // única imagem na sala que não te interessa. Só aparece quando não há mais
  // nada, para o palco não ficar dizendo "ninguém transmitindo" enquanto você
  // transmite.
  const dosOutros = comImagem.filter((s) => !s.local);
  const minhas = comImagem.filter((s) => s.local);
  const candidatas = dosOutros.length > 0 ? dosOutros : minhas;

  // Fixar põe a escolhida na frente. Sem isso a ordem era a de chegada e não
  // havia como ver UMA tela específica: com divisão 1 você via a primeira que
  // apareceu, e ponto.
  const ordenadas = fixada
    ? [
        ...candidatas.filter((s) => s.id === fixada),
        ...candidatas.filter((s) => s.id !== fixada),
      ]
    : candidatas;

  const visiveis = ordenadas.slice(0, divisoes);
  const vagas = Math.max(0, divisoes - visiveis.length);
  const escondidas = ordenadas.length - visiveis.length;

  /**
   * Copia o link que leva direto a esta sala.
   *
   * O nome NÃO vai no link: ele é de quem convida, e quem recebe precisa
   * escolher o próprio. Vão só o servidor e a sala, que é o que a outra pessoa
   * não tem como adivinhar.
   */
  const copiarConvite = async () => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('servidor', servidor);
    url.searchParams.set('sala', sala);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Área de transferência negada (contexto inseguro, ou o usuário
      // recusou). Mostrar o link é melhor do que não fazer nada.
      window.prompt('Copie o link do convite:', url.toString());
    }
  };

  const gradeDoPalco =
    divisoes === 1
      ? 'grid-cols-1'
      : divisoes === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2';

  return (
    <div className="min-h-dvh flex flex-col">
      {/*
        Uma barra só, e compacta.
        Antes a escolha de áudio e a de qualidade ocupavam duas faixas de
        largura inteira acima do vídeo - a maior parte da tela era ajuste, e o
        conteúdo, que é a imagem, começava lá embaixo. Ajuste é coisa que se
        mexe uma vez; o lugar dele é atrás de um botão.
      */}
      <header className="flex items-center gap-2 mx-3 sm:mx-4 mt-3 px-3 py-2 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl">
        <Image src="/images/logo-96.png" alt="" width={24} height={24} className="object-contain shrink-0" />
        <span
          className={cn(
            'w-2 h-2 rounded-full shrink-0',
            reconectando ? 'bg-amber-400 animate-pulse' : 'bg-green-500'
          )}
          aria-label={reconectando ? 'reconectando' : 'conectado'}
        />

        {/*
          O convite: a sala em destaque e um botão que copia o link pronto.
          Passar "entra no meu servidor, o endereço é tal, a sala é tal" por
          mensagem é onde a maioria das chamadas morre - o link resolve isso com
          um clique, e quem abre já cai na tela de entrar com tudo preenchido.
        */}
        <button
          onClick={copiarConvite}
          title="Copiar link do convite"
          className={cn(
            // No celular ocupa o espaço que sobra: espremido entre as divisões
            // e o ping, o nome da sala virava um traço - e ele é justamente o
            // que a pessoa precisa ler para passar o convite adiante.
            'ml-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black transition-colors min-w-0 flex-1 sm:flex-none',
            copiado
              ? 'border-green-500/40 bg-green-500/10 text-green-400'
              : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:text-white hover:bg-white/[0.08]'
          )}
        >
          {copiado ? <Check size={14} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />}
          <span className="truncate max-w-[9rem] sm:max-w-[14rem]">
            {copiado ? 'Link copiado' : sala}
          </span>
        </button>

        {/* Divisão do palco: três botões grudados num trilho só. Escondida no
            celular, onde a grade é de uma coluna e o espaço faz falta ao nome
            da sala. */}
        <div
          className="hidden sm:flex gap-0.5 p-0.5 rounded-xl border border-white/10 bg-white/[0.03]"
          role="group"
          aria-label="Divisão da tela"
        >
          {DIVISOES.map(({ quantas, Icone, titulo }) => (
            <button
              key={quantas}
              onClick={() => setDivisoes(quantas)}
              title={titulo}
              aria-label={titulo}
              aria-pressed={divisoes === quantas}
              className={cn(
                'grid place-items-center w-8 h-8 rounded-[0.6rem] transition-colors',
                divisoes === quantas
                  ? 'bg-green-500/15 text-green-400'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
              )}
            >
              <Icone size={15} aria-hidden="true" />
            </button>
          ))}
        </div>

        {reconectando ? (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-bold shrink-0">
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            <span className="hidden sm:inline">Reconectando…</span>
          </span>
        ) : (
          <span className="hidden sm:block px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-green-400 text-xs font-black shrink-0">
            {pingMs > 0 ? `${pingMs}ms` : '-'}
          </span>
        )}

        {/* No monitor as ações moram aqui em cima, junto da configuração. A
            barra de baixo existia para o polegar no celular; num monitor ela
            era uma segunda barra ocupando altura para repetir o que cabe
            nesta. Abaixo de sm ela reaparece e este bloco some. */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <button
            onClick={onCompartilharTela}
            disabled={!temTela}
            title={
              temTela
                ? 'Transmitir tela'
                : soAssiste
                  ? 'Precisa de HTTPS para transmitir a tela'
                  : 'Não disponível neste navegador'
            }
            aria-label="Transmitir tela"
            className={cn(iconeDoTopo, 'disabled:opacity-30 disabled:hover:bg-white/[0.03]')}
          >
            <MonitorUp size={16} aria-hidden="true" />
          </button>

          <button
            onClick={onLigarCamera}
            disabled={soAssiste}
            title={soAssiste ? 'Precisa de HTTPS para acessar a câmera' : 'Ligar câmera'}
            aria-label="Ligar câmera"
            className={cn(iconeDoTopo, 'disabled:opacity-30 disabled:hover:bg-white/[0.03]')}
          >
            <Camera size={16} aria-hidden="true" />
          </button>

          <button
            onClick={() => setPainelAberto(true)}
            title="Pessoas na sala"
            aria-label="Pessoas"
            className={cn(iconeDoTopo, 'relative')}
          >
            <Users size={16} aria-hidden="true" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-green-500 text-black text-[10px] font-black">
              {total}
            </span>
          </button>

          <button
            onClick={() => setConfigAberta(true)}
            title="Configuração"
            aria-label="Configuração"
            className={iconeDoTopo}
          >
            <Settings size={16} aria-hidden="true" />
          </button>

          <button
            onClick={onSair}
            title="Sair da sala"
            aria-label="Sair"
            className="grid place-items-center w-9 h-9 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300 shrink-0"
          >
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>

        {/* No celular só a engrenagem fica em cima; o resto está ao alcance do
            polegar, na barra de baixo. */}
        <button
          onClick={() => setConfigAberta(true)}
          title="Configuração"
          aria-label="Configuração"
          className={cn(iconeDoTopo, 'sm:hidden')}
        >
          <Settings size={16} aria-hidden="true" />
        </button>
      </header>

      {/* Dito de saída, e não como erro depois do clique.
          Numa página HTTP o navegador não expõe `navigator.mediaDevices`, então
          transmitir é impossível aqui - e a mensagem que aparecia ao clicar
          ("Não foi possível acessar a câmera ou o microfone") faz a pessoa
          procurar defeito na webcam, que não tem nada a ver. */}
      {soAssiste && (
        <div className="mx-3 sm:mx-4 mt-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-amber-300 text-sm leading-relaxed">
            <strong className="font-bold">Neste endereço você só assiste.</strong>{' '}
            O navegador só libera captura de tela e câmera em páginas HTTPS. Para
            transmitir, abra a versão HTTPS deste site - ou use o aplicativo de
            desktop, que não tem essa limitação e ainda abre um túnel com
            certificado para o seu servidor.
          </p>
        </div>
      )}

      {aviso && (
        <div className="mx-3 sm:mx-4 mt-3 flex items-start justify-between gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10">
          <p className="text-red-300 text-sm leading-relaxed">{aviso}</p>
          <button
            onClick={onFecharAviso}
            className="text-red-300/70 hover:text-red-300 shrink-0"
            aria-label="Fechar aviso"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <main className="flex-1 min-h-0 mx-3 sm:mx-4 my-3">
        {visiveis.length === 0 ? (
          <div className="h-full min-h-[45dvh] flex flex-col items-center justify-center gap-3 rounded-[1.75rem] border border-dashed border-white/10 text-center px-6 py-14">
            <MonitorPlay size={34} className="text-zinc-700" aria-hidden="true" />
            <p className="font-black text-white">Ninguém transmitindo ainda</p>
            <p className="text-zinc-500 text-sm font-medium">
              Compartilhe sua tela ou ligue a câmera para começar.
            </p>
          </div>
        ) : (
          <div className={cn('grid gap-3', gradeDoPalco)}>
            {visiveis.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'group relative overflow-hidden rounded-[1.5rem] border bg-black aspect-video',
                  fixada === item.id ? 'border-green-500/60' : 'border-white/10'
                )}
              >
                <Video stream={item.stream} mudo={item.local} />

                {/* Clicar no quadro escolhe qual tela fica na frente. É o que
                    faltava para conseguir ver UMA tela específica: antes a
                    ordem era a de chegada e não havia como mudar. */}
                <button
                  onClick={() => setFixada(fixada === item.id ? null : item.id)}
                  title={fixada === item.id ? 'Desafixar' : 'Ver esta tela na frente'}
                  aria-label={fixada === item.id ? `Desafixar ${item.nome}` : `Ver ${item.nome} na frente`}
                  aria-pressed={fixada === item.id}
                  className="absolute inset-0 w-full h-full cursor-pointer"
                />

                <span className="absolute left-3 bottom-3 max-w-[calc(100%-24px)] inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-sm text-green-400 text-xs font-bold pointer-events-none">
                  {item.kind === 'camera' ? (
                    <Camera size={13} aria-hidden="true" />
                  ) : (
                    <MonitorPlay size={13} aria-hidden="true" />
                  )}
                  <span className="truncate">{item.nome}</span>
                  <Resolucao stream={item.stream} />
                </span>

                {fixada === item.id && (
                  <span className="absolute left-3 top-3 px-2.5 py-1 rounded-lg bg-green-500/90 text-black text-[10px] font-black uppercase tracking-wider pointer-events-none">
                    fixada
                  </span>
                )}
                {item.local && (
                  <button
                    onClick={() => onEncerrarStream(item.id)}
                    title="Encerrar esta transmissão"
                    aria-label={`Encerrar ${item.nome}`}
                    className="absolute top-3 right-3 grid place-items-center w-10 h-10 rounded-xl bg-black/70 backdrop-blur-sm text-red-300 border border-red-500/30 transition-colors hover:bg-red-500/25 hover:text-red-200"
                  >
                    <X size={17} />
                  </button>
                )}
              </div>
            ))}

            {Array.from({ length: vagas }).map((_, indice) => (
              <div
                key={`vaga-${indice}`}
                className="hidden sm:flex aspect-video flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-dashed border-white/10"
              >
                <MonitorPlay size={22} className="text-zinc-800" aria-hidden="true" />
                <span className="text-zinc-700 text-xs font-bold">vaga livre</span>
              </div>
            ))}
          </div>
        )}

        {escondidas > 0 && (
          <p className="mt-3 text-center text-xs text-zinc-600 font-medium">
            {escondidas} fora do palco - aumente a divisão, ou clique numa tela para trazê-la à frente.
          </p>
        )}
      </main>

      {/* Áudio sem imagem: continua tocando, mas não ocupa o palco. */}
      {soSom.map((s) => (
        <div key={s.id} className="hidden" aria-hidden="true">
          <Video stream={s.stream} mudo={false} />
        </div>
      ))}

      {/* No celular a barra ocupa a largura toda, ao alcance do polegar. Num
          monitor isso vira quatro botões gigantes, então ali ela encolhe e
          centraliza. */}
      <nav className="flex sm:hidden gap-2 mx-3 mb-3 p-2 rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl">
        <button
          onClick={onCompartilharTela}
          disabled={!temTela}
          title={temTela ? 'Transmitir tela' : soAssiste ? 'Precisa de HTTPS para transmitir a tela' : 'Não disponível neste navegador'}
          className={cn(
            acao,
            'text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent'
          )}
        >
          <MonitorUp size={19} aria-hidden="true" />
          Tela
        </button>

        <button
          onClick={onLigarCamera}
          disabled={soAssiste}
          title={soAssiste ? 'Precisa de HTTPS para acessar a câmera' : 'Ligar câmera'}
          className={cn(
            acao,
            'text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent'
          )}
        >
          <Camera size={19} aria-hidden="true" />
          Câmera
        </button>

        <button
          onClick={() => setPainelAberto(true)}
          className={cn(acao, 'text-zinc-400 hover:text-white hover:bg-white/5')}
        >
          <span className="relative grid place-items-center">
            <Users size={19} aria-hidden="true" />
            <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-green-500 text-black text-[10px] font-black">
              {total}
            </span>
          </span>
          Pessoas
        </button>

        <button onClick={onSair} className={cn(acao, 'text-red-400 hover:bg-red-500/10')}>
          <LogOut size={19} aria-hidden="true" />
          Sair
        </button>
      </nav>

      {configAberta && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setConfigAberta(false)}
        >
          <div
            className="w-full max-w-lg max-h-[80dvh] overflow-y-auto rounded-[1.75rem] border border-white/10 bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-9 h-9 rounded-xl bg-green-500/10 text-green-400 shrink-0">
                  <Settings size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-black text-white leading-tight">Configuração</h2>
                  <p className="text-xs text-zinc-500 font-medium">
                    Vale para a próxima transmissão que você começar.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfigAberta(false)}
                className="grid place-items-center w-9 h-9 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors shrink-0"
                aria-label="Fechar"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-6">
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">
                  Qualidade
                </h3>
                <div className="flex flex-col gap-2">
                  {QUALIDADES.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => onQualidadeChange(q.id)}
                      className={cn(
                        pastilha,
                        qualidade === q.id
                          ? 'border-green-500/40 bg-green-500/10 text-green-400'
                          : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-100'
                      )}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </section>

              {temTela && (
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">
                    Áudio ao transmitir
                  </h3>
                  <div className="flex flex-col gap-2">
                    {MODOS_AUDIO.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => onModoAudioChange(m.id)}
                        className={cn(
                          pastilha,
                          modoAudio === m.id
                            ? 'border-green-500/40 bg-green-500/10 text-green-400'
                            : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-100'
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-zinc-600 leading-relaxed font-medium">
                    {pegarModoAudio(modoAudio).resumo}
                  </p>
                </section>
              )}
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => setConfigAberta(false)}
                className="w-full py-3 rounded-xl bg-green-500 text-black font-black text-sm transition-colors hover:bg-green-400"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {painelAberto && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPainelAberto(false)}
        >
          <div
            className="w-full max-w-md max-h-[74dvh] overflow-y-auto rounded-[1.75rem] border border-white/10 bg-zinc-950 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-white">Na sala ({total})</h2>
              <button
                onClick={() => setPainelAberto(false)}
                className="grid place-items-center w-9 h-9 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Fechar"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-green-500/20 bg-green-500/[0.06]">
                <span className="grid place-items-center w-9 h-9 rounded-xl bg-green-500/15 text-green-400 text-xs font-black shrink-0">
                  {(nome || 'VC').slice(0, 2).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0 truncate text-sm font-bold text-white">
                  {nome || 'Você'} <span className="text-zinc-500 font-medium">(você)</span>
                </span>
                {pingMs > 0 && <span className="text-green-400 text-xs font-bold">{pingMs}ms</span>}
              </div>

              {participantes.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-white/5 bg-white/[0.03]"
                >
                  <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/5 text-zinc-400 text-xs font-black shrink-0">
                    {p.nomeExibido.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-sm font-bold text-white">
                    {p.nomeExibido}
                  </span>
                  {p.pingMs > 0 && <span className="text-green-400 text-xs font-bold">{p.pingMs}ms</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
