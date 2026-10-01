# NEXUS · Contexto do projeto (para IAs)

**Versão:** 2.6 · 30/09/2026
**Stack atual:** HTML5, CSS3, JavaScript clássico (sem módulos ES, sem build, sem frameworks) e Three.js r128 via CDN.
**Estado atual:** base 3D estilizada com 3 sistemas, nível de detalhe por distância e estrelas-conquista. Prompts P1 a P5 concluídos e confirmados no navegador. Próximo: P6 (satélites).
**Prazo:** desenvolvimento de quarta 30/09 a domingo 04/10/2026 (congelar o código às 20h de domingo).
**Entrega/apresentação:** segunda 05/10/2026 (sem mexer no código nesse dia).

---

## Como usar este arquivo

- **Windsurf / Antigravity:** mantenha este arquivo na raiz do repositório (`nexus-base`) e peça para a IA lê-lo junto com o `HANDOFF.md` antes de qualquer alteração.
- **IAs de chat (Claude, ChatGPT, Gemini):** anexe este arquivo, o `HANDOFF.md` e somente os arquivos de código indicados no prompt.
- O `HANDOFF.md` descreve o estado detalhado do código (arquivos existentes, pendências, problemas conhecidos). Em caso de dúvida sobre o que existe hoje, o código e o `HANDOFF.md` valem mais que este arquivo.

---

## Instruções para a IA (leia primeiro)

1. Leia este arquivo e o `HANDOFF.md` na íntegra antes de criar ou alterar qualquer coisa. Siga também a seção **Regras (não quebrar)** do `HANDOFF.md`, que detalha as regras técnicas do código.
2. Faça **somente a tarefa pedida**, em **uma mudança pequena e coerente por vez**. Preserve tudo que já funciona.
3. **JavaScript clássico com Three.js r128 via CDN.** Sem build, sem módulos ES (`import`/`export`, `type="module"`), sem frameworks. O projeto precisa funcionar com duplo clique em `index.html`.
4. **Objeto global `NEXUS`:** cada arquivo registra o que oferece dentro dele. **A ordem das tags `<script>` em `index.html` importa.**
5. **Dados separados da renderização:** os dados vivem somente em `js/data/mockUniverse.js` e são lidos por `NEXUS.getUniverse()`. Nunca escreva planetas, elementos ou eventos dentro de outros arquivos.
6. **Um arquivo = uma responsabilidade.** Objeto novo = arquivo novo em `js/world/` (elementos em `js/world/elements/`) + uma chamada em `main.js` + uma tag `<script>` em `index.html`.
7. Escopo atual: **somente frontend + mock data.** Sem backend, banco de dados, autenticação ou integrações externas.
8. **Não crie nem redesenhe o logo do NEXUS.** Mantenha o placeholder atual (div com classe `logo`). O logo será feito pelo autor e inserido depois.
9. **Não copie literalmente nenhuma referência visual.** Elas servem de atmosfera, não de molde.
10. **Comente o código em português simples:** o autor está aprendendo.
11. **Ao terminar**, responda em poucas linhas: o que mudou, quais arquivos foram tocados e como testar. Entregue também uma tabela com **todos** os arquivos criados ou alterados, com as colunas: (1) caminho completo a partir da pasta `nexus`; (2) **NOVO** ou **SUBSTITUI**; (3) o que mudou, em uma frase. Diga se é preciso adicionar alguma linha `<script>` em `index.html` e em qual posição.
12. **Regras de Git (obrigatórias):**
    - Nunca execute `git push`.
    - Nunca crie repositórios, nem adicione ou altere remotes.
    - Nunca altere a configuração global do git.
    - Nunca use comandos destrutivos (`reset --hard`, `clean`, `push --force`) sem o usuário pedir explicitamente.
    - Faça commits somente quando o usuário pedir. O envio ao GitHub é sempre manual, feito pelo usuário.
13. Se algo neste arquivo conflitar com o pedido direto do usuário, o pedido do usuário prevalece. Avise o conflito em uma frase.
14. Em caso de ambiguidade, escolha a solução mais simples, diga qual escolheu e siga. No máximo uma pergunta por resposta.

---

## 1. O que é o NEXUS

Uma interface visual interativa que representa a vida de uma pessoa como um **universo 3D dinâmico e vivo.**

> "Se a sua vida fosse um universo, como ele estaria hoje?"

O universo **é a própria interface.** Não é um dashboard com fundo espacial nem um aplicativo de produtividade com tema de espaço. Conforme aspectos da vida do usuário mudam, o universo muda visualmente.

O usuário deve sentir: *"É assim que minha vida está agora"* e, com o tempo, *"Eu consigo ver minha vida mudando."*

---

## 2. Estrutura conceitual

```
Universo → Sistemas → Planetas → Elementos
```

| Elemento | Representa |
|---|---|
| Planeta | Área importante da vida (faculdade, trabalho, saúde, hobbies, relacionamentos...) |
| Estrela | Conquista ou realização marcante |
| Asteroide / cometa | Evento, prazo ou mudança se aproximando |
| Buraco negro | Problema ou preocupação persistente |
| Satélite | Hábito ou rotina mantida |
| Constelação, lua, fenômenos | Possibilidades futuras, ainda não definidas |

**As regras semânticas ainda não estão fechadas.** Trate como experimento visual. Não trave regras rígidas (por exemplo, "faculdade é sempre azul").

### Comportamentos esperados

- Prova se aproximando de um planeta → o asteroide chega mais perto conforme os dias passam.
- Projeto concluído → uma nova estrela surge.
- Problema que persiste → o buraco negro cresce.
- Hábito mantido → o satélite permanece em órbita estável.

### Sistemas e níveis de aproximação

Um sistema **não é um card**: é uma pequena cena espacial, com uma estrela central e planetas em órbita, separada dos outros sistemas por muito espaço vazio.

- **Longe:** estrela com brilho e pontinhos onde estão os planetas (sem órbitas e sem nomes).
- **Médio:** planetas e órbitas discretas.
- **Perto:** também os nomes e as informações.

Os limites de distância ficam como constantes fáceis de ajustar no topo do arquivo responsável.

---

## 3. Motor 3D (Three.js r128 via CDN)

- Fixar a versão r128 no endereço do script.
- Estilo **ilustrativo / toon**: formas simples, cores saturadas e controladas, iluminação limpa, brilho suave nas estrelas.
- Materiais possíveis: `MeshToonMaterial`, `MeshBasicMaterial`, shaders customizados leves.
- Névoa, estrelas de fundo em camadas e partículas discretas para profundidade.
- A câmera é controlada por `controls.js` (controle próprio do projeto): arrastar para girar, zoom (14 a 260) e pinça no celular, sempre olhando para a origem. O alvo móvel e o voo até o planeta virão no P10.
- Evitar: fotorrealismo, materiais PBR complexos, shaders pesados, muitas luzes dinâmicas.
- Desempenho: fluido em notebook comum e celular; poucos polígonos; geometrias e materiais reaproveitados.

---

## 4. Direção artística

Mistura de três referências, sem copiar nenhuma:

- **Kurzgesagt:** formas geométricas, composição limpa, linguagem de ilustração.
- **Star Birds:** universo lúdico, planetas com personalidade, atmosfera convidativa.
- **Outer Wilds:** exploração, descoberta, mistério, iluminação cinematográfica, profundidade.

**Síntese:** simples + lúdica + exploratória + contemplativa + misteriosa.

**Evitar:** visual corporativo, dashboard, excesso de HUD, excesso de neon, cyberpunk exagerado, fotorrealismo.

---

## 5. Paleta

| Uso | Cor |
|---|---|
| Espaço profundo | `#100819` |
| Espaço iluminado | `#111450` |
| Texto / UI | `#FFFFFF` |

Cada planeta tem identidade cromática própria, harmônica com o universo. **Não existe regra fixa de cor por área da vida.** Tipografia da UI: Nunito, branca.

---

## 6. Interface

Mínima e integrada ao universo. O universo é o protagonista; a UI aparece quando necessária.

- HTML/CSS sobre o canvas, com `pointer-events: none` no container geral e `pointer-events: auto` nos elementos clicáveis.
- Interação por raycaster: passar o mouse destaca, clicar seleciona e abre um painel discreto (fundo translúcido escuro, sem bordas pesadas).
- **Evitar:** sidebar, cards de dashboard, tabelas, excesso de menus, HUD cheio de informações.

Teste para qualquer elemento de UI: *"Isto parece parte do universo ou um painel colado por cima dele?"*

---

## 7. Logo

O autor cria o logo pessoalmente (Affinity). **Não criar nem redesenhar.** Manter o placeholder atual e, quando o arquivo existir, apenas usá-lo (`assets/logo.svg`), sem editá-lo.

---

## 8. Arquitetura de dados

Fluxo futuro: apps e serviços → APIs → backend do NEXUS → dados do usuário → universo visual. **Nada disso deve ser implementado agora.** Trocar o mock por uma API no futuro deve exigir mudanças apenas na camada de dados.

### Formato

```javascript
{
  today: '2026-09-30',          // "hoje" virtual (a demo avança esta data)
  systems: [
    {
      id, name,
      position: [x, y, z],
      starColor, starPatch,      // starPatch: 3 cores das manchas da estrela
      planets: [
        { id, name, base, patch, size, orbit, speed, elements: [] }
      ]
    }
  ]
}
```

**Elemento:**

| Campo | Valores |
|---|---|
| `id` | texto único |
| `type` | `'star'`, `'asteroid'`, `'satellite'`, `'blackhole'` (outros tipos virão depois) |
| `title` | texto |
| `date` | data ISO, opcional (usada para aproximar asteroides) |
| `importance` | `'low'`, `'medium'`, `'high'` |
| `status` | `'active'`, `'growing'`, `'resolved'` |

**Planeta:** `id`, `name`, `base` (cor principal), `patch` (3 cores das manchas), `size`, `orbit`, `speed`, `rings?`, `moon?`, `elements`. Leia o `js/data/mockUniverse.js` antes de alterar. A linha do tempo da demonstração ficará em `NEXUS.data.timeline`.

---

## 9. Estrutura de arquivos (resumo)

O mapa completo, com o que cada arquivo expõe, está no `HANDOFF.md`. Resumo:

- `index.html`, `style.css`
- `js/core/`: `utils.js` (cria o objeto `NEXUS`), `scene.js`, `controls.js`
- `js/data/mockUniverse.js`: todos os dados
- `js/world/`: `background.js`, `starfield.js`, `sun.js`, `planets.js`, `lod.js`, `system.js`
- `js/world/elements/`: `star.js` (um arquivo por tipo de elemento, registrado em `NEXUS.elementBuilders`)
- `js/ui/`: `labels.js`
- `js/main.js`
- `HANDOFF.md` e `NEXUS_PROMPTS.md` ficam na raiz de `nexus-base`, junto deste arquivo (fora da pasta `nexus`, que contém o código)

Planejados: `elements/satellite.js`, `asteroid.js` e `blackhole.js` (P6 a P8); `js/core/picking.js` (P9); `js/ui/panel.js` (P11); `js/ui/legend.js` (P12); `js/core/timeline.js` (P13); `assets/logo.svg` (P19).

### Como um elemento funciona

`planets.js` lê `planet.elements` e chama `NEXUS.elementBuilders[tipo](elemento, planeta)`, que devolve `{ object, update(dt) }`. O `object` vira filho do grupo do planeta e o `update(dt)` roda a cada quadro. O nível de detalhe (`lod.js`) controla a opacidade de tudo que está dentro do grupo do planeta, então **não animar `material.opacity`** desses objetos: animar cor, escala ou posição.

---

## 10. MVP (o que precisa existir na segunda)

1. Explorar o universo com rotação e zoom fluidos (e pinça no celular).
2. Três sistemas, cada um com estrela central e planetas em órbita.
3. Planetas com personalidade e cor própria.
4. Elementos (estrela, asteroide, satélite, buraco negro) vindos do mock.
5. Clicar em um planeta: a câmera voa até ele e um painel discreto explica o que ele representa.
6. **Ver o universo mudar:** botão "Avançar o tempo" em que o asteroide chega, uma estrela nasce e o buraco negro cresce.
7. Direção artística reconhecível e o logo do autor inserido.
8. Link publicado para a apresentação, e a versão local como reserva.

Objetivo final: olhar e pensar **"minha vida está sendo representada como um universo."**

---

## 11. O que NÃO fazer

- Não introduzir bundlers (Vite/Webpack), frameworks (React, Vue etc.) nem módulos ES.
- Não misturar a criação de objetos 3D com os dados do universo.
- Não usar shaders pesados nem sacrificar desempenho por efeitos visuais.
- Não implementar backend, banco de dados, autenticação ou integrações externas.
- Não criar nem redesenhar o logo.
- Não adicionar funcionalidades fora do MVP.
- Não executar `git push` nem outras ações de git fora das regras da seção de instruções.

---

## 12. Perguntas ainda em aberto (não resolver sozinho)

- Regras definitivas da cosmologia (o que cada objeto representa de fato).
- Se haverá semântica de cor por área da vida.
- Modelo de dados definitivo com o futuro backend.

Se uma tarefa depender de uma dessas decisões, escolha a opção mais simples, avise qual escolheu e não trate a escolha como definitiva.
