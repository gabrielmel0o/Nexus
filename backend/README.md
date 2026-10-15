# NEXUS Backend Local

Backend minimalista em Node.js (sem dependências externas) para o projeto **NEXUS**.
Recebe um texto reflexivo em primeira pessoa (500 a 3.000 caracteres), envia para a IA (Google Gemini 3) guiada pelas **Leis do NEXUS**, valida a especificação semântica resultante e a retorna pronta para renderização 3D.

---

## 1. Pré-requisitos
- **Node.js**: versão 20.6 ou superior (utiliza suporte nativo à flag `--env-file`).

---

## 2. Configuração

1. Extraia todo o projeto para uma pasta permanente. No Explorador, habilite a exibição de extensões de arquivo.
2. Na pasta `backend/`, copie `.env.example` e renomeie a cópia para `.env`, sem extensão `.txt`. Não substitua um `.env` já configurado.
3. Abra o arquivo `.env` e configure:
   - `GEMINI_API_KEY`: Cole a sua chave obtida gratuitamente em [Google AI Studio](https://aistudio.google.com).
   - `GEMINI_MODEL`: Modelo disponível na sua conta, conferido na documentação oficial do Google no momento da configuração. O nome do exemplo não garante disponibilidade ou cota. Não use Gemini 2.5, inclusive na reserva.
   - `GEMINI_MODEL_RESERVA`: Modelo alternativo opcional acionado automaticamente a partir da 2ª tentativa se o modelo principal sofrer lentidão ou indisponibilidade (503).
   - `PORT`: `3000`.
   - `MODO_SIMULADO`:
     - `1`: Modo simulado ativo. Não chama a API externa e devolve a especificação canônica de Helena sem consumir cota.
     - `0`: Chama a API do Gemini.

---

## 3. Como Rodar

### Uso cotidiano: atalho local

Na Área de Trabalho → botão direito → Novo → Atalho. Informe:

```text
"C:\Program Files\nodejs\node.exe" "C:\Sua pasta\NEXUS\backend\iniciar.js"
```

Troque ambos pelos caminhos reais do seu computador, mantendo as aspas. Se instalou o Node em outra pasta, encontre `node.exe` nela pelo Explorador. Nomeie **NEXUS**. A pasta “Iniciar em” é opcional. O destino chama o Node explicitamente; não é duplo clique no `.js`. Não distribua atalhos com caminhos de outra pessoa.

O iniciador usa somente módulos nativos. Um processo isolado do Node carrega `.env` com `--env-file` e devolve apenas porta, modo e confirmação de configuração, sem chave. O servidor também recebe esse arquivo pelo Node; nada é sobrescrito. Sua saída de erro não é repassada pelo iniciador, evitando imprimir valores de configuração em falhas de inicialização.

`GET /api/pronto` devolve somente aplicativo, versão de protocolo, identificação opaca desta pasta, PID, modo simulado e prontidão local. Não acessa o Gemini, não retorna modelos/chave, relatos, respostas ou especificações. Só reutiliza servidor desta pasta, com protocolo e modo compatíveis. A interface atual usa porta 3000; o iniciador orienta corrigir configurações com outra porta. Alterou `.env`? Encerre o backend original e reabra; a prontidão não compara chaves nem garante acesso/cota no Google.

Depois da confirmação HTTP, solicita a abertura do mesmo `nexus/index.html` no navegador padrão, por `file://`, sem parâmetros adicionais. Não muda a origem para HTTP nem migra localStorage. Para preservar o histórico, mantenha caminho e navegador/perfil; exporte JSON antes de mover a pasta.

- **Servidor iniciado pelo atalho:** mantenha sua janela aberta. Enter encerra esse servidor. Fechar a janela desconecta o canal IPC e o servidor encerra. Fechar o navegador não encerra o servidor.
- **Servidor já ativo e compatível:** reutilizado sem duplicação. Enter fecha a nova janela; encerre o servidor pela janela original.
- **Porta ocupada/incompatível:** mensagem visível, sem matar processos. Feche o programa pela própria janela se quiser liberar a porta; tente novamente.
- **Erro de `.env` ou servidor:** Enter permite abrir o index e escolher COMEÇAR/Helena. Para falha na abertura automática do navegador, o aviso orienta abrir `nexus/index.html` pelo Explorador.
- **Node ausente/atalho inválido:** o Windows pode avisar antes de executar o iniciador. Instale Node 20.6+ ou corrija o destino. Helena pode ser aberta pelo index no Explorador. Não há garantia de ausência de bloqueios de arquivos baixados pelo Windows.

### Alternativas existentes

No PowerShell, dentro da pasta `backend`:
```powershell
npm start
```
*O que esperar:* Mensagem informando que o servidor está rodando em `http://127.0.0.1:3000` (com indicação se o modo simulado está ativo ou se usará o Gemini).

Na raiz, ao lado de `nexus/` e `backend/`, dê duplo clique em `iniciar.bat`.
Ele confere Node e `backend/.env`, abre o servidor em outra janela e, após três segundos, abre o navegador.
Em `backend/.env`, use `MODO_SIMULADO=1` para testar com Helena sem gastar cota; `0` usa o Gemini.
Para encerrar, feche a janela “NEXUS backend”; o botão COMEÇAR continua funcionando sem servidor.

O `.bat` foi preservado. O atalho acima é a alternativa criada localmente, sem depender de executar um `.bat` baixado. Three.js r128 continua via CDN: é necessária rede ou cache de assets.

### Conferência do iniciador

Teste automatizado, da raiz, sem chave/cota real:

```powershell
node backend/test/testLauncher.js
```

Usa cópia temporária com espaços/acentos, `.env` fictício, processos reais e portas temporárias. A solicitação ao navegador é substituída por verificação de prontidão; não valida visualmente o navegador, o atalho do Explorador, localStorage ou proteções de download.

Conferência manual no Windows, após a configuração:

1. Com todas as janelas do NEXUS encerradas por você, abra o atalho. Confira status pronto, modo correto e o endereço `file://` do mesmo index.
2. Abra o atalho de novo com a primeira janela aberta. Confira “reutilizado”; feche somente a segunda janela. O primeiro backend deve continuar ativo.
3. Encerre pelo Enter na primeira janela, reabra e confira novo início. Repita fechando a janela pelo X para conferir o desligamento por IPC.
4. Com o backend iniciado manualmente por `npm start`, abra o atalho e confira reutilização. Encerre esse backend pela janela do npm, não pela nova janela.
5. Para conferir porta ocupada e `.env` ausente, prefira o teste automatizado acima, que não mexe na sua chave nem nos seus servidores. Testes manuais desses casos devem usar outra cópia isolada/configuração fictícia e a porta 3000 livre.
6. Com um histórico fictício já salvo no mesmo navegador/perfil, continue pelo index aberto no atalho, recarregue e confira as fases. Exporte JSON como reserva. A identidade da URL é preservada; persistência efetiva precisa de teste nesse navegador.
7. Para o teste de distribuição, baixe/extraia uma cópia limpa em outra pasta, use sua própria configuração e crie outro atalho local. Encerre antes o backend da primeira cópia. Registre eventuais bloqueios do Windows; não desative proteções para o teste.

Referências de implementação: [Node — child_process](https://nodejs.org/api/child_process.html), [Node — --env-file](https://nodejs.org/api/cli.html#--env-filefile) e [Microsoft — Start-Process](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process?view=powershell-5.1). O iniciador chama executáveis com argumentos separados, sem montar comandos `cmd /c`; o PowerShell abre a URL com a associação padrão.

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

