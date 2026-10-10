# NEXUS Backend Local

Backend minimalista em Node.js (sem dependências externas) para o projeto **NEXUS**.
Recebe um texto reflexivo em primeira pessoa (500 a 3.000 caracteres), envia para a IA (Google Gemini 3) guiada pelas **Leis do NEXUS**, valida a especificação semântica resultante e a retorna pronta para renderização 3D.

---

## 1. Pré-requisitos
- **Node.js**: versão 20.6 ou superior (utiliza suporte nativo à flag `--env-file`).

---

## 2. Configuração

1. Abra a pasta `backend/` no terminal.
2. Copie o arquivo de exemplo para criar o seu `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Abra o arquivo `.env` e configure:
   - `GEMINI_API_KEY`: Cole a sua chave obtida gratuitamente em [Google AI Studio](https://aistudio.google.com).
   - `GEMINI_MODEL`: `gemini-3.8-flash` (ou o modelo Gemini 3 ativo da sua conta).
   - `GEMINI_MODEL_RESERVA`: Modelo alternativo opcional acionado automaticamente a partir da 2ª tentativa se o modelo principal sofrer lentidão ou indisponibilidade (503).
   - `PORT`: `3000`.
   - `MODO_SIMULADO`:
     - `1`: Modo simulado ativo. Não chama a API externa e devolve a especificação canônica de Helena sem consumir cota.
     - `0`: Chama a API do Gemini.

---

## 3. Como Rodar

No PowerShell, dentro da pasta `backend`:
```powershell
npm start
```
*O que esperar:* Mensagem informando que o servidor está rodando em `http://127.0.0.1:3000` (com indicação se o modo simulado está ativo ou se usará o Gemini).

---

## 4. Como Testar

Com o servidor rodando em um terminal, abra outro terminal PowerShell para testar a rota `POST /api/universo`:

### Teste com um dos textos de exemplo
```powershell
$texto = [System.IO.File]::ReadAllText("$PWD\backend\exemplos\carreira.txt", [System.Text.Encoding]::UTF8)
$body = @{ texto = $texto } | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/universo" -Method Post -Body $body -ContentType "application/json; charset=utf-8"
```
> *Nota de compatibilidade:* No PowerShell 5.1, `[System.IO.File]::ReadAllText` garante que o conteúdo do arquivo seja lido como uma string pura em UTF-8 com acentuação correta, evitando que o cmdlet `Get-Content` anexe propriedades de objeto ou corrompa a serialização do JSON.

*O que esperar:* Um objeto JSON contendo `{ "spec": { ... } }`, com os sistemas, planetas e forças gerados e validados segundo as Leis do NEXUS.

