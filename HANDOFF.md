# NEXUS · HANDOFF

**Atualizado em 30/09/2026.** Leia `NEXUS\\\_CONTEXT.md` antes deste arquivo.
**Prazo:** desenvolvimento até domingo 04/10. Entrega na segunda 05/10.

## Estado atual

Base **3D estilizada** funcionando com **3 sistemas**, cada um com estrela própria, luz própria e planetas orbitando: fundo com profundidade, estrelas em cruz em 3 camadas com parallax, planetas com personalidade (cor, manchas, anel, lua), órbitas sutis, nomes flutuantes (só aparecem perto do sistema), câmera com arrastar/zoom/pinça e placeholder do logo. O autor aprovou o visual e confirmou que o P3 funciona. O **P4** (nível de detalhe por distância) e o **P5** (elementos estrela) já estão nos arquivos, mas o visual deles ainda **não foi confirmado no navegador**.

* **Estudos e trabalho** `\\\[0,0,0]`, estrela laranja: Faculdade, Trabalho, Projetos.
* **Corpo e mente** `\\\[95,8,-45]`, estrela vermelha: Saúde, Hobbies.
* **Pessoas** `\\\[-85,-6,60]`, estrela azul: Relacionamentos, Família.

Só existem elementos do tipo **estrela**: "Nota máxima" (Faculdade, importância alta) e "Projeto concluído" (Projetos, média). Os outros planetas ainda têm `elements: \\\[]`. Ainda **não há interação** (clique, painel).

## Stack e como roda

* Three.js **r128** via CDN, JavaScript **clássico** (sem build, sem módulos ES). Funciona com duplo clique em `index.html`.
* Cada arquivo registra o que oferece dentro do objeto global `NEXUS`.
* A ordem dos `<script>` em `index.html` é obrigatória. Trecho final atual: `labels.js`, `planets.js`, `elements/star.js`, `lod.js`, `system.js`, `main.js`. Elemento novo = `<script>` novo logo depois de `planets.js`.

## Nível de detalhe (LOD) e elementos

* **LOD por sistema** (`lod.js`): mede a distância da câmera até o centro de cada sistema. Mais de 150 = **longe** (estrela + pontinhos no lugar dos planetas); de 70 a 150 = **médio** (planetas e órbitas); menos de 70 = **perto** (também os nomes). Fade de 0,5 s. As constantes (`DIST\\\_PERTO`, `DIST\\\_LONGE`, `TEMPO\\\_FADE`, `TAMANHO\\\_PONTO`) ficam no topo de `lod.js`; os valores 70 e 150 são um primeiro palpite, ajustar olhando no navegador.
* **Como o fade funciona:** ao montar o sistema, o LOD percorre o grupo de cada planeta e guarda a opacidade original de todos os materiais; depois multiplica por 0 a 1 a cada quadro. Por isso os elementos precisam ser filhos do grupo do planeta e existir antes de `buildLOD`. No nível longe, as estrelas-conquista somem junto com os planetas (só os pontinhos dos planetas aparecem).
* **Elementos:** `planets.js` lê `planet.elements` e chama `N.elementBuilders\\\[tipo](elemento, planeta)`, que devolve `{ object, update(dt) }`. O `object` entra no grupo do planeta e o `update(dt)` roda a cada quadro. Tipo sem construtor só gera um aviso no console.
* **Estrela (`elements/star.js`):** sprite de 4 pontas em duas camadas (núcleo claro + brilho dourado, mistura aditiva), em órbita inclinada ao redor do planeta (distância = 2,7 × tamanho do planeta). Tamanho por importância: low 1,0 · medium 1,5 · high 2,1. Posição inicial e piscar vêm do `id` (não mudam a cada carregamento). O piscar mexe na cor e na escala, nunca na opacidade.

## Formato dos dados (`mockUniverse.js`)

`{ today, systems\\\[] }` com `systems\\\[] → planets\\\[] → elements\\\[]`.

* `today`: "hoje" virtual (`'2026-09-30'`), não a data real do computador.
* Sistema: `id, name, position \\\[x,y,z], starColor, starPatch (3 cores das manchas), planets\\\[]`.
* Planeta: `id, name, base, patch\\\[3], size, orbit, speed, rings?, moon?, elements\\\[]`. IDs atuais: `p1` a `p7`.
* Elemento (por enquanto só `star` tem visual; IDs atuais: `e1`, `e2`): `{ id, type: 'star'|'asteroid'|'satellite'|'blackhole', title, date?, importance: 'low'|'medium'|'high', status: 'active'|'growing'|'resolved' }`.

## Mapa de arquivos

|Arquivo|Responsabilidade|Expõe|
|-|-|-|
|`js/core/utils.js`|Cria `NEXUS`; ferramentas|`rand`, `makeTexture`, `sparkTexture()` (estrela de 4 pontas compartilhada), `capsule`, `blobs`|
|`js/data/mockUniverse.js`|**Dados** (3 sistemas, 2 estrelas-conquista)|`data`, `getUniverse()`|
|`js/core/scene.js`|Cena, câmera (alcance 2000), renderer, **luz ambiente**, gradiente toon|`scene`, `cam`, `renderer`, `toon`|
|`js/core/controls.js`|Câmera: girar/zoom (14 a 260), sempre olhando para (0,0,0)|`controls.update(dt)`, `controls.state`|
|`js/world/background.js`|Fundo `#100819`/`#111450` (esfera de raio 1000)|`buildBackground()`|
|`js/world/starfield.js`|Estrelas em cruz (usa `sparkTexture()`), camadas a partir de 280 de distância|`buildStarfield()`|
|`js/world/sun.js`|Estrela central; brilho e manchas vêm de `starColor`/`starPatch`|`buildSun(system, parent)`|
|`js/world/planets.js`|Planetas, órbitas, anéis, luas e **elementos** dentro da "caixa" do sistema|`buildPlanets(list, parent)`, `updatePlanets(items, dt, nomes)`, `elementBuilders` (mapa tipo → construtor)|
|`js/world/elements/star.js`|Elemento `star` (conquista)|registra `elementBuilders.star`|
|`js/world/lod.js`|Nível de detalhe por distância, com fade|`buildLOD(group, planets)`, `updateLOD(system, dt)`|
|`js/world/system.js`|Monta UM sistema: grupo na posição dos dados (inclinado 0.16), **luz da estrela** (alcance 60), estrela, planetas e **LOD**|`buildSystem(systemData)`, `updateSystem(system, dt)`|
|`js/ui/labels.js`|Nomes flutuantes; a visibilidade (0 a 1) vem do LOD|`createLabel`, `updateLabel(el, obj, size, alpha)`|
|`js/main.js`|Cria um sistema por item dos dados e roda o loop|(nada)|

## Regras (não quebrar)

1. Dados **só** em `mockUniverse.js`, lidos via `NEXUS.getUniverse()`. Nunca escrever planetas ou eventos dentro de componentes.
2. **Um arquivo = uma responsabilidade.** Objeto novo = arquivo novo em `js/world/` + uma chamada em `main.js` + um `<script>` em `index.html`.
3. **Não criar nem redesenhar o logo.** Manter o placeholder.
4. Sem backend, autenticação, banco ou integrações.
5. Mudanças pequenas, uma por vez. Preservar o que já funciona.
6. Manter o visual de **ilustração** (toon/flat, manchas em cápsula, cores saturadas). Nada de fotorrealismo, neon exagerado ou HUD pesado.
7. Comentar o código em português simples: o autor está aprendendo.
8. **Cada sistema vive no próprio grupo** (`buildSystem`). Não existe mais grupo global (`N.sys` foi removido). Objetos de um sistema são filhos do `parent` recebido.
9. **Cada estrela tem a própria luz** (alcance limitado). Não recriar a luz única global.
10. Estrelas de fundo e céu ficam **além do zoom máximo** (280+). Se o zoom máximo (260) ou as posições dos sistemas mudarem, revisar `starfield.js` e `background.js`.
11. **Um arquivo por tipo de elemento** em `js/world/elements/`, registrado em `NEXUS.elementBuilders`. O construtor devolve `{ object, update(dt) }` e o `object` vira filho do grupo do planeta.
12. **Não animar `material.opacity`** de nada dentro do grupo de um planeta: o LOD a controla a cada quadro. Animar cor, escala ou posição.

## Concluído até agora

* **Base modular** (fundo, estrelas, estrela central, planetas, câmera, nomes, placeholder do logo).
* **P1:** auditoria do código (relatório entregue, nada alterado).
* **P2:** dados reestruturados para `today` + `systems\\\[] → planets\\\[] → elements\\\[]`.
* **P3:** vários sistemas: `system.js`, 3 sistemas nos dados, luz por estrela, cor do brilho e das manchas por estrela, zoom até 260, estrelas de fundo e céu afastados, nomes calculados pela posição no universo.
* **P4:** nível de detalhe por distância (`lod.js`), com fade de 0,5 s e constantes no topo; substituiu o corte fixo de 70 em `labels.js`. Falta confirmar no navegador.
* **P5:** elementos `star` (`elements/star.js`), mapa `elementBuilders` em `planets.js`, `NEXUS.sparkTexture()` em `utils.js` (também usada por `starfield.js`) e 2 estrelas no mock. Falta confirmar no navegador.

## Pendente

Elementos satélite, asteroide e buraco negro, interação (hover, clique, câmera que voa, painel), legenda, "avançar o tempo" e animações, polimento, desempenho, logo definitivo, publicação e roteiro da demo. Detalhes e prompts em `NEXUS\\\_PROMPTS.md`.

## Próximas 3 tarefas (em ordem)

1. **P6 · Elementos "satélite" (hábitos).** Criar `js/world/elements/satellite.js` no mesmo padrão do `star.js` (registrar em `N.elementBuilders.satellite`): satelitezinho de formas simples (corpo pequeno e dois painéis achatados), em órbita estável e circular ao redor do planeta, com leve inclinação, cores da paleta do planeta e toon shading. Exemplos no mock: "Treino 3x por semana" em Saúde e "Estudar 1h por dia" em Faculdade.
2. **P7 · Elemento "asteroide/cometa" (evento chegando). Nunca cortar.** Criar `js/world/elements/asteroid.js`: rocha de poucas faces (`IcosahedronGeometry`, `flatShading`), cinza-alaranjada, com cauda azul-clara apontando para longe do planeta. A distância até o planeta depende dos dias restantes até `element.date`, contados a partir de `today` (14 dias ou mais = bem longe, 0 = encostando). `importance: 'high'` deixa o asteroide maior. Move-se devagar, sem parar de fluir. Criar `NEXUS.daysUntil(dateISO)` em `utils.js`. Exemplos no mock: "Prova de Cálculo" em Faculdade (4 dias depois de `today`, high) e "Entrega do relatório" em Trabalho (10 dias depois).
3. **P8 · Elemento "buraco negro" (preocupação).** Criar `js/world/elements/blackhole.js`: esfera preta, anel achatado roxo/violeta brilhante e poucos espinhos finos de luz roxa, inspirado no Outer Wilds (sem lente gravitacional realista). Pulsa muito de leve. Tamanho base pela `importance`, 1,6x maior se `status` for `growing`. Fica um pouco afastado do planeta. Exemplo no mock: "Prazo acumulado" em Trabalho, status `active`.

Depois dessas: interação (P9 a P12: hover e clique com `js/core/picking.js`, câmera que voa até o planeta, painel `js/ui/panel.js`, legenda `js/ui/legend.js`); depois "avançar o tempo" (P13, com `js/core/timeline.js`, e P14, animações), arte (P15 e P16) e fechamento (P17 a P21, com freeze no domingo às 20h).

**Se o tempo ou o crédito apertar, cortar nesta ordem** (o primeiro da lista sai primeiro): P16 (polimento); P17, mantendo só o limite de pixel ratio; P12 (legenda); P4 (nível de detalhe, já feito, então não se aplica); um dos três sistemas (ficar com 2); P8 (buraco negro); P6 (satélites).
**Nunca cortar:** P2, P3, P7 (asteroide), P9 a P11 (clique e painel), P13 e P14 (o universo muda), P19 (logo) e P20 (link).

## Problemas conhecidos

* **Mouse ligado na janela inteira** (`controls.js`): arrastar ou rolar sobre painéis e botões vai mexer na câmera. Ligar os eventos só ao canvas antes do P11. Também falta separar "clique" de "arrasto" (P9).
* **Câmera só orbita a origem**: falta o alvo móvel e o voo até um planeta (P10).
* **Planetas mudam a cada carregamento**: manchas e ângulo inicial das órbitas usam `Math.random`. Ideal: sorteio com semente a partir do `id` e `startAngle` nos dados. As estrelas-conquista já fazem isso (posição inicial e piscar vêm do `id`).
* **`getUniverse()` devolve o objeto original**: para o "avançar o tempo" e o "voltar ao início" (P13) será preciso uma cópia de trabalho.
* **O LOD só conhece o que existe na construção**: elementos criados depois (ex.: estrela que nasce no "avançar o tempo", P13) não entram no fade e precisarão ser registrados no LOD.
* **`star.js` redefine a escala das camadas a cada quadro** (para piscar). No P14 (estrela que nasce ou some), multiplicar por um fator de crescimento em vez de só escrever a escala; o mesmo vale para os elementos novos.
* **Títulos dos elementos ainda não aparecem**: `title` só será usado na interação (P9 a P12).
* **Luz dos sistemas de fora** pode parecer um pouco mais escura que a do sistema 1 (alcance 60, intensidade 1.7 em `system.js`). Ajustar a intensidade se incomodar.
* **Céu não acompanha a câmera**: ele é centrado na origem (raio 1000), com câmera até 260. Hoje funciona, mas depende dos limites acima.
* **Desempenho**: cada planeta cria a própria textura, cada estrela central cria a própria textura de brilho. A estrela de 4 pontas (`sparkTexture`) e o pontinho do LOD já são compartilhados. Tratar o resto no P17, evitando crescer o problema nos elementos novos.
* O anel de Trabalho usa material sem luz (fica chapado por escolha, mas pode receber sombra).
* Não testado em celular de baixa potência.
* O texto de dica na tela ("arraste para girar...") é fixo no `index.html`.

## Referências visuais (já aprovadas)

Kurzgesagt (manchas em cápsula, estrelas em cruz, fundo roxo-índigo), Star Birds (planetas roliços e cheios de personalidade), Outer Wilds (estrela grande em camadas, preto profundo, cometa com cauda azul, buraco negro com espinhos roxos).

