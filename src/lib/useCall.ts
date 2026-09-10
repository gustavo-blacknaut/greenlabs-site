'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ICE_SERVERS,
  ajustarSender,
  formatarParticipantes,
  gerarId,
  candidatosDeServidor,
  motivoDaFalha,
  type ParticipanteFormatado,
  type Qualidade,
} from './webrtc';

export type StreamNaTela = {
  id: string;
  stream: MediaStream;
  nome: string;
  local: boolean;
  peerId?: string;
  quality?: Qualidade;
  kind?: 'screen' | 'camera';
  /**
   * Se tem imagem para mostrar.
   *
   * Com o servidor retransmitindo, chega uma faixa de áudio mesmo quando
   * ninguém está com microfone aberto - o m-line de áudio existe desde a
   * primeira oferta. Sem esta marca isso virava um quadro "Participante -
   * áudio" ocupando uma vaga do palco, e quem parava de transmitir a tela via
   * o quadro fantasma continuar ali e concluía que não tinha parado.
   */
  temVideo: boolean;
};

type MensagemSinalizacao = {
  type: string;
  from?: string;
  to?: string;
  peerId?: string;
  peers?: Array<{ peerId: string; name: string; pingMs?: number }>;
  name?: string;
  kind?: 'screen' | 'camera';
  pings?: Record<string, number>;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  streamId?: string;
  id?: string;

  // O servidor avisa na entrada que está retransmitindo o vídeo. Nesse modo
  // quem negocia mídia é ele, e abrir conexão com cada pessoa cria uma malha
  // inútil em paralelo - com as duas negociações se atropelando.
  sfu?: boolean;
};

/**
 * Cliente da chamada: um WebSocket para sinalização e uma RTCPeerConnection por
 * participante (topologia em malha).
 */
export function useCall() {
  const [conectado, setConectado] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [erro, setErro] = useState('');
  const [streams, setStreams] = useState<StreamNaTela[]>([]);
  const [participantes, setParticipantes] = useState<ParticipanteFormatado[]>([]);
  const [pingMs, setPingMs] = useState(0);
  const [reconectando, setReconectando] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef(new Map<string, RTCPeerConnection>());

  // O servidor esta retransmitindo? Nesse modo quem negocia e ele.
  const modoSfuRef = useRef(false);
  const streamsLocaisRef = useRef<StreamNaTela[]>([]);
  const nomesRef = useRef(new Map<string, { nome: string; ping: number }>());
  const metaRef = useRef(new Map<string, { name: string; kind?: string }>());
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enviadoEmRef = useRef(0);
  const desligandoRef = useRef(false);
  const pingMsRef = useRef(0);
  const dadosRef = useRef<{ servidor: string; nome: string; sala: string } | null>(null);
  const tentativasRef = useRef(0);
  const reconexaoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conectarRef = useRef<
    (dados: { servidor: string; nome: string; sala: string }, ehReconexao?: boolean) => Promise<void>
  >(async () => {});

  useEffect(() => {
    pingMsRef.current = pingMs;
  }, [pingMs]);

  const enviar = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  }, []);

  /**
   * Avisa todo mundo na sala, sem depender das conexões ponto a ponto.
   *
   * `stream-meta` e `stream-ended` são recado entre pessoas, não negociação de
   * mídia. Eram mandados percorrendo as conexões abertas, o que funciona na
   * malha - lá existe uma conexão por participante. Com o servidor
   * retransmitindo existe UMA conexão, a do próprio servidor, e mensagem
   * endereçada a ele é tratada como negociação e não chega a ninguém: o nome de
   * quem transmite aparecia como "Participante" para todos, e o aviso de fim
   * nunca saía.
   *
   * A lista de quem está na sala já está aqui, então o recado vai para cada um
   * pelo id.
   */
  const avisarTodos = useCallback(
    (base: Record<string, unknown>) => {
      for (const peerId of nomesRef.current.keys()) {
        enviar({ ...base, to: peerId });
      }
    },
    [enviar]
  );

  const sincronizarParticipantes = useCallback(() => {
    const lista = [...nomesRef.current.entries()].map(([peerId, dados]) => ({
      id: peerId,
      name: dados.nome,
      pingMs: dados.ping || 0,
    }));
    setParticipantes(formatarParticipantes(lista));
  }, []);

  // Declarado como ref para quebrar o ciclo criarPeer <-> fazerOferta, que
  // se referenciam mutuamente.
  const fazerOfertaRef = useRef<(peerId: string, iceRestart?: boolean) => Promise<void>>(
    async () => {}
  );

  const criarPeer = useCallback(
    (peerId: string): RTCPeerConnection => {
      const existente = peersRef.current.get(peerId);
      if (existente) return existente;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peersRef.current.set(peerId, pc);

      let temVideoLocal = false;
      let temAudioLocal = false;
      for (const item of streamsLocaisRef.current) {
        for (const track of item.stream.getTracks()) {
          const sender = pc.addTrack(track, item.stream);
          if (track.kind === 'video') {
            temVideoLocal = true;
            if (item.quality) void ajustarSender(sender, item.quality);
          } else {
            temAudioLocal = true;
          }
        }
      }

      // Sem mídia local, a oferta sairia sem nenhuma m-line - e uma resposta
      // não pode criar m-line. Quem já estava transmitindo recebia essa oferta
      // vazia e não tinha onde encaixar a faixa: o vídeo simplesmente nunca
      // saía, e quem entrou via "Ninguém transmitindo ainda" com alguém
      // transmitindo do outro lado.
      //
      // Reservar as m-lines de recepção resolve nos dois sentidos e vale para
      // quem entra depois de a transmissão já ter começado, que é o caso comum.
      if (!temVideoLocal) pc.addTransceiver('video', { direction: 'recvonly' });
      if (!temAudioLocal) pc.addTransceiver('audio', { direction: 'recvonly' });

      pc.onicecandidate = (ev) => {
        if (ev.candidate) enviar({ type: 'ice', to: peerId, candidate: ev.candidate });
      };

      pc.ontrack = (ev) => {
        // Nem toda faixa vem com uma stream associada - depende de como o outro
        // lado chamou addTrack. Antes isso era descartado em silêncio: o vídeo
        // chegava e nenhum card aparecia, dando a impressão de que ninguém
        // estava transmitindo. Sem stream, monta-se uma a partir da faixa.
        const stream = ev.streams[0] ?? new MediaStream([ev.track]);
        const id = `${peerId}:${stream.id}`;

        const atualizar = () => {
          const temVideo = stream.getVideoTracks().length > 0;
          const dono = nomesRef.current.get(peerId)?.nome ?? 'Participante';
          setStreams((atual) => {
            const meta = metaRef.current.get(id);
            const nome = meta?.name ?? `${dono} - ${temVideo ? 'tela' : 'áudio'}`;
            const existente = atual.find((s) => s.id === id);
            if (existente) {
              // O card já existe: o rótulo e a presença de vídeo podem mudar,
              // porque o vídeo costuma chegar depois do áudio.
              if (existente.nome === nome && existente.temVideo === temVideo) return atual;
              return atual.map((s) => (s.id === id ? { ...s, nome, temVideo } : s));
            }
            return [...atual, { id, stream, local: false, peerId, nome, temVideo }];
          });
        };

        atualizar();
        // Faixas podem entrar depois na mesma stream (o áudio da tela chega
        // após o vídeo, por exemplo).
        stream.addEventListener('addtrack', atualizar);
        stream.addEventListener('removetrack', () => {
          if (stream.getTracks().length === 0) {
            setStreams((atual) => atual.filter((s) => s.id !== id));
          } else {
            atualizar();
          }
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') void fazerOfertaRef.current(peerId, true);
      };

      return pc;
    },
    [enviar]
  );

  const fazerOferta = useCallback(
    async (peerId: string, iceRestart = false) => {
      const pc = peersRef.current.get(peerId) ?? criarPeer(peerId);
      try {
        const offer = await pc.createOffer({ iceRestart });
        await pc.setLocalDescription(offer);
        enviar({ type: 'offer', to: peerId, sdp: pc.localDescription });
      } catch {
        // Uma oferta que falha é retomada pelo onconnectionstatechange.
      }
    },
    [criarPeer, enviar]
  );

  useEffect(() => {
    fazerOfertaRef.current = fazerOferta;
  }, [fazerOferta]);

  const removerPeer = useCallback(
    (peerId: string) => {
      peersRef.current.get(peerId)?.close();
      peersRef.current.delete(peerId);
      nomesRef.current.delete(peerId);
      setStreams((atual) => atual.filter((s) => s.peerId !== peerId));
      sincronizarParticipantes();
    },
    [sincronizarParticipantes]
  );

  const removerStreamLocal = useCallback(
    async (id: string) => {
      const item = streamsLocaisRef.current.find((s) => s.id === id);
      streamsLocaisRef.current = streamsLocaisRef.current.filter((s) => s.id !== id);
      setStreams((atual) => atual.filter((s) => s.id !== id));
      if (!item) return;

      for (const track of item.stream.getTracks()) {
        try { track.stop(); } catch {}
      }

      avisarTodos({ type: 'stream-ended', id: item.id, streamId: item.stream.id });

      for (const [peerId, pc] of peersRef.current.entries()) {
        for (const sender of pc.getSenders()) {
          if (sender.track && item.stream.getTracks().includes(sender.track)) {
            try { pc.removeTrack(sender); } catch {}
          }
        }
        await fazerOferta(peerId);
      }
    },
    [avisarTodos, fazerOferta]
  );

  const publicarStream = useCallback(
    async (
      kind: 'screen' | 'camera',
      nome: string,
      stream: MediaStream,
      quality: Qualidade
    ): Promise<StreamNaTela> => {
      const item: StreamNaTela = {
        id: gerarId(),
        kind,
        nome,
        stream,
        quality,
        local: true,
        temVideo: stream.getVideoTracks().length > 0,
      };
      streamsLocaisRef.current = [...streamsLocaisRef.current, item];
      setStreams((atual) => [...atual, item]);

      for (const track of stream.getTracks()) {
        track.addEventListener('ended', () => void removerStreamLocal(item.id));
      }

      avisarTodos({
        type: 'stream-meta',
        id: item.id,
        streamId: stream.id,
        name: nome,
        kind,
      });

      for (const [peerId, pc] of peersRef.current.entries()) {
        for (const track of stream.getTracks()) {
          const sender = pc.addTrack(track, stream);
          if (track.kind === 'video') void ajustarSender(sender, quality);
        }
        await fazerOferta(peerId);
      }
      return item;
    },
    [avisarTodos, fazerOferta, removerStreamLocal]
  );

  const tratarMensagem = useCallback(
    async (msg: MensagemSinalizacao) => {
      switch (msg.type) {
        case 'joined': {
          modoSfuRef.current = msg.sfu === true;

          for (const peer of msg.peers ?? []) {
            nomesRef.current.set(peer.peerId, { nome: peer.name, ping: peer.pingMs || 0 });

            // Com o servidor retransmitindo, a lista serve só para mostrar quem
            // está na sala. Ele é que abre a conexão, e ofertar para cada
            // pessoa aqui monta a malha que o retransmissor existe para evitar.
            if (modoSfuRef.current) continue;

            criarPeer(peer.peerId);
            await fazerOferta(peer.peerId);
          }
          sincronizarParticipantes();
          return;
        }
        case 'peer-joined': {
          if (!msg.peerId) return;
          nomesRef.current.set(msg.peerId, { nome: msg.name ?? 'Participante', ping: 0 });
          if (!modoSfuRef.current) criarPeer(msg.peerId);
          sincronizarParticipantes();
          return;
        }
        case 'peer-left': {
          if (msg.peerId) removerPeer(msg.peerId);
          return;
        }
        case 'room-pings': {
          for (const [peerId, ping] of Object.entries(msg.pings ?? {})) {
            const atual = nomesRef.current.get(peerId);
            if (atual) atual.ping = ping;
          }
          sincronizarParticipantes();
          return;
        }
        case 'pong': {
          setPingMs(Math.max(1, Math.round(performance.now() - enviadoEmRef.current)));
          return;
        }
        case 'stream-meta': {
          if (msg.from && msg.streamId) {
            metaRef.current.set(`${msg.from}:${msg.streamId}`, {
              name: msg.name ?? '',
              kind: msg.kind,
            });
          }
          return;
        }
        case 'stream-ended': {
          setStreams((atual) => atual.filter((s) => s.id !== `${msg.from}:${msg.streamId}`));
          return;
        }
        case 'offer': {
          if (!msg.from || !msg.sdp) return;
          const pc = peersRef.current.get(msg.from) ?? criarPeer(msg.from);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          enviar({ type: 'answer', to: msg.from, sdp: pc.localDescription });
          return;
        }
        case 'answer': {
          if (!msg.from || !msg.sdp) return;
          const pc = peersRef.current.get(msg.from);
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          return;
        }
        case 'ice': {
          if (!msg.from || !msg.candidate) return;
          const pc = peersRef.current.get(msg.from);
          if (pc) {
            try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
          }
        }
      }
    },
    [criarPeer, enviar, fazerOferta, removerPeer, sincronizarParticipantes]
  );

  const MAX_TENTATIVAS = 6;

  /**
   * Tenta reconectar com espera crescente (1s, 2s, 4s… até 15s). Enquanto
   * tenta, a pessoa continua na tela da chamada com um aviso - só volta para
   * o formulário quando não há mais o que tentar.
   */
  const agendarReconexao = useCallback(() => {
    const dados = dadosRef.current;
    if (!dados) {
      setConectado(false);
      setConectando(false);
      setErro('A conexão com o servidor caiu.');
      return;
    }

    if (tentativasRef.current >= MAX_TENTATIVAS) {
      setConectado(false);
      setConectando(false);
      setReconectando(false);
      setErro('A conexão com o servidor caiu e não voltou. Verifique se ele ainda está no ar.');
      return;
    }

    tentativasRef.current += 1;
    setReconectando(true);
    const espera = Math.min(1000 * 2 ** (tentativasRef.current - 1), 15000);

    if (reconexaoTimerRef.current) clearTimeout(reconexaoTimerRef.current);
    reconexaoTimerRef.current = setTimeout(() => {
      if (desligandoRef.current) return;
      conectarRef.current(dados, true).catch(() => {
        // Falhou de novo: o onclose desta tentativa agenda a próxima.
      });
    }, espera);
  }, []);

  const conectar = useCallback(
    (
      { servidor, nome, sala }: { servidor: string; nome: string; sala: string },
      ehReconexao = false
    ) =>
      new Promise<void>((resolve, reject) => {
        // Sem esquema explícito numa página http, há mais de um endereço
        // plausível (ws:// e wss://). Tenta em ordem em vez de adivinhar um só.
        const candidatos = candidatosDeServidor(servidor);
        const url = candidatos[0];
        if (!url) {
          reject(new Error('Informe o endereço do servidor.'));
          return;
        }
        const proximo = candidatos[1];
        let abriuAlgumaVez = false;

        // Uma tentativa manual zera o contador: quem clicou de novo merece
        // o ciclo inteiro de tentativas outra vez.
        if (!ehReconexao) {
          tentativasRef.current = 0;
          setReconectando(false);
        }

        // Guardado para a reconexão automática poder repetir a entrada sem
        // pedir tudo de novo.
        dadosRef.current = { servidor, nome, sala };
        desligandoRef.current = false;
        setConectando(true);
        // O erro NÃO é limpo aqui.
        //
        // Limpar ao começar a tentativa fazia a explicação sumir no instante em
        // que a pessoa clicava de novo - e este texto é justamente o que diz
        // que falta TLS no servidor, que é longo e ninguém termina de ler antes
        // de tentar outra vez. Ele sai sozinho quando a conexão abre (onopen),
        // ou é substituído pelo motivo da falha seguinte.

        let ws: WebSocket;
        try {
          ws = new WebSocket(url);
        } catch {
          setConectando(false);
          reject(new Error('Endereço inválido.'));
          return;
        }
        wsRef.current = ws;

        // O WebSocket não conta o motivo da falha (por segurança), então um
        // timeout explícito dá uma mensagem melhor que "erro desconhecido".
        const limite = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            try { ws.close(); } catch {}
            setConectando(false);
            reject(
              new Error(motivoDaFalha(url))
            );
          }
        }, 10000);

        ws.onopen = () => {
          clearTimeout(limite);
          abriuAlgumaVez = true;
          setConectado(true);
          setConectando(false);
          setReconectando(false);
          setErro('');
          tentativasRef.current = 0;
          enviar({ type: 'join', roomId: sala || 'call1', name: nome || 'Visitante' });

          pingTimerRef.current = setInterval(() => {
            enviadoEmRef.current = performance.now();
            enviar({ type: 'ping', timestamp: Date.now(), rtt: pingMsRef.current });
          }, 2000);

          resolve();
        };

        ws.onmessage = (ev) => {
          try {
            void tratarMensagem(JSON.parse(ev.data as string) as MensagemSinalizacao);
          } catch {}
        };

        // Se o primeiro esquema não abrir, tenta o outro antes de desistir -
        // é o caso de quem digita só "meuservidor.com:25640".
        let tentouAlternativo = false;
        const tentarAlternativo = () => {
          if (tentouAlternativo || !proximo || abriuAlgumaVez) return false;
          tentouAlternativo = true;
          clearTimeout(limite);
          conectarRef.current({ servidor: proximo, nome, sala }, ehReconexao).then(resolve, reject);
          return true;
        };

        ws.onerror = () => {
          clearTimeout(limite);
          if (desligandoRef.current || ws.readyState === WebSocket.OPEN) return;
          if (tentarAlternativo()) return;
          setConectando(false);
          reject(new Error(motivoDaFalha(url)));
        };

        ws.onclose = () => {
          clearTimeout(limite);
          if (pingTimerRef.current) clearInterval(pingTimerRef.current);
          // Fechou sem nunca ter aberto: ainda vale tentar o outro esquema.
          if (!abriuAlgumaVez && !desligandoRef.current && tentarAlternativo()) return;
          // As conexões P2P morrem junto: sem sinalização não dá para
          // renegociar, e reentrar na sala refaz tudo do zero.
          for (const pc of peersRef.current.values()) pc.close();
          peersRef.current.clear();
          nomesRef.current.clear();
          metaRef.current.clear();
          setParticipantes([]);
          setStreams((atual) => atual.filter((s) => s.local));

          if (desligandoRef.current) {
            setConectado(false);
            setConectando(false);
            return;
          }

          // Quedas acontecem por motivos banais - o celular bloqueou a tela,
          // trocou de Wi-Fi, o proxy cortou por ociosidade. Devolver a pessoa
          // para o formulário nesses casos é pior do que tentar de novo.
          agendarReconexao();
        };
      }),
    [agendarReconexao, enviar, tratarMensagem]
  );

  useEffect(() => {
    conectarRef.current = conectar;
  }, [conectar]);

  // No celular, sair do app costuma matar o socket sem avisar. Ao voltar, não
  // vale esperar o próximo passo do backoff: tenta na hora.
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState !== 'visible') return;
      if (desligandoRef.current || !dadosRef.current) return;
      const ws = wsRef.current;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
      if (reconexaoTimerRef.current) clearTimeout(reconexaoTimerRef.current);
      tentativasRef.current = 0;
      setReconectando(true);
      conectarRef.current(dadosRef.current, true).catch(() => {});
    };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('online', aoVoltar);
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('online', aoVoltar);
    };
  }, []);

  const desconectar = useCallback(() => {
    desligandoRef.current = true;
    if (reconexaoTimerRef.current) clearTimeout(reconexaoTimerRef.current);
    dadosRef.current = null;
    tentativasRef.current = 0;
    setReconectando(false);
    for (const item of streamsLocaisRef.current) {
      for (const track of item.stream.getTracks()) {
        try { track.stop(); } catch {}
      }
    }
    streamsLocaisRef.current = [];
    setStreams([]);
    try { wsRef.current?.close(); } catch {}
  }, []);

  useEffect(() => () => desconectar(), [desconectar]);

  return {
    conectado,
    conectando,
    reconectando,
    erro,
    setErro,
    streams,
    participantes,
    pingMs,
    conectar,
    desconectar,
    publicarStream,
    removerStreamLocal,
  };
}
