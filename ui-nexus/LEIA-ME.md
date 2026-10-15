# NEXUS — Especificação da interface (UI)

> Como usar este arquivo: substitua tudo o que está entre \\\\\\\[colchetes].
> Apague as linhas de exemplo que não se aplicam.
> Este arquivo é lido pela IA de código ANTES de criar qualquer tela.

\---

## 1\. Visão geral

* Projeto: NEXUS
* O que é a interface: camadas de menus e painéis que ficam POR CIMA do universo 3D
* Tamanho do design de referência: \[ex.: 1920x1080]
* Suporte a celular: não
* Regra importante: os PNGs em `telas/` são ESPECIFICAÇÃO visual (estrutura, posição, proporções, espaçamentos, tipografia, cores), caso tenha algum ajuste que sugira, pergunte antes.

\---

## 2\. Cores (hex)

|Nome da variável CSS|Hex|Onde é usada|
|-|-|-|
|--cor-fundo-roxo|#100819 (75% de opacidade)|fundo de painéis|
|--cor-botões|#100819|botões|
|--cor-branco-nexus|#E2E3E4|títulos, simbolos e textos gerais|
|--cor-texto-secundario|#9D9D9D|textos secundário, ex: descritivos de botões|
|--cor-laranja-principal|#FF8900|laranja principal|
|--cor-laranja-secundario|#A35808|ex.: rótulos pequenos|
|--cor-laranja-terciário|#632A00|lugares especificos, ex:Simbolo do Botão Começar|
|--texto-laranja|#291100|textos em áreas laranjas, ex: "Começar" na tela inicial|
|gradiente-menu-inicial|#100819 até 0% de opacidade|da borda esquerda até onde a linha vermelha delimita|
|--barra-funcionalidades|#000000 até 26% de opacidade|barra inferior (visível nos prints 5, 6 7)|
|--cor-azul-principal|#111450|azul principal|

Elementos com transparência (informar valores reais, não os do PNG):

* \[ex.: painel de vidro: #100819 com 60% de opacidade, borda #FFFFFF com 20% de opacidade]

\---

## 3\. Fontes

|Uso|Fonte|Arquivo em `fontes/`|Variável CSS|
|-|-|-|-|
|Títulos|Geologica|Geologica-Black.ttf|--fonte-titulo|
|Textos|HiburMono|HiburMono-Regular.ttf|--fonte-texto|

Tamanhos principais (se souber): \[ex.: título 48px, texto 16px, rótulo 12px]

\---

## 4\. Lista de telas

Uma linha por tela. A ordem é a do arquivo em `telas/`.

|Nº|Arquivo|Nome da tela|O que é / quando aparece|Fundo desfocado?|
|-|-|-|-|-|
|1|telas/01-tela\_inicial.png|Tela Inicial|Tela incial do projeto|não|
|2|telas/02-comecar.png|Menu Começar|Tela para o usuário escrever, aparece quando ele aperta em "COMEÇAR" na tela inicial (só aparece caso o usuário não tenha dados salvos, caso ele tenha o universo dele é carregado e essa tela não aparece)|sim|
|3|telas/03-atualizar.png|Menu Atualizar|Tela para o usuário escrever, só é possível clicar se o usuário tiver dados, aparece quando ele aperta em "ATUALIZAR" na tela inicial|sim|
|4|telas/04-gerenciamento.png|Menu Gerenciamento|Tela para o usuário gerenciar dados, aparece quando ele aperta em "GERENCIAMENTO" na tela inicial|sim|
|5|telas/05-visualização.png|Tela de Visualização|tela para visualização do universo 3d, aparece quando ele aperta "COMEÇAR" na tela incial e tem dados salvos ou quando aperta em "HELENA" na tela incial|não, o fundo é o universo 3d|
|6|telas/06-saibamais.png|Tela Saiba Mais|Aparece quando o Usuário aperta do ícone "?" no canto inferior direito, na barra de botões|não, o fundo é o universo 3d|
|7|telas/07-astro.png|Descrição do Astro|tela descritiva do astro, aparece quando o usuário clica/seleciona um astro|não, o fundo é o universo 3d|
|8|telas/08-menu.png|Menu|Menu de opções, aparece quando o usuário aperta no LOGO no canto inferior esquerdo, na barra de ferramentas|sim|
|9|telas/09-sair.png|Saída|tela de confirmação de saída, aparece quando o usuário aperta em sair no Menu|sim|

\---

## 5\. SVGs (pasta `svg/`)

|Arquivo|O que é|Em qual tela|Uma cor só?|
|-|-|-|-|
|svg/logotipo\_inicial.svg|Logotipo|nº1|não|
|svg/isotipo.svg|Isotipo|nº5 (fica na barra inferior, então permanece na 6 e 7)|sim|
|svg/atualizar.svg|icone|nº1|sim|
|svg/gerenciamento.svg|icone|nº1|sim|
|svg/helena.svg|icone|nº1|sim|
|svg/ampulheta.svg|icone|nº5 (fica na barra inferior, então permanece na 6 e 7)|sim|
|svg/saibamais.svg|icone|nº5 (fica na barra inferior, então permanece na 6 e 7)|sim|
|svg/nexus\_menu.svg|logotipo|nº8|sim|
|svg/sair.svg|icone|nº8|não|
|svg/menu.svg|icone|nº8|sim|

\---

## 6\. Hover e animações (para a etapa final)

### Hover dos botões (`.btn`): anel de luz

Fonte da verdade: `teste-hover.html` (copiar o CSS de lá, sem reinterpretar). Referência visual: vídeo `1014.mp4`.

Regra única, vale para todos os botões (padrão, laranja "COMEÇAR" e de ícone "?" e logo):

* O anel fica POR FORA do botão: 2px de espessura (`--anel-espessura`), com 2px de folga até a borda (`--anel-gap`). Sem hover, não existe anel nenhum.
* Liga e desliga NA HORA, sem fade (nada de `transition` de opacidade).
* Enquanto há hover (ou `:focus-visible`), o anel fica branco (`--cor-branco-nexus`) quase o tempo todo, e uma faixa escura atravessa o botão na diagonal, do canto inferior direito ao superior esquerdo. Como o anel recorta a faixa, ela aparece em dois braços (um pela lateral direita e topo, outro pela base e lateral esquerda) que chegam juntos ao canto superior esquerdo.
* Sequência de cores da faixa: branco, borda nítida ciano (`--cor-anel-ciano` #78B4D0), lilás, roxo (`--cor-anel-roxo` #6F378B), escuro (`--cor-anel-escuro`, igual a `--cor-botoes`), subida suave de volta ao branco.
* Ciclo de 1,35s (`--volta`), velocidade constante, em laço sem emenda. A animação reinicia do zero a cada hover.
* O mesmo anel serve para o botão laranja (por estar por fora, não há variante de cor).
* Botão desabilitado (`disabled`): sem anel, opacidade .45, cursor `not-allowed`.
* `prefers-reduced-motion`: sem animação, anel branco fixo por fora.
* Técnica: só `transform` é animado (`@keyframes varrer`); a opacidade só alterna entre 0 e 1. Nenhum `backdrop-filter`.

### Hover dos itens de menu (`.item`, tela 8)

* Fundo laranja (`--cor-laranja-principal`) aparece na hora, sem transição, e o texto troca na hora para `--texto-laranja`.
* Sem anel de luz.

Regras: só `transform` e `opacity` (a interface fica sobre um canvas 3D); nunca animar `backdrop-filter`.

\---

## 7\. O que NÃO fazer

* Não mexer na lógica do projeto nem no motor 3D (JavaScript existente).
* Não usar Tailwind, Bootstrap, React nem módulos ES.
* Não reproduzir o fundo dos rascunhos (se houver); o fundo real é o universo 3D.
* Não criar elementos, textos ou cores que não estão nos PNGs.
* \[outras proibições do projeto]

\---v

