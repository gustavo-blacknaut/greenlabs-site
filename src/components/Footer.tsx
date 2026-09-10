import Image from 'next/image';
import Link from 'next/link';
import { HOSTMINE, REPO, REPO_MOBILE, REPO_SERVER, REPO_WINDOWS } from '@/lib/links';

const COLUNAS = [
  {
    titulo: 'Baixar',
    // Uma entrada so, apontando para a pagina: manter a lista aqui obrigava a
    // atualizar dois lugares a cada plataforma nova, e o rodape sempre ficava
    // para tras.
    itens: [{ nome: 'Todas as versões', href: '/downloads' }],
  },
  {
    titulo: 'Código',
    itens: [
      { nome: 'Aplicativo', href: REPO },
      { nome: 'App Android', href: REPO_MOBILE },
      { nome: 'Cliente nativo', href: REPO_WINDOWS },
      { nome: 'Servidor', href: REPO_SERVER },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black">
      <div className="mx-auto w-full max-w-7xl 2xl:max-w-[88rem] px-4 sm:px-6 lg:px-10 py-14 lg:py-20 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-2">
          <Link href="/" className="flex items-center gap-3 mb-4 w-fit">
            <Image src="/images/logo-96.png" alt="" width={32} height={32} className="object-contain" />
            <span className="font-black tracking-tighter text-white">GreenLabs</span>
          </Link>
          <p className="text-zinc-500 text-sm max-w-xs leading-relaxed font-medium">
            Transmissão de tela e chamadas no seu próprio servidor. Sem conta,
            sem intermediário.
          </p>
        </div>

        {COLUNAS.map((coluna) => (
          <div key={coluna.titulo}>
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-green-500 mb-4">
              {coluna.titulo}
            </h2>
            <ul className="flex flex-col gap-2.5">
              {coluna.itens.map((item) => (
                <li key={item.nome}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-zinc-500 hover:text-green-400 transition-colors font-medium"
                  >
                    {item.nome}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/5">
        <div className="mx-auto w-full max-w-7xl 2xl:max-w-[88rem] px-4 sm:px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-zinc-600 font-medium">
            GreenLabs - um projeto{' '}
            <a
              href="https://greencodes.com.br"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-500 hover:text-green-400 transition-colors"
            >
              GreenCodes
            </a>
          </p>
          <p className="text-xs text-zinc-600 font-medium">
            Servidor público por{' '}
            <a
              href={HOSTMINE}
              target="_blank"
              rel="noreferrer sponsored"
              className="text-zinc-500 hover:text-green-400 transition-colors"
            >
              Hostmine
            </a>
            <span className="mx-2 text-zinc-800">·</span>
            Vídeo e áudio nunca passam por um servidor nosso.
          </p>
        </div>
      </div>
    </footer>
  );
}
