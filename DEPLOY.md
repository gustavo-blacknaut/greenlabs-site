# Publicar na VPS

O site é estático: `next build` cospe uma pasta de HTML, CSS e JS e nada
mais. Não há Node rodando em produção, não há banco, não há processo para
reiniciar. O nginx serve arquivos e acabou.

O que **não** é estático é a sinalização - essa é o
[servidor Go](https://github.com/gustavo-blacknaut/greenlabs-server), um
processo separado. O site nunca fala com um backend nosso; ele fala com o
servidor de quem está hospedando a sala.

---

## Receita pronta: labs.greencodes.com.br com pm2 na 4068

Tudo na VPS, do zero. Se quiser entender o porquê de cada peça, o resto do
documento explica.

```bash
sudo apt update && sudo apt install -y git nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2 serve
```

```bash
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/gustavo-blacknaut/greenlabs-site.git
cd greenlabs-site
npm ci
npm run build
```

O build gera `out/` - cerca de 1,7 MB de HTML, CSS e JS.

```bash
pm2 start "serve out -l 4068 --no-clipboard" --name greenlabs-site
pm2 save
pm2 startup    # rode a linha que ele imprimir, para subir sozinho no boot
```

> **Por que `serve` e não `next start`.** Este site é export estático
> (`output: 'export'` no next.config). O `next start` recusa rodar nesse
> modo - ele existe para quem tem servidor Next de verdade. O `serve`
> entrega a pasta pronta e, o que importa aqui, resolve `/call` para
> `call.html` sozinho: sem isso o link de convite dá 404.

Confira antes de mexer no nginx:

```bash
curl -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4068/call
```

Tem que responder `200`.

nginx em `/etc/nginx/sites-available/labs.greencodes.com.br`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name labs.greencodes.com.br;

    location / {
        proxy_pass http://127.0.0.1:4068;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/labs.greencodes.com.br /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d labs.greencodes.com.br
```

O certbot reescreve o bloco acima para 443 e cria o redirecionamento do 80
sozinho.

Atualizar depois:

```bash
cd /var/www/greenlabs-site && git pull && npm ci && npm run build
pm2 restart greenlabs-site
```

> **Leia a seção 4 antes de divulgar o endereço.** Com o site em HTTPS, o
> navegador bloqueia todo servidor de sinalização em `ws://` - e o erro que
> aparece não diz isso.

---

## 1. Gerar os arquivos

Na sua máquina, dentro do repositório:

```bash
npm ci && npm run build
```

Sai em `out/` - cerca de 1,7 MB no total.

## 2. Mandar para a VPS

```bash
rsync -av --delete out/ usuario@sua-vps:/var/www/greenlabs/
```

O `--delete` importa: sem ele, os pedaços de JS da versão anterior ficam
para trás e a pasta cresce sem parar. Se preferir `scp`, apague o destino
antes.

## 3. nginx

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name greenlabs.seudominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name greenlabs.seudominio.com;

    ssl_certificate     /etc/letsencrypt/live/greenlabs.seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/greenlabs.seudominio.com/privkey.pem;

    root /var/www/greenlabs;
    index index.html;

    # O export estático grava /call como call.html. Sem o $uri.html aqui,
    # abrir greenlabs.seudominio.com/call devolve 404 - e é exatamente esse
    # o endereço que o link de convite manda para as pessoas.
    location / {
        try_files $uri $uri.html $uri/ /404.html;
    }

    # Tudo em /_next/static tem hash no nome: muda o conteúdo, muda o nome.
    # Pode ficar em cache para sempre sem risco de servir versão velha.
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

O certificado, se ainda não tiver:

```bash
sudo certbot --nginx -d greenlabs.seudominio.com
```

---

## 4. O detalhe que quebra tudo: `wss://`

Esta é a pegadinha, e ela só aparece depois que o site está no ar em HTTPS.

Uma página servida em HTTPS **não consegue** abrir uma conexão `ws://`. O
navegador bloqueia como conteúdo misto, sem pedir licença. Ou seja: com o
site em HTTPS, todo servidor de sinalização precisa estar em `wss://`.

O jeito mais simples é o mesmo nginx terminar o TLS e repassar para o Go:

```nginx
server {
    listen 443 ssl http2;
    server_name sinal.seudominio.com;

    ssl_certificate     /etc/letsencrypt/live/sinal.seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sinal.seudominio.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:25640;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host       $host;
        proxy_set_header X-Real-IP  $remote_addr;

        # Sinalização é uma conexão longa e silenciosa: fica aberta a chamada
        # inteira e passa minutos sem tráfego. Com o padrão de 60s o nginx
        # derruba todo mundo periodicamente, e o sintoma que chega é
        # "reconectando" no meio da conversa.
        proxy_read_timeout  3600s;
        proxy_send_timeout  3600s;
    }
}
```

E aí o endereço a divulgar é `sinal.seudominio.com` - sem porta, sem
esquema. O site resolve para `wss://` sozinho quando está em HTTPS.

> **Só o WebSocket passa pelo nginx.** Vídeo e áudio são WebRTC: vão
> direto entre os participantes por UDP, sem encostar no nginx nem no
> servidor Go. Continue liberando no firewall as portas UDP que o Go usa.

---

## 5. Atualizar depois

```bash
git pull && npm ci && npm run build
rsync -av --delete out/ usuario@sua-vps:/var/www/greenlabs/
```

Sem reload de nginx: são arquivos, e o `index.html` não tem cache longo.

---

## Alternativa sem VPS

O site é estático, então GitHub Pages, Cloudflare Pages e Netlify servem
ele de graça - aponte o build para `npm run build` e a pasta para `out/`.
A regra do `wss://` continua valendo: o servidor de sinalização precisa de
TLS de qualquer jeito.
