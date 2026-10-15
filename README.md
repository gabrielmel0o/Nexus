# NEXUS

### O universo da sua mente.

NEXUS é uma experiência web 3D que explora a ideia de representar a mente de uma pessoa como um universo.

Em vez de organizar pensamentos, memórias, emoções, sonhos e experiências em uma interface tradicional, o NEXUS transforma esses elementos em um espaço que pode ser explorado, descoberto e interpretado.

> **Se a sua mente fosse um universo, como ela estaria hoje?**

## Conceito

O NEXUS parte da ideia de que uma mente não é apenas um conjunto de informações organizadas.

Ela possui relações, distâncias, mudanças, conexões, acontecimentos e elementos que ganham significado a partir de como interagem entre si.

Por isso, o universo não funciona apenas como uma representação visual.

**O universo é a própria interface.**

A experiência busca permitir que o significado surja através da exploração e das relações entre seus elementos.

## MVP — Helena

A primeira aplicação concreta do NEXUS é o **universo de Helena**.

O MVP utiliza as **Leis do NEXUS** como base para determinar como esse universo funciona e como seus elementos se relacionam.

Ele representa uma primeira demonstração de como o conceito pode ser aplicado a uma pessoa específica.

O objetivo do MVP não é representar toda a complexidade de uma mente, mas estabelecer uma primeira experiência funcional capaz de demonstrar os princípios fundamentais do NEXUS.

## Experiência

A experiência é construída em um ambiente 3D espacial, com uma linguagem visual ilustrativa e estilizada.

A exploração deve transmitir:

* curiosidade;
* descoberta;
* contemplação;
* mistério;
* acolhimento;
* sensação de estar dentro de um universo vivo.

A interface permanece contextual e não intrusiva, aparecendo quando necessária durante a interação.

## Direção visual

O NEXUS utiliza uma estética espacial ilustrativa, com:

* formas simples e orgânicas;
* silhuetas claras;
* profundidade e escala;
* iluminação estilizada;
* composição espacial;
* elementos com personalidade;
* atmosfera de exploração.

A complexidade deve surgir principalmente das **relações entre os elementos**, e não do excesso de detalhes.

## Tecnologias

O protótipo atual utiliza:

* HTML5
* CSS3
* JavaScript clássico, sem módulos ES, build ou frameworks
* Three.js r128 via CDN
* Backend local em Node.js, sem dependências externas, em `127.0.0.1`

Helena e a continuação de um histórico salvo funcionam sem backend. Gerar e atualizar universos usam o backend local, que chama o Google Gemini. Cada atualização aprovada acrescenta um capítulo; o histórico fica somente no navegador/JSON, com especificações aprovadas e metadados mínimos, sem relatos ou respostas. O backend não guarda nem registra esse conteúdo. Os textos enviados para geração/atualização são processados pelo Google; consulte o aviso da interface antes de enviar.

## Abrir no Windows com um clique

Faça a configuração uma vez; depois use o atalho local:

1. Extraia o projeto inteiro para uma pasta permanente. Instale o [Node.js](https://nodejs.org/) **20.6 ou superior** (prefira uma versão LTS suportada). Não é necessário instalar pacotes.
2. No Explorador, ative **Exibir → Mostrar → Extensões de nomes de arquivos**. Em `backend`, copie `.env.example`, renomeie a cópia para `.env` (sem `.txt`) e edite-a no Bloco de Notas. Coloque **sua própria chave** em `GEMINI_API_KEY`, mantenha `PORT=3000` e escolha `MODO_SIMULADO=0` para IA real ou `1` para testar o fluxo sem Gemini. Configure modelos disponíveis na sua conta; não use Gemini 2.5 como principal ou reserva. Nunca compartilhe `.env` ou sua chave.
3. Na Área de Trabalho, botão direito → **Novo → Atalho**. Em **local do item**, coloque os dois caminhos absolutos entre aspas, separados por um espaço:
   ```text
   "C:\Program Files\nodejs\node.exe" "C:\Sua pasta\NEXUS\backend\iniciar.js"
   ```
   Substitua pelo local real do Node instalado e do projeto. Use `node.exe`, que mantém a janela de status visível. Não use `nodew.exe` nem associe arquivos `.js`. Dê ao atalho o nome **NEXUS**. A pasta **Iniciar em** pode ficar vazia: o iniciador encontra o projeto pelo próprio arquivo.
4. Abra esse atalho. O iniciador confirma a prontidão do backend antes de solicitar ao navegador padrão o **mesmo `nexus/index.html` por `file://`**. A janela informa se está no modo simulado. Prontidão local não garante disponibilidade da API do Google nem da rede.

Mantenha a janela de status aberta. **Enter encerra somente o backend criado por ela**; fechar essa janela também desconecta esse backend. Fechar o navegador não encerra o servidor. Na próxima abertura, o atalho inicia novamente. Se houver backend compatível desta pasta já ativo, ele é reutilizado; nesse caso, Enter fecha somente a nova janela. Encerre o backend pela janela que o iniciou (Ctrl+C no caso de `npm start`). Depois de mudar o `.env`, encerre o backend pela janela original e reabra para aplicar a nova configuração.

Porta ocupada por outro programa, NEXUS antigo/incompatível ou outra cópia do projeto gera orientação; o iniciador não encerra esses processos. Em falhas de configuração/servidor, a janela oferece **Enter para abrir Helena**; escolha **COMEÇAR**. Se o Node estiver ausente ou o destino do atalho não existir, o Windows pode impedir a própria abertura: corrija o destino/instalação e, para Helena, abra `nexus/index.html` pelo Explorador. Não há alteração de registro, políticas ou proteções do Windows. Arquivos baixados ainda podem receber avisos/bloqueios do sistema.

Preserve o mesmo caminho do projeto e navegador/perfil para continuar usando o histórico existente. O armazenamento em `file://` varia entre navegadores; exporte JSON antes de mover a pasta ou mudar de perfil. Three.js depende de CDN/rede ou cache; funcionar sem backend não garante funcionar sem internet.

O `iniciar.bat` existente permanece como alternativa. O novo atalho é criado no próprio computador, não exige executar um `.bat` ou `.lnk` baixado. Detalhes e verificação em [backend/README.md](backend/README.md).

## Status

**Em desenvolvimento — MVP**

O projeto inclui Helena como exemplo canônico/plano B e geração, atualização e exploração de universos pessoais com histórico de capítulos.

## Projeto

NEXUS é um projeto desenvolvido durante uma imersão em tecnologia, explorando a combinação entre desenvolvimento web, inteligência artificial, design e experimentação de interfaces.

## Como rodar

O NEXUS roda direto no navegador, sem instalar nada.

1. Baixe ou clone este repositório.
2. Abra o arquivo `index.html` no navegador (Chrome ou Edge).
3. Clique em COMEÇAR.

> Requer internet, porque o Three.js é carregado por CDN.
> Se algo não carregar ao abrir o arquivo direto, use o Live Server do VS Code
> (botão direito no `index.html` > "Open with Live Server").
---

**NEXUS — O universo da sua mente.**
