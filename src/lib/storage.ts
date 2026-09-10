// Tudo que a pessoa configura fica no navegador dela. Não existe conta e não
// existe backend nosso - o servidor de sinalização é o dela.

const CHAVES = {
  nome: 'greenlabs:nome',
  servidor: 'greenlabs:servidor',
  sala: 'greenlabs:sala',
  servidoresRecentes: 'greenlabs:servidores',
} as const;

const LIMITE_RECENTES = 6;

export type Preferencias = {
  nome: string;
  servidor: string;
  sala: string;
};

function ler(chave: string, padrao = ''): string {
  if (typeof window === 'undefined') return padrao;
  try {
    return window.localStorage.getItem(chave) ?? padrao;
  } catch {
    // Modo privado do Safari pode barrar o acesso ao localStorage.
    return padrao;
  }
}

function gravar(chave: string, valor: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(chave, valor);
  } catch {}
}

export function carregarPreferencias(): Preferencias {
  return {
    nome: ler(CHAVES.nome),
    servidor: ler(CHAVES.servidor),
    sala: ler(CHAVES.sala, 'call1'),
  };
}

export function salvarPreferencias(prefs: Partial<Preferencias>): void {
  if (prefs.nome !== undefined) gravar(CHAVES.nome, prefs.nome);
  if (prefs.servidor !== undefined) gravar(CHAVES.servidor, prefs.servidor);
  if (prefs.sala !== undefined) gravar(CHAVES.sala, prefs.sala);
}

export function carregarServidoresRecentes(): string[] {
  try {
    const lista: unknown = JSON.parse(ler(CHAVES.servidoresRecentes, '[]'));
    return Array.isArray(lista) ? lista.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

/** Coloca o endereço no topo da lista, sem repetir. */
export function lembrarServidor(endereco: string): string[] {
  if (!endereco) return carregarServidoresRecentes();
  const atual = carregarServidoresRecentes().filter((s) => s !== endereco);
  const lista = [endereco, ...atual].slice(0, LIMITE_RECENTES);
  gravar(CHAVES.servidoresRecentes, JSON.stringify(lista));
  return lista;
}

export function esquecerServidor(endereco: string): string[] {
  const lista = carregarServidoresRecentes().filter((s) => s !== endereco);
  gravar(CHAVES.servidoresRecentes, JSON.stringify(lista));
  return lista;
}
