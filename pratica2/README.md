# 📡 Public WiFi Attack Demonstration — Android Edition

> **Prática 2 do curso de segurança da informação — IFF / IFSul**
> Demo educacional, totalmente *offline*, mostrando por que conectar
> num Wi-Fi público é uma **péssima ideia**.

---

## ⚠️ AVISO LEGAL — LEIA ANTES DE TUDO

Este projeto existe para ser usado **somente** em um laboratório isolado,
com autorização do professor, em equipamentos do próprio aluno (ou da
escola).

Replicar qualquer uma das técnicas aqui contra redes ou dispositivos que
você **não possui** ou **não tem permissão escrita para testar** configura
crime no Brasil:

- **Lei 12.737/2012** ("Carolina Dieckmann") — invasão de dispositivo
  informático.
- **Marco Civil da Internet** (Lei 12.965/2014) — interceptação de
  comunicações.

Em caso de dúvida: **não execute fora do laboratório**.

---

## 🎯 O que esta demo prova

Em **menos de 5 minutos**, sentado na mesma Wi-Fi que a vítima e
**sem acesso à internet**, o atacante consegue:

| # | Capacidade demonstrada                                   |
|---|----------------------------------------------------------|
| 1 | Listar todos os dispositivos da rede (IP, MAC, fabricante)|
| 2 | Identificar automaticamente o celular Android            |
| 3 | Escanear portas e serviços do celular                    |
| 4 | Se posicionar entre o celular e o roteador (MITM)        |
| 5 | Ler em tempo real cada DNS / URL que o celular pede      |
| 6 | Falsificar respostas de DNS                              |
| 7 | Servir uma **cópia perfeita** do login do Google /        |
|   | Instagram / portal-cativo de Wi-Fi                       |
| 8 | Capturar **a senha em texto plano** que a vítima digitou |

Tudo isso em **uma rede sem internet** — exatamente o que torna o ataque
tão assustador: ele não depende de internet.

---

## 🧰 Pré-requisitos

### Hardware

- **Laptop atacante** com Pop!_OS / Ubuntu / Debian + adaptador Wi-Fi.
- **Roteador antigo** servindo de "Wi-Fi pública" (sem uplink).
- **Celular Android** (vítima) — qualquer um.

### Software (instale uma vez)

```bash
sudo bash install.sh
```

O instalador cuida de:

- `nmap`, `arp-scan`, `iproute2`, `tcpdump`, `samba-common-bin`
- `bettercap` (opcional, para uma TUI bonita)
- `python3-scapy` (via pip)

---

## 🗂️ Estrutura do projeto

```
pratica2/
├── wifi_demo.py            ← script principal com menu
├── install.sh              ← instalador para Pop!_OS / Debian
├── requirements.txt
├── README.md               ← este arquivo
├── modules/
│   ├── utils.py            ← banner, prompts, helpers de rede
│   ├── discovery.py        ← Fase 1 — descoberta da rede
│   ├── scanning.py         ← Fase 2 — scan detalhado do alvo
│   ├── mitm.py             ← Fase 3 — ARP spoofing (Scapy)
│   ├── dns_spoof.py        ← Fase 4 — DNS spoofing (Scapy)
│   ├── fake_server.py      ← Fase 4 — servidor HTTP local + captura
│   └── report.py           ← Fase 5 — gera Markdown
├── fake_pages/
│   ├── google/
│   ├── instagram/
│   └── wifi_login/
├── captures/               ← logs JSONL com credenciais capturadas
└── reports/                ← relatórios .md gerados
```

---

## 🚀 Como rodar (passo-a-passo de aula)

> **Sempre como root** — a ferramenta usa raw sockets, ARP, porta 53/80.

### 0. Antes da aula (uma vez só)

```bash
cd ~/Projects/IFF/cybersec_course/pratica2
sudo bash install.sh
```

### 1. Conecte os 3 atores na mesma Wi-Fi

1. Liga o roteador antigo do laboratório (sem cabo de internet).
2. Conecta o **laptop atacante** na rede.
3. Conecta o **celular Android** na rede.

Confira no laptop:

```bash
ip -4 addr show           # qual interface (wlan0?) e qual IP /24 você pegou
ping -c 1 192.168.1.1     # ou o IP do roteador
```

### 2. Sobe o menu

```bash
sudo python3 wifi_demo.py
```

A interface auto-detecta. Caso queira forçar:

```bash
sudo python3 wifi_demo.py -i wlan0 -s 192.168.1.0/24
```

Você verá:

```
╔════════════════════════════════════════════════════════════════╗
║   PUBLIC WIFI ATTACK DEMO — ANDROID EDITION (LAB ONLY)         ║
╠════════════════════════════════════════════════════════════════╣
║   1) Phase 1 — Network Discovery (nmap + ARP)                  ║
║   2) Phase 2 — Detailed scan of Android target                 ║
║   3) Phase 3 — ARP spoofing / MITM                             ║
║   4) Phase 4 — DNS spoofing + fake login page                  ║
║   5) Phase 5 — Generate Markdown report                        ║
║   A) Run ALL phases sequentially                               ║
║   S) Show current session state                                ║
║   Q) Quit                                                      ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 📚 Roteiro pedagógico — fase por fase

### 🔍 Fase 1 — Descoberta da rede

**O que acontece:** `arp-scan` (ou `nmap -sn` como fallback) varre a `/24`
e lista todos os dispositivos conectados. O atacante vê em segundos:

- **IP** de cada dispositivo
- **MAC address**
- **Fabricante** (Samsung, Xiaomi, TPLink, …)
- **Hostname** (quando disponível via NetBIOS)

🎓 **Pergunta para a turma:** "Vocês acham que o seu celular avisa quando
alguém faz isso?". Resposta: **não**. É 100% silencioso.

A ferramenta destaca automaticamente:
- 🌐 o **gateway** (roteador)
- 📱 o **alvo Android** (heurística por fabricante: Samsung, Xiaomi,
  Motorola, Google, etc.)

Se a heurística não pegar, você escolhe manualmente pelo índice.

### 🎯 Fase 2 — Scan detalhado do alvo

`nmap -sS -sV -O` contra a porta filtrada do Android. Mostre na turma:

- Mesmo um celular **bloqueado** costuma ter mDNS (5353), SSDP (1900).
- Se "modo desenvolvedor" + "depuração USB sem fio" estiver ligado,
  abre **ADB na porta 5555** — que é game over.
- Banners de versão revelam modelo / Android version.

### 🕵️ Fase 3 — ARP spoofing / MITM

**Cuidado:** a partir daqui o tráfego da vítima passa pelo laptop.

O script:

1. Resolve o MAC do celular e do roteador.
2. Liga `ip_forward=1` no kernel (a vítima ainda navega).
3. Em loop, manda 2 pacotes ARP forjados por segundo:
   - "ei celular, o gateway sou EU"
   - "ei roteador, a vítima sou EU"
4. Em paralelo, **sniffa** o tráfego da vítima e imprime ao vivo:

   ```
   🔍 DNS  192.168.1.42 → captive.apple.com
   🔍 DNS  192.168.1.42 → instagram.com
   🌐 HTTP GET → www.example.com
   ```

5. Quando o tempo acaba (ou Ctrl-C), restaura o ARP correto enviando
   5 broadcasts legítimos e retorna `ip_forward` ao valor original.

🎓 **Mostre o `arp -a` no celular** antes e depois da fase. É visualmente
chocante: o MAC do gateway muda para o MAC do laptop atacante.

### 🎭 Fase 4 — DNS spoofing + fake login page

A fase de mais impacto visual e a que mais convence a turma.

1. Você escolhe a página falsa: `google`, `instagram` ou `wifi_login`.
2. Sobe um servidor HTTP local na porta 80, servindo essa página.
3. Roda ARP-spoofing + sniff de UDP/53 da vítima.
4. Para CADA pergunta DNS da vítima, forja uma resposta apontando
   para o IP do laptop.
5. Quando a vítima abre `google.com` no celular → recebe sua página falsa.
6. Se ela digitar usuário e senha, a tela do laptop **explode em vermelho**:

   ```
   ════════════════════════════════════════════════════════════════
   🔥 CREDENTIALS CAPTURED 🔥
     from : 192.168.1.42
     page : google
     ua   : Mozilla/5.0 (Linux; Android 14; ...
       email = vitima@gmail.com
    password = senha_super_secreta_123
   ════════════════════════════════════════════════════════════════
   ```

7. A vítima vê uma tela "Conectando..." que após 2s revela: **"Você
   acabou de entregar sua senha"** — o reveal pedagógico.

🎓 Truque para o impacto: não diga *qual* página subiu. Deixe um aluno
   tentar abrir "google.com" no Android e *outro* aluno olhar a tela do
   atacante. O click coletivo é instantâneo.

📂 As capturas são gravadas em `captures/creds_<page>_<timestamp>.jsonl`.

### 📝 Fase 5 — Relatório

Gera `reports/Android_PublicWiFi_Demo_Report_<DATA>.md` com:

- ✅ Resumo executivo
- ✅ Lista de dispositivos descobertos
- ✅ Resultado do scan do Android
- ✅ Eventos das fases MITM / DNS / fake-page
- ✅ Guia de screenshots
- ✅ Recomendações de segurança em linguagem para adolescente

Você pode rodar a fase isoladamente a qualquer momento — ela usa o
estado já acumulado na sessão.

---

## ▶️ Modo "rodar tudo de uma vez"

```bash
sudo python3 wifi_demo.py --all
```

Atravessa todas as fases pedindo confirmação antes de cada ação perigosa.
Bom para uma demo cronometrada.

---

## 🧯 Segurança operacional

- **Sempre** há um `input()` antes de qualquer ação intrusiva.
- `Ctrl-C` aciona um *signal handler* que **restaura ARP** e **derruba**
  o servidor falso. Mesmo se o script quebrar.
- IPv4 forwarding volta ao valor original ao final.
- A pasta `captures/` fica com permissões padrão de root — após a aula,
  apague: `sudo rm -rf captures/*.jsonl`

---

## 🛡️ Recomendações para os alunos (entregar junto com o relatório)

1. **Trate qualquer Wi-Fi pública como hostil.**
2. **Use VPN** quando precisar de Wi-Fi pública.
3. **Cheque cadeado + domínio** — uma página falsa pode ser idêntica.
4. **Desative auto-conectar** em SSIDs genéricos ("Free WiFi").
5. **Esqueça redes** que você não usa mais.
6. **2FA em tudo.** Mesmo se a senha vazar, o atacante não entra.
7. **Wi-Fi desligado** quando não precisar.

---

## 🛠️ Solução de problemas

| Problema | Solução |
|----------|---------|
| `Cannot bind to port 80` | Algum nginx/apache está rodando? `sudo systemctl stop apache2 nginx` |
| `arp-scan: Cannot find interface` | Passe `-i wlan0` explicitamente |
| Scapy `No such device` | Confirme `ip link show` e use o nome real (wlp3s0?, wlan0?) |
| `Could not resolve victim MAC` | Celular saiu da rede ou está em modo economia. Mande pingar de novo |
| Vítima não vê a página falsa | Em alguns Androids o cache DNS dura 30s. Coloque o avião e desligue, ou mude o domínio testado |
| Bettercap dá conflito | Desinstale bettercap — o backend Scapy é suficiente |

---

## 📜 Licença e ética

Código educacional. Use somente em laboratório autorizado.
Em caso de dúvida, **não execute**. 🛡️
