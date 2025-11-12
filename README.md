# 🧠 n8n + WAHA + Audio Transcription Workflow

Fluxo completo no **n8n** para receber mensagens de voz do **WhatsApp** (via **WAHA**), **descriptografar** e **transcrever** automaticamente com o **Google Gemini**.

---

## 🚀 Quick Start

### 🧩 Pré-requisitos

- **Docker** e **Docker Compose**
- **Node.js 20+** (para testar localmente)
- Conta do **Google Gemini API**
- Configuração do **WAHA** com webhook ativo apontando para o n8n

---

### 🧱 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/n8n-waha-audio-transcribe.git
cd n8n-waha-audio-transcribe
```


### 🐳 2. Suba o ambiente Docker

O repositório já inclui o `docker-compose.yml` para rodar:

* **n8n**
* **decryptor (Node.js)**
* **Redis e Postgres** (opcionais)

<pre class="overflow-visible!" data-start="976" data-end="1008"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-bash"><span><span>docker compose up -d
</span></span></code></div></div></pre>

Verifique se os serviços subiram:

<pre class="overflow-visible!" data-start="1044" data-end="1118"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-bash"><span><span>docker ps --format </span><span>"table {{.Names}}\t{{.Status}}\t{{.Ports}}"</span><span>
</span></span></code></div></div></pre>

---

### 🧩 3. Teste o decryptor manualmente

Antes de integrar com o n8n, confirme que o servidor de descriptografia está funcionando.

<pre class="overflow-visible!" data-start="1257" data-end="1783"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-bash"><span><span># Testar endpoint de saúde</span><span>
curl -H </span><span>"X-Api-Key: decdecdec"</span><span> http://localhost:4000/health
</span><span># → {"ok":true}</span><span>

</span><span># Testar descriptografia manual (exemplo PowerShell)</span><span>
</span><span>$enc</span><span> = Get-Content -Encoding Byte -Path .\file.enc
</span><span>$enc64</span><span> = [Convert]::ToBase64String(</span><span>$enc</span><span>)
</span><span>$body</span><span> = @{
  mediaKey = </span><span>"zuzjcIJUBnZwUnCnWY6UvB/F3xsGIx1fmjGezwwn+Lw="</span><span>
  </span><span>base64</span><span>   = </span><span>$enc64</span><span>
} | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:4000/decrypt `
  -Headers @{ </span><span>"X-Api-Key"</span><span>=</span><span>"decdecdec"</span><span> } `
  -Method POST -Body </span><span>$body</span><span> -ContentType </span><span>"application/json"</span><span>
</span></span></code></div></div></pre>

---

### 🧠 4. Configure o n8n

Acesse [http://localhost:5678]() e importe o workflow principal (`wapp-assistant.json`).

O fluxo é:

<pre class="overflow-visible!" data-start="1940" data-end="2077"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>Webhook → Gets message by </span><span>id</span><span> → BaixaArquivo (.enc)
→ OggConverter (/decrypt) → Convert to File → Gemini Transcribe → Send Message
</span></span></code></div></div></pre>

---

### 🎧 5. Teste o fluxo com uma mensagem de voz

Envie um **áudio** pelo WhatsApp.

Se tudo estiver certo:

* O n8n fará o download do `.enc`
* O decryptor converterá em `.ogg`
* O Gemini fará a **transcrição**
* O texto aparecerá na saída do fluxo

---

## ⚙️ Estrutura do Projeto

<pre class="overflow-visible!" data-start="2365" data-end="2538"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>📦 n8n-waha-audio-transcribe
 ┣ 📂 decryptor
 ┃ ┣ 📜 </span><span>server</span><span>.js
 ┃ ┣ 📜 package.json
 ┣ 📂 n8n_data
 ┣ 📜 docker-compose.yml
 ┣ 📜 wapp-assistant.json
 ┗ 📜 README.md
</span></span></code></div></div></pre>

---

## 🧠 Workflow: Passos Principais

### 1️⃣ Receber Mensagem

* **Trigger:** Webhook (WAHA)
* **Saída:** `mediaKey`, `fileEncSHA256`, `media.url`

---

### 2️⃣ Baixar Arquivo `.enc`

* **Node:** HTTP Request
* **Response Format:** `File`
* **Put Output in Field:** `enc`

---

### 3️⃣ Descriptografar Áudio

* **Node:** HTTP Request (POST /decrypt)
* **URL:** `http://host.docker.internal:4000/decrypt`
* **Headers:** `X-Api-Key: decdecdec`
* **Body Content Type:** `JSON`
* **Body:**
  <pre class="overflow-visible!" data-start="3032" data-end="3182"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-json"><span><span>{</span><span>
    </span><span>"mediaKey"</span><span>:</span><span></span><span>"={{ $json.mediaKey || $json._data?.Message?.audioMessage?.mediaKey }}"</span><span>,</span><span>
    </span><span>"base64"</span><span>:</span><span></span><span>"={{ $binary.enc.data }}"</span><span>
  </span><span>}</span><span>
  </span></span></code></div></div></pre>
* **Response Format:** JSON

---

### 4️⃣ Converter Base64 → Arquivo `.ogg`

> ⚠️ Nas versões novas do n8n, use **Convert to File**

* **JSON field:** `ogg_base64`
* **Binary field name:** `data`
* **File name:** `voice.ogg`
* **Mime type:** `audio/ogg`

---

### 5️⃣ Transcrever com Google Gemini

* **Node:** Gemini → *Transcribe a Recording*
* **Model:** `models/gemini-2.5-flash`
* **Input Type:** Binary File(s)
* **Input Data Field Name(s):** `data`

---

## 🔐 decryptor/server.js (resumo)

<pre class="overflow-visible!" data-start="3691" data-end="5144"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-js"><span><span>import</span><span> express </span><span>from</span><span></span><span>"express"</span><span>;
</span><span>import</span><span> crypto </span><span>from</span><span></span><span>"crypto"</span><span>;

</span><span>const</span><span> app = </span><span>express</span><span>();
app.</span><span>use</span><span>(express.</span><span>json</span><span>({ </span><span>limit</span><span>: </span><span>"50mb"</span><span> }));

</span><span>const</span><span></span><span>API_KEY</span><span> = process.</span><span>env</span><span>.</span><span>DECRYPT_API_KEY</span><span> || </span><span>""</span><span>;

app.</span><span>post</span><span>(</span><span>"/decrypt"</span><span>, </span><span>(req, res</span><span>) => {
  </span><span>try</span><span> {
    </span><span>const</span><span> { mediaKey, base64 } = req.</span><span>body</span><span>;
    </span><span>const</span><span> encBuf = </span><span>Buffer</span><span>.</span><span>from</span><span>(base64, </span><span>"base64"</span><span>);
    </span><span>const</span><span> key = </span><span>Buffer</span><span>.</span><span>from</span><span>(mediaKey, </span><span>"base64"</span><span>);

    </span><span>const</span><span> info = </span><span>Buffer</span><span>.</span><span>from</span><span>(</span><span>"WhatsApp Audio Keys"</span><span>);
    </span><span>const</span><span> salt = </span><span>Buffer</span><span>.</span><span>alloc</span><span>(</span><span>32</span><span>, </span><span>0</span><span>);
    </span><span>let</span><span> expanded = crypto.</span><span>hkdfSync</span><span>(</span><span>"sha256"</span><span>, key, salt, info, </span><span>112</span><span>);
    </span><span>if</span><span> (!(expanded </span><span>instanceof</span><span></span><span>Buffer</span><span>)) expanded = </span><span>Buffer</span><span>.</span><span>from</span><span>(expanded);

    </span><span>const</span><span> iv = expanded.</span><span>subarray</span><span>(</span><span>0</span><span>, </span><span>16</span><span>);
    </span><span>const</span><span> cKey = expanded.</span><span>subarray</span><span>(</span><span>16</span><span>, </span><span>48</span><span>);
    </span><span>const</span><span> macKey = expanded.</span><span>subarray</span><span>(</span><span>48</span><span>, </span><span>80</span><span>);

    </span><span>const</span><span> mac = encBuf.</span><span>subarray</span><span>(encBuf.</span><span>length</span><span> - </span><span>10</span><span>);
    </span><span>const</span><span> fileData = encBuf.</span><span>subarray</span><span>(</span><span>0</span><span>, encBuf.</span><span>length</span><span> - </span><span>10</span><span>);

    </span><span>const</span><span> h = crypto.</span><span>createHmac</span><span>(</span><span>"sha256"</span><span>, macKey);
    h.</span><span>update</span><span>(iv);
    h.</span><span>update</span><span>(fileData);
    </span><span>const</span><span> macCalc = h.</span><span>digest</span><span>().</span><span>subarray</span><span>(</span><span>0</span><span>, </span><span>10</span><span>);
    </span><span>if</span><span> (!mac.</span><span>equals</span><span>(macCalc)) </span><span>return</span><span> res.</span><span>status</span><span>(</span><span>400</span><span>).</span><span>json</span><span>({ </span><span>error</span><span>: </span><span>"MAC mismatch"</span><span> });

    </span><span>const</span><span> decipher = crypto.</span><span>createDecipheriv</span><span>(</span><span>"aes-256-cbc"</span><span>, cKey, iv);
    </span><span>const</span><span> decrypted = </span><span>Buffer</span><span>.</span><span>concat</span><span>([decipher.</span><span>update</span><span>(fileData), decipher.</span><span>final</span><span>()]);

    res.</span><span>json</span><span>({ </span><span>ogg_base64</span><span>: decrypted.</span><span>toString</span><span>(</span><span>"base64"</span><span>), </span><span>mime</span><span>: </span><span>"audio/ogg"</span><span> });
  } </span><span>catch</span><span> (e) {
    res.</span><span>status</span><span>(</span><span>500</span><span>).</span><span>json</span><span>({ </span><span>error</span><span>: e.</span><span>message</span><span> });
  }
});

app.</span><span>listen</span><span>(</span><span>4000</span><span>, </span><span>() =></span><span></span><span>console</span><span>.</span><span>log</span><span>(</span><span>"Decrypt server :4000"</span><span>));
</span></span></code></div></div></pre>

---

## 🧪 Debug Rápido

| Erro                                    | Possível Causa                       | Solução                                    |
| --------------------------------------- | ------------------------------------- | -------------------------------------------- |
| `expanded.subarray is not a function` | `hkdfSync`retornando tipo incorreto | Converter para Buffer no `server.js`       |
| `MAC mismatch`                        | `mediaKey`ou `.enc`não combinam  | Certifique-se que o par é da mesma mensagem |
| `binary.data vazio`                   | Campo JSON errado                     | Use `ogg_base64`no Convert to File         |
| `Cannot GET /api/health`              | Endpoint incorreto                    | Use `/health`                              |

---

## 🧾 Licença

MIT © 2025 — Desenvolvido por **Fabrizio Salvade**

💬 Contribuições e PRs são bem-vindos!
