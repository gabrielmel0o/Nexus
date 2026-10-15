# NEXUS — Documento de Entrega da Interface (UI)

> **Destinatário:** Este documento foi elaborado para orientar a integração entre a interface HTML/CSS e o motor 3D (Three.js/JavaScript) do projeto **NEXUS**.

---

## 1. Mapeamento Completo das Telas

### Tela 1: Tela Inicial
* **Arquivo HTML:** `01-tela-inicial.html`
* **CSS:** `css/base.css`, `css/hover.css`, `css/tela-inicial.css`
* **Container principal:** `#tela-inicial`
* **Fundo desfocado:** Não (cena 3D nítida com gradiente roxo à esquerda).
* **Fluxo de navegação:**
  * *Origem:* Ponto de entrada da aplicação ou retorno via botão Voltar / Menu.
  * *Destino:* Telas 2, 3, 4 ou 5 dependendo do botão clicado.
* **IDs interativos e ações ao clicar:**
  * `#botao-comecar`: Se não houver dados salvos no navegador, abre a **Tela 2 (Começar)**. Se já houver dados salvos, carrega o universo salvo e vai direto para a **Tela 5 (Visualização)**.
  * `#botao-atualizar`: Habilitado apenas se existirem dados salvos; abre a **Tela 3 (Atualizar)**.
  * `#botao-gerenciamento`: Abre a **Tela 4 (Gerenciamento)**.
  * `#botao-helena`: Modo de demonstração (carrega dados pré-configurados de Helena) e abre a **Tela 5 (Visualização)**.
* **Comportamento visual e hover:**
  * Todos os 4 botões contam com `overflow: visible` e o elemento `<span class="btn__feixe" aria-hidden="true"></span>` como primeiro filho, disparando o anel de luz contínuo no hover/foco.
* **IDs de textos dinâmicos:** Nenhum (textos estáticos de apresentação).

---

### Tela 2: Começar (Menu Começar)
* **Arquivo HTML:** `02-comecar.html`
* **CSS:** `css/base.css`, `css/hover.css`, `css/tela-comecar.css`
* **Container principal:** `#tela-comecar`
* **Fundo desfocado:** Sim (desfoque gaussiano de 8,5px sobre o canvas 3D via `#fundo-desfocado`).
* **Fluxo de navegação:**
  * *Origem:* Tela 1 (ao clicar em COMEÇAR sem dados salvos).
  * *Destino:* Retorna para a Tela 1 (via botão voltar) ou avança para a Tela 5 (ao gerar o universo).
* **IDs interativos e ações ao clicar:**
  * `#botao-voltar-comecar`: Retorna para a **Tela 1 (Tela Inicial)**.
  * `#campo-texto-mente`: `<textarea>` onde o usuário descreve seus pensamentos (entre 500 e 3.000 caracteres).
  * `#botao-gerar-universo`: Envia o texto digitado para a API Gemini, gera o universo 3D e avança para a **Tela 5 (Visualização)**.
* **Critério de validação e estado do botão:**
  * O botão `#botao-gerar-universo` **inicia desabilitado (`disabled`)** com opacidade 0.45.
  * O JS monitora a digitação: somente ao atingir o **mínimo de 500 caracteres**, o atributo `disabled` é removido, tornando o botão 100% opaco, clicável e ativando o anel de luz no hover.
* **IDs de textos dinâmicos:**
  * `#caracteres-digitados-comecar`: Exibe em tempo real a contagem de caracteres digitados (inicia em `0`).
  * `#contador-caracteres-comecar`: Contêiner do texto com limite e mínimo (`"0 / 3.000 caracteres · mínimo 500"`).

---

### Tela 3: Atualizar (Menu Atualizar)
* **Arquivo HTML:** `03-atualizar.html`
* **CSS:** `css/base.css`, `css/hover.css`, `css/tela-comecar.css`, `css/tela-atualizar.css`
* **Container principal:** `#tela-atualizar`
* **Fundo desfocado:** Sim (desfoque gaussiano de 8,5px sobre o canvas 3D via `#fundo-desfocado`).
* **Fluxo de navegação:**
  * *Origem:* Tela 1 (ao clicar em ATUALIZAR).
  * *Destino:* Retorna para a Tela 1 (via botão voltar) ou avança para a Tela 5 (ao atualizar o universo).
* **IDs interativos e ações ao clicar:**
  * `#botao-voltar-atualizar`: Retorna para a **Tela 1 (Tela Inicial)**.
  * `#campo-texto-mudancas`: `<textarea>` onde o usuário relata o que mudou (entre 100 e 3.000 caracteres).
  * `#botao-atualizar-universo`: Envia as mudanças para a API Gemini, recalcula o universo e avança para a **Tela 5 (Visualização)**.
* **Critério de validação e estado do botão:**
  * O botão `#botao-atualizar-universo` **inicia desabilitado (`disabled`)** com opacidade 0.45.
  * O JS monitora a digitação: somente ao atingir o **mínimo de 100 caracteres**, o atributo `disabled` é removido, tornando o botão 100% opaco, clicável e ativando o anel de luz no hover.
* **IDs de textos dinâmicos:**
  * `#caracteres-digitados-atualizar`: Exibe em tempo real a contagem de caracteres digitados (inicia em `0`).
  * `#contador-caracteres-atualizar`: Contêiner com a regra de caracteres (`"0 / 3.000 caracteres · mínimo 100"`).

---

### Tela 4: Gerenciamento (Menu Gerenciamento)
* **Arquivo HTML:** `04-gerenciamento.html`
* **CSS:** `css/base.css`, `css/hover.css`, `css/tela-comecar.css`, `css/tela-gerenciamento.css`
* **Container principal:** `#tela-gerenciamento`
* **Fundo desfocado:** Sim (desfoque gaussiano de 8,5px sobre o canvas 3D via `#fundo-desfocado`).
* **Fluxo de navegação:**
  * *Origem:* Tela 1 (ao clicar em GERENCIAMENTO).
  * *Destino:* Retorna para a Tela 1 (via botão voltar).
* **IDs interativos e ações ao clicar:**
  * `#botao-voltar-gerenciamento`: Retorna para a **Tela 1 (Tela Inicial)**.
  * `#botao-baixar-historico`: Exporta e faz download do histórico de fases em formato JSON.
  * `#botao-importar-historico`: Abre seletor de arquivos local para importar um histórico JSON salvo.
  * `#botao-apagar-historico`: Exibe confirmação destrutiva e apaga os dados locais salvos no navegador.
* **Estilização e acabamento:**
  * O fundo de todos os blocos de dados (`#info-fases`, `#botao-baixar-historico`, `#botao-importar-historico` e `#botao-apagar-historico`) possui **opacidade 100% na cor `#100819`** (`var(--cor-fundo-roxo)`).
  * Scroll lateral removido em definitivo via `overflow-x: hidden`.
  * Os botões clicáveis contam com espaçamento lateral de respiro (`padding: 4px 6px`) para que o feixe de luz exterior de 4px não seja cortado pelas bordas de rolagem.
* **IDs de textos dinâmicos:**
  * `#contagem-fases`: Exibe o número de fases salvas no histórico local (ex.: `"1 fase(s)"`).

---

### Tela 5: Visualização do Universo 3D
* **Arquivo HTML:** `05-visualizacao.html`
* **CSS:** `css/base.css`, `css/hover.css`, `css/barra-inferior.css`
* **Container principal:** `#tela-visualizacao`
* **Fundo desfocado:** Não (a cena 3D é exibida com nitidez total).
* **Fluxo de navegação:**
  * *Origem:* Telas 1, 2 ou 3 (ao iniciar, carregar ou atualizar), ou Tela 8/9 ao fechar o menu/cancelar saída.
  * *Destino:* Tela 6 (ao clicar em `?`), Tela 7 (ao clicar em um astro 3D) ou Tela 8 (ao clicar no logo NEXUS).
* **IDs interativos e ações ao clicar (Barra Inferior Compartilhada):**
  * `#botao-menu`: Abre o **Menu Lateral (Tela 8)** com desfoque de fundo.
  * `#botao-retroceder`: Retrocede uma fase na timeline temporal do universo 3D.
  * `#botao-avancar`: Avança uma fase na timeline temporal do universo 3D.
  * `#botao-saibamais`: Abre/alterna o painel explicativo **Saiba Mais (Tela 6)**.
* **IDs de textos dinâmicos:** Nenhum na UI fixa (a navegação temporal altera o estado da cena 3D).

---

### Tela 6: Saiba Mais ("Como ler este universo")
* **Arquivo HTML:** `06-saibamais.html`
* **CSS:** `css/base.css`, `css/hover.css`, `css/barra-inferior.css`, `css/tela-saibamais.css`
* **Container principal:** `#tela-saibamais`
* **Fundo desfocado:** Não (o universo 3D permanece nítido ao fundo).
* **Fluxo de navegação:**
  * *Origem:* Tela 5 (ao clicar no botão `?` da barra inferior).
  * *Destino:* Retorna para a Tela 5 (ao fechar/clicar em `?` novamente), ou abre a Tela 8 pelo botão de menu.
* **IDs interativos e ações ao clicar:**
  * `#botao-saibamais`: Fecha o painel flutuante e retorna à visualização desobstruída (**Tela 5**).
  * `#painel-saibamais`: Painel lateral direito com rolagem independente dos termos astrofísicos e emocionais.
  * `#botao-menu`, `#botao-retroceder`, `#botao-avancar`: Controles mantidos na barra inferior.
* **Estilização da aba:**
  * O painel `#painel-saibamais` utiliza fundo **`#100819` com 75% de opacidade** (`var(--cor-fundo-roxo-opaco)`).
* **IDs de textos dinâmicos:**
  * `#titulo-saibamais`: `"Como ler este universo"` (texto fixo de guia).

---

### Tela 7: Descrição do Astro
* **Arquivo HTML:** `07-astro.html`
* **CSS:** `css/base.css`, `css/hover.css`, `css/barra-inferior.css`, `css/tela-astro.css`
* **Container principal:** `#tela-astro`
* **Fundo desfocado:** Não (a cena 3D permanece nítida; o usuário observa o astro selecionado).
* **Fluxo de navegação:**
  * *Origem:* Tela 5 (disparado ao clicar/selecionar um astro no canvas Three.js).
  * *Destino:* Retorna para a Tela 5 (ao fechar o painel via `#botao-fechar-astro` ou desselecionar o astro).
* **IDs interativos e ações ao clicar:**
  * `#botao-fechar-astro`: Fecha o painel lateral esquerdo e desseleciona o astro, voltando à **Tela 5**. Utiliza anel de luz circular (`border-radius: 50%`).
  * `#botao-menu`, `#botao-retroceder`, `#botao-avancar`, `#botao-saibamais`: Controles da barra inferior.
* **IDs de textos dinâmicos (alimentados pelo Three.js/IA):**
  * `#subtipo-astro`: Tipo e categoria do astro (ex.: `"PLANETA COM ANÉIS · ÁREA DA VIDA"`).
  * `#nome-astro`: Nome do astro (ex.: `"Família"`, `"Carreira"`, `"O Eu"`).
  * `#descricao-astro`: Parágrafo narrativo detalhando o significado do astro.
  * `#citacao-astro`: Citação em itálico com a lei astrofísica e emocional aplicada.
  * `#texto-porque`: Explicação do porquê daquele astro ter sido gerado nessa forma e escala.
  * `#texto-fase`: Nome e dinâmica da fase atual do astro.
  * `#pontos-peso-astro`: Indicador visual de 5 pontos (`.ativo` para pontos preenchidos, `.inativo` para vazios).
  * `#valor-profundidade`: Texto da profundidade temporal (ex.: `"recente"`).

---

### Tela 8: Menu Lateral
* **Arquivo HTML:** `08-menu.html`
* **CSS:** `css/base.css`, `css/hover.css`, `css/tela-menu.css`
* **Container principal:** `#tela-menu`
* **Fundo desfocado:** Sim (desfoque gaussiano de 8,5px sobre o universo 3D via `#fundo-desfocado`).
* **Fluxo de navegação:**
  * *Origem:* Telas 5, 6 ou 7 (ao clicar no isotipo NEXUS na barra inferior).
  * *Destino:* Retorna à Tela 5 (pressionando ESC ou clicando fora), vai para a Tela 1 (via Voltar à tela inicial) ou abre a Tela 9 (ao clicar em Sair).
* **IDs interativos e ações ao clicar:**
  * `#botao-voltar-inicio`: Retorna para a **Tela 1 (Tela Inicial)**.
  * `#botao-abrir-sair`: Abre o modal de confirmação de saída (**Tela 9**).
  * `#dica-esc` / Tecla `ESC`: Fecha o menu e retorna à visualização livre (**Tela 5**).
* **Estilização dos botões e atalho:**
  * O fundo dos botões `#botao-voltar-inicio` e `#botao-abrir-sair` é sólido com **100% de opacidade na cor `#100819`** (`var(--cor-fundo-roxo)`).
  * O indicador de atalho `#dica-esc` possui a tecla visual `<kbd class="tecla-atalho">ESC</kbd>` **preenchida em branco nexus** (`var(--cor-branco-nexus)`) com o texto "ESC" em `#100819` (`var(--cor-fundo-roxo)`), mantendo o texto auxiliar "Voltar" em branco nexus.
* **IDs de textos dinâmicos:** Nenhum.

---

### Tela 9: Confirmação de Saída
* **Arquivo HTML:** `09-sair.html`
* **CSS:** `css/base.css`, `css/hover.css`, `css/tela-sair.css`
* **Container principal:** `#tela-sair`
* **Fundo desfocado:** Sim (desfoque gaussiano de 8,5px aplicado via `#fundo-desfocado` em `z-index: 15`, desfocando tanto o canvas quanto qualquer menu aberto atrás).
* **Fluxo de navegação:**
  * *Origem:* Tela 8 (ao clicar no botão SAIR).
  * *Destino:* Retorna para a Tela 8 (ao clicar em NÃO, CONTINUAR NO NEXUS) ou encerra a aplicação (ao clicar em SIM, SAIR DO NEXUS).
* **IDs interativos e ações ao clicar:**
  * `#botao-cancelar-sair`: Fecha o modal e retorna para o **Menu (Tela 8)**.
  * `#botao-confirmar-sair`: Confirma a saída, encerra a sessão e redireciona/fecha o NEXUS.
* **Comportamento visual:** Ambos os botões são em formato de pílula (`border-radius: 9999px`) com o anel de luz correspondente adaptado ao contorno oval.
* **IDs de textos dinâmicos:** Nenhum (mensagens fixas de confirmação).

---

## 2. Instruções de Integração no Projeto Final

### O que remover na unificação:
1. **`.fundo-teste` e `css/fundo-teste.css`:**
   * Todos os elementos `<div class="fundo-teste">` e `<div class="fundo-teste com-desfoque">` devem ser **completamente removidos**.
   * O link para `css/fundo-teste.css` deve ser removido do `<head>`. O fundo real é o `<canvas>` gerenciado pelo Three.js.

### Ordem de carregamento dos arquivos CSS:
No documento final (seja uma página única ou SPA), carregar os arquivos na seguinte ordem de precedência:

1. `css/base.css` *(Fundação: variáveis `:root`, `@font-face`, reset global, contêiner `.nexus-ui`, tipografia base)*
2. `css/hover.css` *(Comportamento global de foco, active e anel de luz exterior para todos os botões)*
3. `css/barra-inferior.css` *(Barra fixa compartilhada das telas de visualização)*
4. CSSs específicos de cada tela:
   - `css/tela-inicial.css`
   - `css/tela-comecar.css`
   - `css/tela-atualizar.css`
   - `css/tela-gerenciamento.css`
   - `css/tela-saibamais.css`
   - `css/tela-astro.css`
   - `css/tela-menu.css`
   - `css/tela-sair.css`

---

## 3. Filosofia de Cliques e Performance
* **`pointer-events`**:
  * Contêineres de tela cheia (`.nexus-ui`, `#fundo-desfocado`, `.barra-inferior`) usam `pointer-events: none` para que cliques e gestos de rotação/zoom do mouse cheguem ao canvas Three.js sem bloqueio.
  * Apenas os painéis flutuantes (`.painel-vidro`, `.painel-saibamais`, etc.) e os botões individuais possuem `pointer-events: auto`.
* **Animações leves**:
  * Todas as transições de hover utilizam estritamente `transform` e `opacity` com aceleração por hardware (`will-change: transform`).
  * Nenhum filtro pesado (`blur`, `box-shadow`) é animado continuamente durante o hover, garantindo 60 FPS contínuos no motor 3D.
* **Estrutura do anel de luz (`btn__feixe`)**:
  * Todo botão interativo contém `<span class="btn__feixe" aria-hidden="true"></span>` como primeiro elemento filho. O efeito de anel corre por fora das bordas sem interferir no conteúdo ou nos textos dos botões.
