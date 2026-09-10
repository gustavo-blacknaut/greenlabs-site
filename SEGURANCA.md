# Segurança do site e da VPS

Duas partes: o que o navegador precisa receber (cabeçalhos) e o que a
máquina precisa ter fechado (firewall, SSH, nginx).

Tudo abaixo foi testado contra o site de verdade - a CSP em especial,
porque uma CSP errada não dá erro de build: ela apaga uma função em
silêncio, e a que morre primeiro aqui é justamente compartilhar tela.

---

## 1. Por que os cabeçalhos vão no nginx, e não no next.config

O site é `output: 'export'`. Não existe servidor Next em produção, e a
opção `headers()` do `next.config.ts` **não faz nada** nesse modo - ela
depende de um servidor Next atendendo a requisição. Quem responde é o
nginx, então é lá que os cabeçalhos existem.

## 2. Bloco de segurança do nginx

Salve em `/etc/nginx/snippets/greenlabs-seguranca.conf`:

```nginx
# --------------------------------------------------------------- transporte
# 2 anos, subdominios juntos. Só ligue o preload quando tiver certeza de que
# todo subdominio de greencodes.com.br fala HTTPS - a lista de preload é
# difícil de sair.
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

# ------------------------------------------------------------------ conteudo
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;

# --------------------------------------------------------------- permissoes
# ATENÇÃO: camera, microphone e display-capture PRECISAM continuar liberados
# para "self". O reflexo de negar tudo mata o compartilhamento de tela, e o
# sintoma é o botão não fazer nada - sem erro no console.
add_header Permissions-Policy "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=(), serial=(), midi=(), interest-cohort=()" always;

# ---------------------------------------------------------------------- CSP
#
# connect-src precisa de ws: e wss: com curinga de host, e isso é proposital:
# quem usa digita o endereço do PRÓPRIO servidor de sinalização. Uma lista fixa
# de hosts aqui quebraria o ponto do projeto, que é cada um rodar o seu.
#
# script-src com 'unsafe-inline': o Next injeta um script de arranque inline e
# num site estático não há como gerar nonce por requisição - não existe
# requisição, o HTML é o mesmo arquivo para todo mundo.
#
# media-src blob: é o vídeo das transmissões; sem isso a chamada fica muda e
# preta.
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self' ws: wss: https: blob:; worker-src 'self' blob:" always;

# Não anuncie a versão do nginx para quem está procurando alvo.
server_tokens off;
```

E no bloco do site:

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name labs.greencodes.com.br;

    include snippets/greenlabs-seguranca.conf;

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

> Cuidado com o `add_header` do nginx: ele **não é herdado** quando o bloco
> filho tem `add_header` próprio. Se puser um `add_header` dentro de um
> `location`, repita o `include` lá dentro, senão os outros somem sem aviso.

Conferir depois de recarregar:

```bash
curl -sI https://labs.greencodes.com.br | grep -iE "strict-transport|content-security|permissions|x-content|x-frame"
```

## 3. TLS

O certbot já configura bem. Se quiser conferir a nota, o
[SSL Labs](https://www.ssllabs.com/ssltest/) mostra o que ficou. O mínimo
razoável:

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;
```

---

## 4. Firewall

O padrão é fechar tudo e abrir o necessário - não o contrário.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status verbose
```

**A porta 4068 não entra na lista.** O `serve` só precisa ser alcançável
pelo próprio nginx, que está na mesma máquina. Para garantir que ela não
fique exposta nem por engano, prenda o processo ao loopback:

```bash
pm2 delete greenlabs-site
pm2 start "serve out -l tcp://127.0.0.1:4068 --no-clipboard" --name greenlabs-site
pm2 save
```

Confirme de fora que ela está fechada:

```bash
curl --max-time 5 http://SEU_IP:4068    # tem que dar timeout ou recusa
```

## 5. SSH

Em `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
MaxAuthTries 3
```

```bash
sudo systemctl restart ssh
```

> Antes de reiniciar, **abra uma segunda sessão SSH e confirme que sua
> chave funciona**. Desligar senha sem ter chave no lugar tranca você para
> fora da própria máquina, e aí só o console de emergência do provedor
> resolve.

## 6. fail2ban

```bash
sudo apt install -y fail2ban
sudo tee /etc/fail2ban/jail.local > /dev/null <<'EOF'
[sshd]
enabled = true
maxretry = 3
bantime = 1h
findtime = 10m
EOF
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

## 7. Limite de requisições no nginx

O site é estático e leve, mas o proxy na frente do `serve` merece um teto
- é um processo Node só.

Em `/etc/nginx/nginx.conf`, dentro de `http { }`:

```nginx
limit_req_zone $binary_remote_addr zone=greenlabs:10m rate=30r/s;
limit_conn_zone $binary_remote_addr zone=greenlabs_conn:10m;
```

E dentro do `location /`:

```nginx
limit_req  zone=greenlabs burst=60 nodelay;
limit_conn greenlabs_conn 20;
```

30 por segundo com rajada de 60 é folgado para uma pessoa navegando e
apertado para quem estiver varrendo.

## 8. Atualizações automáticas de segurança

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 9. O servidor de sinalização

O site é estático e não guarda nada de ninguém - não há banco, não há
sessão, não há cookie. A superfície de verdade é o servidor Go.

- Ele **não tem autenticação**: quem souber o endereço e o nome da sala
  entra. Salas com nome adivinhável (`call1`, `teste`) são públicas na
  prática. Use nomes longos para conversa que importa.
- Se for expô-lo em `wss://` pelo nginx, aplique ali o mesmo `limit_req` -
  uma sinalização aberta é uma fila de conexões WebSocket aberta.
- Vídeo e áudio **não passam pelo nginx nem pelo servidor Go em modo
  P2P**: vão diretos entre os participantes. Nesse modo o IP de cada um
  fica visível para os outros, como em qualquer WebRTC. Quem não quiser
  isso precisa forçar TURN.
