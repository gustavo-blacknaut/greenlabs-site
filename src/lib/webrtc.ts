// Helpers de mídia e endereço. O protocolo de sinalização é o mesmo do app de
// desktop, então um participante no navegador conversa normalmente com alguém
// no app de Windows ou Android.

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export type Qualidade = {
  id: string;
  label: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
};

export const QUALIDADES: Qualidade[] = [
  { id: '480p30', label: '480p 30fps - leve', width: 854, height: 480, fps: 30, bitrate: 900_000 },
  { id: '720p30', label: '720p 30fps', width: 1280, height: 720, fps: 30, bitrate: 2_200_000 },
  { id: '1080p30', label: '1080p 30fps', width: 1920, height: 1080, fps: 30, bitrate: 4_500_000 },
];
// Nada de 60 quadros por segundo pelo navegador.
//
// A captura de tela do navegador nao entrega isso de forma confiavel, e o que
// sai e uma transmissao que promete 60 e entrega menos, gastando o dobro da
// banda para chegar la. 1080p a 30 e o teto honesto aqui; quem quer mais tem o
// aplicativo nativo, que captura pela placa de video.

export const gerarId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function pegarQualidade(id: string): Qualidade {
  return QUALIDADES.find((q) => q.id === id) ?? QUALIDADES[1];
}

/**
 * Aceita o endereço com ou sem esquema e devolve ws:// ou wss://.
 *
 * Uma página em HTTPS não consegue abrir ws:// (mixed content), então o padrão
 * para endereços sem esquema acompanha o protocolo da página.
 */
function paginaEstaSegura(paginaSegura?: boolean): boolean {
  return paginaSegura ?? (typeof window !== 'undefined' && window.location.protocol === 'https:');
}

/**
 * Endereços a tentar, em ordem, para o que a pessoa digitou.
 *
 * Com esquema explícito, respeita a escolha e não inventa nada. Sem esquema,
 * a regra vem do protocolo da página:
 *
 * - página http (uso local): tenta `ws://` primeiro e `wss://` depois. A
 *   maioria dos servidores caseiros não tem TLS, e assumir `wss://` fazia
 *   endereços que funcionavam parar de conectar.
 * - página https: só `wss://`. O navegador bloqueia `ws://` a partir de uma
 *   página segura (mixed content), então tentar seria perder tempo.
 */
export function candidatosDeServidor(valor: string, paginaSegura?: boolean): string[] {
  const limpo = String(valor || '').trim().replace(/\/+$/, '');
  if (!limpo) return [];
  if (limpo.startsWith('ws://') || limpo.startsWith('wss://')) return [limpo];
  if (limpo.startsWith('https://')) return [`wss://${limpo.slice(8)}`];
  if (limpo.startsWith('http://')) return [`ws://${limpo.slice(7)}`];
  return paginaEstaSegura(paginaSegura)
    ? [`wss://${limpo}`]
    : [`ws://${limpo}`, `wss://${limpo}`];
}

/** O primeiro candidato: o que a interface mostra como "vai conectar em". */
export function normalizarServidor(valor: string, paginaSegura?: boolean): string {
  return candidatosDeServidor(valor, paginaSegura)[0] ?? '';
}

/**
 * Avisa antes de tentar conectar: o erro que o navegador dá ao bloquear mixed
 * content não explica nada, e a pessoa fica achando que digitou errado.
 */
export function checarMixedContent(enderecoNormalizado: string): string | null {
  if (typeof window === 'undefined') return null;
  if (window.location.protocol !== 'https:') return null;
  if (!enderecoNormalizado.startsWith('ws://')) return null;
  return (
    'Este site está em HTTPS e o navegador bloqueia conexões ws:// a partir daqui. ' +
    'Use um servidor com wss:// (o túnel do aplicativo já entrega isso) ou use o aplicativo.'
  );
}

/**
 * Por que a conexão não abriu, com a hipótese mais provável na frente.
 *
 * "Verifique o endereço do servidor" era a resposta para tudo, e no caso mais
 * comum ela mandava a pessoa para o lugar errado: o endereço estava certo, o
 * que faltava era TLS no servidor.
 *
 * O navegador não conta o motivo de um WebSocket falhar - de propósito, porque
 * a diferença entre "recusou" e "não existe" já seria varredura de porta. O que
 * dá para fazer é olhar o que sabemos: numa página HTTPS o endereço vira
 * `wss://` obrigatoriamente, e a esmagadora maioria dos servidores de
 * sinalização sobe em `ws://` puro. Falhou sem nem abrir, nessa combinação, é
 * quase sempre isso.
 */
export function motivoDaFalha(urlTentada: string): string {
  const paginaSegura = typeof window !== 'undefined' && window.location.protocol === 'https:';

  if (paginaSegura && urlTentada.startsWith('wss://')) {
    return (
      'Não foi possível conectar. Como este site está em HTTPS, o navegador só ' +
      'aceita servidor com TLS (wss://) - e a maioria sobe sem. Se o servidor é ' +
      'seu, coloque-o atrás de um proxy com certificado; se não, peça o endereço ' +
      'wss:// a quem hospeda. O aplicativo de desktop não tem essa restrição.'
    );
  }

  return 'Não foi possível conectar. Verifique o endereço do servidor e se ele está no ar.';
}

export async function ajustarSender(
  sender: RTCRtpSender | null,
  qualidade: Qualidade
): Promise<void> {
  if (!sender || sender.track?.kind !== 'video') return;
  try {
    const params = sender.getParameters();
    // "balanced", e nao "maintain-resolution".
    //
    // maintain-resolution manda o navegador NUNCA encolher a imagem: quando o
    // encoder nao da conta, ele derruba quadro. Parece a escolha certa para
    // tela (texto fica legivel), e e a escolha errada quando o encoder esta em
    // software - que e o caso de quase todo mundo transmitindo pelo navegador.
    //
    // Medido: 1080p custa 101 ms por quadro para codificar aqui, e 720p custa
    // 40 ms. A 101 ms o teto e ~10 quadros por segundo, e com
    // maintain-resolution o resultado entregue foi 1920x1080 a 6 fps - uma
    // sequencia de fotos. Quem assiste chama isso de travando, e nao ha perda
    // de pacote nenhuma no caminho: a imagem simplesmente nao e produzida.
    //
    // Com balanced o navegador encolhe a resolucao quando precisa e mantem o
    // movimento. Uma tela um pouco menor e fluida se le melhor do que uma tela
    // cheia que anda de dois em dois segundos.
    params.degradationPreference = 'balanced';
    if (!params.encodings?.length) params.encodings = [{}];
    params.encodings[0].maxBitrate = qualidade.bitrate;
    params.encodings[0].maxFramerate = qualidade.fps;
    await sender.setParameters(params);
  } catch {
    // setParameters é best-effort; se o navegador recusar, a chamada continua.
  }
}

export type Participante = {
  id: string;
  name: string;
  pingMs: number;
};

export type ParticipanteFormatado = Participante & { nomeExibido: string };

/** Nomes repetidos ganham sufixo para dar pra diferenciar na lista. */
export function formatarParticipantes(lista: Participante[]): ParticipanteFormatado[] {
  const contagem: Record<string, number> = {};
  return lista.map((item) => {
    const base = (item.name || 'Usuário').trim();
    contagem[base] = (contagem[base] || 0) + 1;
    const n = contagem[base];
    return { ...item, nomeExibido: n === 1 ? base : `${base} (${n})` };
  });
}

export const podeCompartilharTela = (): boolean =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;

/**
 * Modos de áudio ao compartilhar tela **no navegador**.
 *
 * Não existe API web para tirar o som de um app específico (o Discord, por
 * exemplo) da captura: o navegador não expõe áudio por processo, e fazer isso
 * no sistema operacional exige API nativa. É por isso que o app de Windows do
 * GreenLabs usa WASAPI, e por isso que o próprio Discord precisa de um app
 * desktop para conseguir o mesmo.
 *
 * O que dá para escolher aqui é a *fonte* - e a primeira opção resolve o caso
 * comum: compartilhando uma aba, só o áudio dela é capturado.
 */
export type ModoAudio = {
  id: 'aba' | 'tudo' | 'mudo';
  label: string;
  resumo: string;
  constraints: DisplayMediaStreamOptions & Record<string, unknown>;
};

export const MODOS_AUDIO: ModoAudio[] = [
  {
    id: 'aba',
    label: 'Só o som de uma aba',
    resumo:
      'Escolha a aba do jogo ou do vídeo. Nada que toque fora dela entra na transmissão.',
    constraints: {
      audio: true,
      video: { displaySurface: 'browser' },
      selfBrowserSurface: 'exclude',
    },
  },
  {
    id: 'tudo',
    label: 'Som do sistema',
    resumo:
      'Tudo que sai do computador vai junto - inclusive chamadas de voz de outros aplicativos.',
    constraints: { audio: true, systemAudio: 'include' },
  },
  {
    id: 'mudo',
    label: 'Sem áudio',
    resumo: 'Só a imagem. Use o microfone se quiser falar.',
    constraints: { audio: false, systemAudio: 'exclude' },
  },
];

export function pegarModoAudio(id: string): ModoAudio {
  return MODOS_AUDIO.find((m) => m.id === id) ?? MODOS_AUDIO[0];
}

/** Junta qualidade e modo de áudio nas constraints do getDisplayMedia. */
export function montarConstraintsDeTela(
  qualidade: Qualidade,
  modoAudioId: string
): DisplayMediaStreamOptions {
  const modo = pegarModoAudio(modoAudioId);
  const { video: videoDoModo, ...resto } = modo.constraints;
  return {
    ...resto,
    video: {
      ...(typeof videoDoModo === 'object' ? videoDoModo : {}),
      width: { ideal: qualidade.width, max: qualidade.width },
      height: { ideal: qualidade.height, max: qualidade.height },
      frameRate: { ideal: qualidade.fps, max: qualidade.fps },
    },
  } as DisplayMediaStreamOptions;
}

/**
 * Numa pagina HTTP nao da para transmitir - so assistir.
 *
 * `navigator.mediaDevices` inteiro so existe em contexto seguro (HTTPS, ou
 * localhost). Numa pagina HTTP servida por um dominio publico ele e
 * `undefined`, entao nao ha captura de tela nem de camera. `RTCPeerConnection`
 * continua funcionando, e por isso assistir funciona normalmente.
 *
 * Isto e o outro lado da moeda do `ws://`: uma pagina HTTPS bloqueia servidor
 * sem TLS, e uma pagina HTTP nao deixa capturar. As duas exigencias se
 * contradizem e nao existe endereco que atenda as duas - quem precisa das duas
 * coisas ou poe TLS no servidor (o aplicativo abre um tunel que faz isso de
 * graca) ou usa o proprio aplicativo, que nao tem essa restricao.
 */
export function soDaParaAssistir(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.isSecureContext;
}
