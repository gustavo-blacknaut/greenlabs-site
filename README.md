<div align="center">

<img src="public/images/logo-512.png" width="96" alt="GreenLabs">

# GreenLabs Web

**Entre na chamada sem baixar nada.**

Abre no navegador, sem conta e sem limite de tempo.

[![Ver o site](https://img.shields.io/badge/Abrir-no%20navegador-16A34A?style=for-the-badge)](https://labs.greencodes.com.br)
&nbsp;
![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square)
![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=flat-square)
![Estático](https://img.shields.io/badge/build-est%C3%A1tico-6B7280?style=flat-square)

</div>

---

## O que é

A porta de entrada do [GreenLabs](https://github.com/gustavo-blacknaut/greenlabs-desktop):
uma página que deixa a pessoa escolher entre **baixar o aplicativo** ou
**entrar direto pelo navegador**. Nenhum dos dois caminhos pede conta.

Não há backend. O WebRTC roda no navegador e o servidor de sinalização é o de
quem hospeda a sala - o site é HTML estático do começo ao fim.

## Rodando

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # gera out/ pronto pra publicar
npm run typecheck  # tsc --noEmit
```

O build sai em `out/` como HTML estático - publica em Vercel, Netlify,
Cloudflare Pages, GitHub Pages ou qualquer host de arquivos.

---

## O que roda onde

| | Assistir | Câmera e microfone | Transmitir tela |
|---|:---:|:---:|:---:|
| Navegador no computador | ✅ | ✅ | ✅ |
| Navegador no celular | ✅ | ✅ | ❌ |

Transmitir tela pelo navegador é coisa de computador: nenhum navegador móvel
implementa `getDisplayMedia`
([caniuse](https://caniuse.com/mdn-api_mediadevices_getdisplaymedia)). Para
transmitir a tela do celular existe o
[aplicativo Android](https://github.com/gustavo-blacknaut/greenlabs-android),
que usa `MediaProjection` nativo.

---

## Duas coisas que valem saber

### Precisa de HTTPS

Duas restrições do navegador se somam aqui:

- `getDisplayMedia` e `getUserMedia` só funcionam em *secure context*
- uma página em HTTPS **não consegue** abrir `ws://` (mixed content)

Publicado em HTTPS, o site só conecta em servidores `wss://`. Endereços
digitados sem esquema já viram `wss://` automaticamente, e um `ws://` colado à
mão gera um aviso antes da tentativa - em vez do erro cru do navegador, que não
explica nada.

### Áudio ao transmitir

Não existe API web para tirar o som de um aplicativo específico da captura. O
navegador não expõe áudio por processo, e fazer isso no sistema operacional
exige API nativa - é por isso que o aplicativo de Windows usa WASAPI, e por isso
que o próprio Discord precisa de um aplicativo de computador para o mesmo.

O que dá para escolher, e o site deixa explícito:

| Modo | O que entra |
| --- | --- |
| Só uma aba | apenas o áudio daquela aba |
| Som do sistema | tudo que sai do computador |
| Sem áudio | só a imagem |

O primeiro modo resolve o caso comum: compartilhando a aba do jogo ou do vídeo,
uma chamada tocando em outro aplicativo não vai junto.

---

## Estrutura

```
src/
├── app/
│   ├── layout.tsx        metadata, fontes, PWA
│   ├── page.tsx          landing
│   ├── downloads/        todas as plataformas num lugar só
│   ├── call/page.tsx     estado da chamada
│   └── globals.css       tema (Tailwind v4 + oklch)
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── home/             Hero, Recursos, Compatibilidade
│   ├── downloads/        CartaoDeDownload
│   └── call/             EntrarSala, SalaAoVivo
└── lib/
    ├── useCall.ts        WebSocket + RTCPeerConnection por participante
    ├── webrtc.ts         qualidades, ICE, modos de áudio, normalização
    ├── storage.ts        preferências no localStorage
    ├── servers.ts        servidores públicos
    ├── links.ts          repositórios e releases
    ├── utils.ts          cn()
    └── fonts.ts
```

**O que fica salvo:** apelido, endereço do servidor, sala e os últimos
servidores usados - tudo no `localStorage` do navegador. Nada sai do
dispositivo, porque não existe servidor nosso para receber.

**Os links de download apontam para `releases/latest`**, e não para uma versão
fixa: uma versão nova aparece no site sozinha, sem precisar publicar o site de
novo.

---

## O resto do GreenLabs

| | |
| --- | --- |
| [greenlabs-desktop](https://github.com/gustavo-blacknaut/greenlabs-desktop) | Aplicativo para Windows e Linux |
| [greenlabs-windows](https://github.com/gustavo-blacknaut/greenlabs-windows) | Cliente nativo em C++, mais leve |
| [greenlabs-android](https://github.com/gustavo-blacknaut/greenlabs-android) | Aplicativo Android |
| [greenlabs-server](https://github.com/gustavo-blacknaut/greenlabs-server) | Servidor, um binário só |

---

Um projeto [GreenCodes](https://greencodes.com.br).
