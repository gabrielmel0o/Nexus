# NEXUS · Contexto do projeto (para IAs)

**Versão:** 2.4 · 30/09/2026
**Stack atual:** HTML5, CSS3, JavaScript puro (ES Modules) e Three.js via CDN (3D ativo).
**Prazo:** desenvolvimento de quarta 30/09 a domingo 04/10/2026.
**Entrega/apresentação:** segunda 05/10/2026.

---

## Como usar este arquivo

- **Claude / ChatGPT / Gemini / Windsurf / Antigravity / Cursor:** salve como `NEXUS_CONTEXT.md` na raiz do repositório ou cole como primeira mensagem.
- Instrua a IA a ler este arquivo antes de propor alterações de código.

---

## Instruções para a IA (leia primeiro)

1. Leia este arquivo na íntegra antes de criar ou alterar qualquer elemento na base de código.
2. Faça **uma mudança pequena e coerente por vez**. Não tente implementar várias funcionalidades de uma só vez.
3. Escopo atual: **somente frontend em JavaScript puro + 3D + mock data.** Sem backend, banco de dados, autenticação ou integrações externas.
4. **Não crie nem redesenhe o logo do NEXUS.** Mantenha apenas um placeholder/área delimitada na UI. O logo será feito pelo autor.
5. **Não copie literalmente nenhuma referência visual.** As referências servem apenas como inspiração de atmosfera.
6. Mantenha os dados **estritamente separados da renderização 3D**, permitindo a substituição futura por uma API real.
7. Preserve o código 3D/Canvas existente e funcional. Altere apenas o que for solicitado na tarefa atual.
8. Se algo neste arquivo conflitar com o pedido direto do usuário, o pedido do usuário prevalece. Avise o conflito em uma frase simples.
9. Em caso de ambiguidade, escolha a solução mais simples, informe a escolha e prossiga. Faça no máximo uma pergunta por resposta.
10. **Regras de Git (obrigatórias):**
    - Nunca execute `git push`.
    - Nunca crie repositórios, nem adicione ou altere remotes.
    - Nunca altere a configuração global do git (`--global`).
    - Faça commits locais somente quando o usuário pedir.
    - O envio ao GitHub é sempre feito manualmente pelo usuário, porque a máquina tem mais de uma conta configurada.

---

## 1. O que é o NEXUS

Uma interface visual interativa que representa a vida de uma pessoa como um **universo 3D dinâmico e vivo.**

> "Se a sua vida fosse um universo, como ele estaria hoje?"

O universo **é a própria interface.**

Não se trata de:

- um dashboard com fundo espacial;
- uma aplicação de produtividade tradicional com uma skin espacial.

Conforme os aspectos da vida do usuário mudam, o universo 3D se transforma visualmente.

---

## 2. Estrutura conceitual no espaço 3D

```
Universo
   ↓
Sistemas
   ↓
Planetas
   ↓
Elementos
```

| Elemento | Representa |
|---|---|
| Planeta | Área importante da vida (faculdade, trabalho, saúde, hobbies, relacionamentos...) |
| Estrela | Conquista ou realização marcante |
| Asteroide / cometa | Evento, prazo ou mudança se aproximando |
| Buraco negro | Problema ou preocupação persistente |
| Satélite | Hábito ou rotina mantida |
| Constelação | Agrupamento de projetos ou objetivos |
| Lua / fenômenos | Elementos temporários ou secundários |

> As regras semânticas ainda não estão fechadas. A cosmologia do NEXUS deve continuar sendo um experimento visual orgânico.

---

## 3. Diretrizes do motor 3D (Three.js puro)

- Three.js via CDN, **com a versão fixada no endereço do script**.
- ES Modules nativos (`<script type="module">`).
- OrbitControls para navegação.

### Estilo visual

**Ilustrativo / toon.**

Evitar:

- fotorrealismo;
- materiais PBR complexos.

Preferir:

- formas simples;
- materiais estilizados;
- iluminação limpa;
- brilho suave em estrelas.

Materiais possíveis:

- `MeshToonMaterial`
- `MeshBasicMaterial`
- shaders customizados leves

### Desempenho

Manter:

- FPS estável;
- poucos polígonos;
- poucas luzes dinâmicas;
- partículas controladas.

---

## 4. Direção artística

A estética combina três referências:

### Kurzgesagt

Inspirado em:

- formas geométricas;
- composição limpa;
- linguagem ilustrativa.

### Star Birds

Inspirado em:

- universo lúdico;
- planetas com personalidade;
- atmosfera convidativa.

### Outer Wilds

Inspirado em:

- exploração;
- descoberta;
- iluminação cinematográfica;
- profundidade espacial.

### Evitar

- dashboards corporativos;
- excesso de HUD;
- cyberpunk exagerado;
- neon excessivo;
- texturas realistas.

---

## 5. Paleta de cores

| Aplicação | Cor |
|---|---|
| Espaço profundo | `#100819` |
| Espaço iluminado | `#111450` |
| Tipografia / UI | `#FFFFFF` |

A atmosfera deve utilizar:

- névoa (`scene.fog`);
- partículas discretas;
- variação de profundidade.

Cada planeta possui identidade visual própria. Não existe regra fixa de cor por área da vida.

---

## 6. Interface do usuário (UI overlay)

A UI deve ser:

- mínima;
- integrada ao universo.

Implementação:

- HTML/CSS sobre o canvas Three.js.
- `pointer-events: none` no container geral.
- `pointer-events: auto` nos elementos clicáveis.

Interação:

- Raycaster do Three.js.
- Clique em planetas/elementos.
- Abrir painéis HTML minimalistas.

Critério:

> "Este componente parece parte do universo ou um painel colado por cima dele?"

---

## 7. Placeholder de logo

Não criar o logo.

Manter apenas:

```html
<div id="nexus-logo-placeholder">
    NEXUS
</div>
```

O logo final será criado pelo autor.

---

## 8. Arquitetura de dados

A cena 3D consome dados exclusivamente de:

```
./data/mockUniverse.js
```

Nenhuma informação do universo (planetas, eventos, hábitos etc.) deve ficar fixa dentro do código de renderização. Trocar o mock por uma API no futuro deve exigir mudanças apenas nesta camada.

### Formato dos dados

**Sistema:** `id`, `name`, `position` (`[x, y, z]`), `starColor`, `planets`.

**Planeta:** `id`, `name`, `area`, `color`, `size`, `orbitRadius`, `orbitSpeed`, `elements`. Opcionais: `accent`, `hasRings`.

**Elemento:**

| Campo | Valores |
|---|---|
| `id` | texto único |
| `type` | `star`, `asteroid`, `satellite`, `blackhole`, `moon`, `constellation` |
| `title` | texto |
| `date` | data em formato ISO (opcional; usada para aproximar asteroides) |
| `importance` | `low`, `medium`, `high` |
| `status` | `active`, `growing`, `resolved` |

### Exemplo

```javascript
export const mockUniverse = {
  systems: [
    {
      id: "sys-estudos-trabalho",
      name: "Estudos e Trabalho",
      position: [0, 0, 0],
      starColor: "#ffd36e",
      planets: [
        {
          id: "p-faculdade",
          name: "Faculdade",
          area: "estudos",
          color: "#5b8cff",
          size: 1.2,
          orbitRadius: 6,
          orbitSpeed: 0.01,
          elements: [
            {
              id: "e-prova-calculo",
              type: "asteroid",
              title: "Prova de Cálculo",
              date: "2026-10-08",
              importance: "high",
              status: "active"
            },
            {
              id: "e-rotina-estudo",
              type: "satellite",
              title: "Estudar todo dia",
              importance: "medium",
              status: "active"
            },
            {
              id: "e-prazo-tcc",
              type: "blackhole",
              title: "Prazo do TCC",
              importance: "high",
              status: "growing"
            },
            {
              id: "e-projeto-concluido",
              type: "star",
              title: "Projeto concluído",
              importance: "medium",
              status: "resolved"
            }
          ]
        }
      ]
    }
  ]
};

export function useUniverse() {
  return mockUniverse;
}
```

---

## 9. Requisitos do MVP

Entrega: **segunda-feira 05/10.**

### Necessário

1. Navegação 3D fluida (OrbitControls: zoom, rotação, pan).
2. Renderização de 2 ou 3 sistemas planetários.
3. Sistemas gerados a partir do `mockUniverse.js`.
4. Seleção via raycasting.
5. Clique em planeta: destacar o objeto e abrir um cartão HTML discreto.
6. Simulação de tempo, por exemplo: aproximar um asteroide, aumentar a escala de um buraco negro, fazer uma estrela nascer, mudar estados visuais.
7. Direção artística reconhecível e logo em placeholder.

---

## 10. O que NÃO fazer

- Não introduzir bundlers (Vite/Webpack) enquanto o HTML/JS puro via CDN estiver funcionando.
- Não introduzir frameworks (React, Vue etc.) nem ferramentas de build.
- Não misturar a criação de objetos 3D com os dados do universo.
- Não usar shaders pesados.
- Não sacrificar desempenho por efeitos visuais.
- Não implementar backend, banco de dados, autenticação ou integrações externas.
- Não criar nem redesenhar o logo.

---

## 11. Perguntas ainda em aberto (não resolver sozinho)

- Regras definitivas da cosmologia (o que cada objeto representa de fato).
- Se haverá semântica de cor por área da vida.
- Modelo de dados definitivo com o futuro backend.

Se uma tarefa depender de uma dessas decisões, escolha a opção mais simples, avise qual escolheu e não trate a escolha como definitiva.
