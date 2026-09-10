'use client';

import { useState, useSyncExternalStore } from 'react';
import EntrarSala from '@/components/call/EntrarSala';
import SalaAoVivo from '@/components/call/SalaAoVivo';
import { useCall } from '@/lib/useCall';
import {
  montarConstraintsDeTela,
  pegarQualidade,
  podeCompartilharTela,
} from '@/lib/webrtc';
import { lembrarServidor, salvarPreferencias } from '@/lib/storage';

// `getDisplayMedia` só existe no navegador, então o HTML estático sai com
// `false` e o valor certo aparece na hidratação. Isso era um useEffect que
// chamava setState - funcionava, mas é uma renderização em cascata à toa, e
// useSyncExternalStore existe exatamente para "valor de fora do React com uma
// resposta diferente no servidor". O `subscribe` não faz nada de propósito: o
// que o navegador suporta não muda durante a visita.
const semInscricao = () => () => {};
const noCliente = () => podeCompartilharTela();
const noServidor = () => false;

export default function CallPage() {
  const call = useCall();
  const [nome, setNome] = useState('');
  // Guardados na entrada porque o link de convite precisa dos dois.
  const [servidor, setServidor] = useState('');
  const [sala, setSala] = useState('call1');
  const [qualidade, setQualidade] = useState('720p30');
  const [modoAudio, setModoAudio] = useState('aba');
  const [aviso, setAviso] = useState('');
  const temTela = useSyncExternalStore(semInscricao, noCliente, noServidor);

  const entrar = async (dados: { nome: string; servidor: string; sala: string }) => {
    setNome(dados.nome);
    setServidor(dados.servidor);
    setSala(dados.sala);
    salvarPreferencias(dados);
    try {
      await call.conectar(dados);
      lembrarServidor(dados.servidor);
    } catch (err) {
      call.setErro(err instanceof Error ? err.message : 'Não foi possível conectar.');
    }
  };

  const compartilharTela = async () => {
    const q = pegarQualidade(qualidade);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(
        montarConstraintsDeTela(q, modoAudio)
      );
      await call.publicarStream('screen', `Tela - ${nome || 'você'}`, stream, q);
      setAviso('');
    } catch (err) {
      // Cancelar na caixa do navegador não é erro; não vale mostrar aviso.
      if ((err as DOMException)?.name !== 'NotAllowedError') {
        setAviso('Não foi possível transmitir a tela.');
      }
    }
  };

  const ligarCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      await call.publicarStream('camera', `Câmera - ${nome || 'você'}`, stream, pegarQualidade('720p30'));
      setAviso('');
    } catch (err) {
      if ((err as DOMException)?.name !== 'NotAllowedError') {
        setAviso('Não foi possível acessar a câmera ou o microfone.');
      }
    }
  };

  if (!call.conectado) {
    return (
      <EntrarSala
        conectando={call.conectando}
        erro={call.erro}
        temTela={temTela}
        qualidade={qualidade}
        onQualidadeChange={setQualidade}
        onEntrar={entrar}
      />
    );
  }

  return (
    <SalaAoVivo
      nome={nome}
      servidor={servidor}
      sala={sala}
      pingMs={call.pingMs}
      reconectando={call.reconectando}
      streams={call.streams}
      participantes={call.participantes}
      temTela={temTela}
      modoAudio={modoAudio}
      qualidade={qualidade}
      aviso={aviso}
      onModoAudioChange={setModoAudio}
      onQualidadeChange={setQualidade}
      onCompartilharTela={compartilharTela}
      onLigarCamera={ligarCamera}
      onEncerrarStream={call.removerStreamLocal}
      onSair={call.desconectar}
      onFecharAviso={() => setAviso('')}
    />
  );
}
