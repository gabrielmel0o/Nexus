/* mockUniverse.js — OS DADOS do universo de Helena.
   É o único arquivo que o backend vai substituir no futuro.
   Nenhum outro arquivo deve ter corpos escritos aqui dentro.

   Formato (seção 12 do NEXUS_CONTEXT.md):
     title, chapter, laws, systems[], forces[], chapters[]

   Cada sistema tem: id, name, position, depth, center + planets + orbiters
   Cada corpo tem:   params (valores animáveis do cap. 0) + info (texto do painel)
   Os capítulos só alteram os params via "set". */

NEXUS.data = {

  title: 'A galáxia de Helena',
  chapter: 0,   // capítulo atual (será gerenciado pelo state.js mais adiante)

  // ─── ESTRUTURAS DA GALÁXIA ────────────────────────────────────────────────
  galaxy: {
    arms: {
      routines: [
        { id: 'rot-trabalho',     name: 'Trabalho',     arm: 0, progress: 0.22 },
        { id: 'rot-academia',     name: 'Academia',     arm: 1, progress: 0.38 },
        { id: 'rot-contas',       name: 'Contas',       arm: 0, progress: 0.55 },
        { id: 'rot-mensagens',    name: 'Mensagens',    arm: 1, progress: 0.72 },
        { id: 'rot-compromissos', name: 'Compromissos', arm: 0, progress: 0.88 }
      ]
    }
  },

  // ─── AS LEIS (textos que aparecem no painel de cada corpo) ─────────────────
  laws: {
    luz:      'Lei da luz: quem emite luz é interno; quem reflete é derivado; quem não faz nem um nem outro é inconsciente.',
    massa:    'Lei da massa: massa é carga afetiva. O pequeno e denso pesa mais que o grande e difuso.',
    distancia:'Lei da distância: mede o quanto algo é acessível à consciência, não o quanto importa.',
    escala:   'Lei da escala: a duração de um astro é a permanência dele na mente.',
    evolucao: 'Lei da evolução: nada é só uma coisa; tudo tem uma fase.'
  },

  // ─── SISTEMAS ──────────────────────────────────────────────────────────────
  systems: [

    // ── 1. O EU (origem da galáxia) ─────────────────────────────────────────
    {
      id: 'eu',
      name: 'O Eu',
      position: [0, 0, 0],
      depth: 0,   // 0 = agora (o mais próximo da consciência)
      center: {
        kind: 'blackhole',
        variant: 'self',
        color: '#1a0a2e',       // quase preto; o Eu não emite luz própria
        patch: ['#2a1045', '#150830', '#0d0520'],
        params: { mass: 10 },
        info: {
          label: 'Buraco negro · O Eu',
          summary: 'Helena não consegue olhar diretamente para o Eu. Percebe sua presença ao notar que todas as suas escolhas tentam responder: "Estou vivendo uma vida que é minha?"',
          law: 'luz',
          why: 'O Eu nunca é visto diretamente; é deduzido pela órbita de tudo ao redor. Um buraco negro supermassivo que mantém a galáxia unida sem emitir luz própria.',
          phase: 'sempre presente, nunca observável',
          notes: {}
        }
      },
      planets: [],
      orbiters: []
    },

    // ── 2. A CRIAÇÃO (sistema principal; tem planetas e luz) ─────────────────
    {
      id: 'criacao',
      name: 'A criação',
      position: [48, 3, 18],
      depth: 1,   // 1 = recente (acessível)
      center: {
        kind: 'star',
        spectral: 'sun',
        // Cores mantidas da estrela "Estudos e trabalho" do código anterior
        color: '#ffb020',
        patch: ['#ffd43b', '#ff8a1f', '#fff3a0'],
        params: { brightness: 0.65, mass: 7 },
        info: {
          label: 'Estrela · Valor interno',
          summary: 'Helena não ama apenas arquitetura como profissão; gosta de imaginar lugares onde as pessoas possam respirar melhor. Quando está próxima dessa luz, trabalha com energia e sente que o mundo fica mais amplo.',
          law: 'luz',
          why: 'Emite luz própria porque é um valor interno, uma paixão genuína — não um papel ou obrigação. Ilumina os planetas ao redor.',
          phase: 'estrela principal em fase ativa',
          notes: {
            1: 'A proposta torna a carreira mais pesada e a estrela da criação começa a ficar encoberta.',
            2: 'A supernova libera brilho reprimido: a criação explode em luz.',
            3: 'A criação recupera brilho constante; Helena trabalha com propósito, não só com desempenho.'
          }
        }
      },
      // Planetas do sistema principal
      planets: [
        {
          id: 'corpo',
          name: 'Corpo',
          kind: 'rocky',
          base: '#c9714a',         // terracota quente — concreto, orgânico
          patch: ['#e8956a', '#a0522d', '#d4895f'],
          size: 1.0,
          orbit: 10,
          speed: 0.13,
          startAngle: 0.8,
          params: { size: 1, mass: 3, atmosphere: 0.25 },
          moons: [],
          elements: [],
          info: {
            label: 'Planeta rochoso · Área da vida',
            summary: 'O corpo de Helena é pequeno, concreto e sensível. Nos últimos meses sua atmosfera ficou rarefeita: ela dorme pouco, trabalha além do limite e tem dificuldade de perceber o próprio cansaço.',
            law: 'luz',
            why: 'Reflete luz — é uma área da vida, não um valor. Rochoso porque é limitado e sensível às condições externas.',
            phase: 'atmosfera rarefeita',
            notes: {
              1: 'A carreira cresce e o corpo perde ainda mais atmosfera.',
              3: 'Helena reserva tempo para si; a atmosfera começa a se recuperar.'
            }
          }
        },
        {
          id: 'carreira',
          name: 'Carreira',
          kind: 'gas',
          base: '#4a90d9',         // azul médio — vasto, institucional
          patch: ['#7bb3e8', '#2d6ba8', '#a8cff0'],
          size: 1.8,
          orbit: 22,
          speed: 0.07,
          startAngle: 2.2,
          params: { size: 1, mass: 9, atmosphere: 0.95 },
          moons: [
            {
              id: 'aprovacao',
              name: 'Lua da aprovação',
              size: 0.28,
              orbit: 3.2,
              speed: 0.85,
              color: '#f9e4a0',     // dourado quente — aprovação aquecida
              params: { mass: 3 },
              info: {
                label: 'Lua · Faceta da carreira',
                summary: 'Aumenta as marés quando Helena recebe elogios, críticas ou reconhecimento. Faz a carreira parecer maior do que é.',
                law: 'massa',
                why: 'Lua de baixa massa mas órbita próxima: perturba a estabilidade da carreira através de forças de maré.',
                phase: 'órbita luminosa em torno da carreira',
                notes: {
                  1: 'A promoção amplifica a busca por validação externa.',
                  3: 'A aprovação perde peso; Helena valida as próprias escolhas.'
                }
              }
            },
            {
              id: 'medo',
              name: 'Lua do medo',
              size: 0.22,
              orbit: 4.6,
              speed: 1.3,
              color: '#8b5cf6',    // violeta escuro — medo como sombra
              params: { mass: 4 },
              info: {
                label: 'Lua · Faceta da carreira',
                summary: 'Provoca eclipses ao passar diante da estrela da criação. Helena continua vendo o trabalho, mas deixa de enxergar por que começou a fazê-lo.',
                law: 'luz',
                why: 'Uma lua escura e veloz que não emite luz própria e projeta sua sombra sobre a área mais ativa de sua vida.',
                phase: 'órbita rápida em sombra periódica',
                notes: {
                  1: 'O medo do fracasso atinge o ápice com o novo cargo.',
                  2: 'A supernova dissipa parte do medo paralisante.',
                  3: 'O medo desacelera e se torna apenas cautela.'
                }
              }
            }
          ],
          elements: [],
          info: {
            label: 'Gigante gasoso · Área da vida',
            summary: 'A carreira tem enorme massa gravitacional: mesmo quando Helena pensa em outra coisa, ela continua puxando decisões, horários e energia. A atmosfera ficou tão espessa que Helena já não consegue enxergar a superfície.',
            law: 'massa',
            why: 'Gigante gasoso porque acumulou camadas de currículo, reconhecimento e estabilidade — a superfície original ficou escondida pela atmosfera densa.',
            phase: 'gigante gasoso com atmosfera opaca',
            notes: {
              1: 'Helena aceita a promoção. A carreira ganha massa e visibilidade.',
              2: 'A supernova abala a estabilidade; a atmosfera começa a se dissipar.',
              3: 'A carreira perde massa e deixa de dominar o sistema.'
            }
          }
        },
        {
          id: 'familia',
          name: 'Família',
          kind: 'ringed',
          base: '#e8c46a',         // dourado suave — calor, memória
          patch: ['#f5d87a', '#c49a3a', '#ffe8a0'],
          size: 1.4,
          orbit: 34,
          speed: 0.048,
          startAngle: 4.5,
          // Anéis: ~4 camadas de história: quentes (lembranças) e cinza-lilás (pendências)
          rings: [
            { inner: 1.45, outer: 1.62, color: '#f5d87a' }, // quente: lembranças
            { inner: 1.72, outer: 1.88, color: '#b8a5d1' }, // cinza-lilás: pendências
            { inner: 1.98, outer: 2.16, color: '#ffd56b' }, // quente: lembranças
            { inner: 2.26, outer: 2.42, color: '#9d8eb5' }  // cinza-lilás: pendências
          ],
          params: { size: 1, mass: 6 },
          moons: [],
          elements: [],
          info: {
            label: 'Planeta com anéis · Área da vida',
            summary: 'Cada anel é uma camada de história: infância, expectativas, luto, obrigações e memórias. Os anéis são bonitos à distância, mas também representam coisas que continuam girando ao redor de Helena mesmo depois de já terem passado.',
            law: 'escala',
            why: 'Os anéis representam permanência: histórias que continuam em órbita mesmo quando seu tempo já passou. A escala do planeta mostra a duração desses vínculos.',
            phase: 'planeta com anéis: lembranças e pendências em órbita',
            notes: {}
          }
        }
      ],
      // Orbitante: a anã vermelha que acompanha o sistema como companheira
      orbiters: [
        {
          id: 'cuidado',
          type: 'companion',
          name: 'O cuidado silencioso',
          spectral: 'redDwarf',
          orbit: 9,
          speed: 0.4,
          params: { brightness: 1, mass: 2 },
          info: {
            label: 'Anã vermelha · Hábito de cuidar',
            summary: 'Helena manda mensagens para os amigos, leva comida quando alguém está doente e lembra de detalhes que os outros esquecem. Não é a parte mais chamativa de sua personalidade, mas continua brilhando mesmo nos períodos difíceis.',
            law: 'escala',
            why: 'Anã vermelha: pequena, persistente, de longa duração. Brilha igual em todos os capítulos porque o cuidado não desaparece — é um hábito que dura.',
            phase: 'anã vermelha em queima estável',
            notes: {}
          }
        }
      ]
    },

    // ── 3. DESEJO E SEGURANÇA (binária; sem planetas) ───────────────────────
    {
      id: 'desejo-seguranca',
      name: 'Desejo e segurança',
      // Cores das antigas estrelas "Corpo e mente" (vermelha) e "Pessoas" (azul)
      position: [-34, -4, -52],
      depth: 1,
      center: {
        kind: 'binary',
        // Estrela A: desejo (coral quente)
        colorA: '#ff6b6b',
        patchA: ['#ffa8a8', '#e03131', '#ffe3e3'],
        // Estrela B: segurança (azul frio)
        colorB: '#74c0fc',
        patchB: ['#d0ebff', '#339af0', '#a5d8ff'],
        params: { tension: 0.6, mass: 6 },
        info: {
          label: 'Estrela binária · Forças internas',
          summary: 'Helena possui duas forças orbitando uma à outra: o desejo de mudar de cidade e a necessidade de manter segurança financeira. Nenhuma das duas desaparece; quando uma ganha massa, a outra reage.',
          law: 'massa',
          why: 'Binária porque as duas forças têm massa semelhante e se puxam mutuamente. Não há como separar uma sem alterar a outra.',
          phase: 'sistema binário em equilíbrio tenso',
          notes: {
            1: 'Helena aceita a promoção: a segurança ganha massa e a tensão sobe ao máximo.',
            3: 'A tensão cai; Helena negocia um contrato menor, sem abandonar nenhuma das duas.'
          }
        }
      },
      planets: [],
      orbiters: []
    },

    // ── 4. A VOZ DA MÃE (anã branca; sem planetas) ──────────────────────────
    {
      id: 'mae',
      name: 'A voz da mãe',
      position: [-96, 6, 6],
      depth: 3,   // 3 = inconsciente (longe, mas muito pesada)
      center: {
        kind: 'star',
        spectral: 'whiteDwarf',
        color: '#cfe8ff',         // azulado frio (estado inicial, tone=0)
        patch: ['#e8f4ff', '#b8d8f8', '#a0c8f0'],
        params: { brightness: 0.8, mass: 9, tone: 0 },
        info: {
          label: 'Anã branca · Crença herdada',
          summary: 'Depois da morte da mãe, restou uma crença extremamente densa: "uma mulher responsável não abandona o que construiu". Uma pequena lembrança ou frase é capaz de alterar uma decisão inteira.',
          law: 'massa',
          why: 'Anã branca: a estrela apagou, mas sua massa ficou comprimida. Pequena e densa — pesa mais que corpos maiores. Distante mas não irrelevante (Lei da distância).',
          phase: 'anã branca fria (crença cristalizada)',
          notes: {
            2: 'A supernova muda a composição da crença: de "não abandone" para "construir é também responsabilidade".',
            3: 'A anã branca aquece (tone=1): a crença se transforma, mas não desaparece.'
          }
        }
      },
      planets: [],
      orbiters: []
    },

    // ── 5. A VIDA NÃO ESCOLHIDA (anã marrom; tem o exoplaneta) ─────────────
    {
      id: 'nao-escolhida',
      name: 'A vida não escolhida',
      position: [78, -8, -78],
      depth: 2,   // 2 = memória recente (acessível em certos momentos)
      center: {
        kind: 'star',
        spectral: 'brownDwarf',
        color: '#8a4b3a',         // marrom avermelhado, quase sem brilho
        patch: ['#a06040', '#6a3525', '#c07050'],
        params: { brightness: 0.2, mass: 3 },
        info: {
          label: 'Anã marrom · Potencial latente',
          summary: 'A versão de Helena que teria estudado música e aberto um pequeno estúdio. Ela não vive nesse planeta, mas às vezes o observa durante viagens, mudanças de emprego ou encontros com músicos.',
          law: 'evolucao',
          why: 'Anã marrom: nunca acendeu o suficiente para ser uma estrela, mas ainda emite calor. Não é "a vida certa" — é um caminho não percorrido que revela o que falta no caminho atual.',
          phase: 'anã marrom: nunca acendeu, mas ainda aquece',
          notes: {
            2: 'A supernova emite um sinal em direção ao exoplaneta.',
            3: 'O exoplaneta começa a receber sinais; a vida não escolhida volta a fazer sentido.'
          }
        }
      },
      planets: [
        {
          id: 'exoplaneta',
          name: 'Estúdio de música',
          kind: 'exo',
          base: '#3d5a80',         // azul frio e profundo — misterioso, distante
          patch: ['#5b7fa6', '#2a3f5c', '#7aa0c4'],
          size: 1.1,
          orbit: 14,
          speed: 0.09,
          startAngle: 1.0,
          params: { size: 1, mass: 2, signals: 0 },
          moons: [],
          elements: [
            {
              id: 'sinal-1',
              type: 'star',
              title: 'Sinal',
              importance: 'medium',
              signalIndex: 1,
              params: { appear: 0 }
            },
            {
              id: 'sinal-2',
              type: 'star',
              title: 'Sinal',
              importance: 'medium',
              signalIndex: 2,
              params: { appear: 0 }
            },
            {
              id: 'sinal-3',
              type: 'star',
              title: 'Sinal',
              importance: 'medium',
              signalIndex: 3,
              params: { appear: 0 }
            }
          ],
          info: {
            label: 'Exoplaneta · O eu que poderia ter sido',
            summary: 'Fora do sistema principal existe um exoplaneta: a versão de Helena que teria estudado música e aberto um pequeno estúdio. Não é necessariamente "a vida certa"; revela o que falta no planeta atual — espaço para improvisar.',
            law: 'distancia',
            why: 'Exoplaneta porque está fora do sistema principal de criação. A distância não significa que é menos importante — significa que está menos acessível à consciência agora.',
            phase: 'exoplaneta sem sinais (cap. 0), recebendo sinais (cap. 3)',
            notes: {
              2: 'Um primeiro sinal acende: a supernova abre uma janela.',
              3: 'Três sinais acesos: Helena começa a observar e a enviar energia para esse caminho.'
            }
          }
        }
      ],
      orbiters: []
    },

    // ── 6. O TRAUMA (buraco negro; com disco de acreção) ────────────────────
    {
      id: 'trauma',
      name: 'A perda da mãe',
      position: [-82, -12, -88],
      depth: 3,   // 3 = inconsciente (profundo, pesado)
      center: {
        kind: 'blackhole',
        variant: 'trauma',
        color: '#0d0015',         // quase preto violeta
        patch: ['#9b5de5', '#c77dff', '#6a1fa0'],  // disco: violeta/magenta
        params: { mass: 8, disk: 0.9 },
        info: {
          label: 'Buraco negro · Trauma',
          summary: 'O trauma da morte da mãe não emite luz diretamente, mas curva tudo ao redor. Helena revisa mensagens antes de enviar, tem dificuldade de aceitar ajuda e transforma qualquer mudança em ameaça.',
          law: 'luz',
          why: 'Buraco negro porque absorve em vez de emitir. O disco de acreção são as ruminações: "e se eu tivesse percebido antes?". Pensar mais não é o mesmo que atravessar.',
          phase: 'buraco negro com disco de acreção ativo',
          notes: {
            3: 'O disco de acreção diminui: Helena começa a observar o buraco negro sem alimentá-lo continuamente.'
          }
        }
      },
      planets: [],
      orbiters: []
    },

    // ── 7. A NEBULOSA (desejo reprimido; tem o sonho recorrente) ────────────
    {
      id: 'nebulosa',
      name: 'O que ainda não tem nome',
      position: [112, 6, 62],
      depth: 3,   // 3 = inconsciente (revelada à noite, não de dia)
      center: {
        kind: 'nebula',
        variant: 'dark',
        color: '#0f1535',         // um pouco mais escura e azulada que o fundo
        patch: ['#141c40', '#0a1028', '#1a2250'],
        params: { mass: 4, protostar: 0 },
        info: {
          label: 'Nebulosa escura · Desejo reprimido',
          summary: 'Na borda da galáxia há uma nebulosa escura. Ela bloqueia a luz de estrelas ao fundo. É o desejo reprimido de Helena: ela quer mudar, mas ainda não consegue formular para onde. Durante o dia Helena chama isso de indecisão. A nebulosa se revela melhor à noite.',
          law: 'luz',
          why: 'Nebulosa escura porque não emite nem reflete luz — é inconsciente. O que existe aqui não tem nome ainda; revela-se pelo efeito que produz nos outros corpos ao redor.',
          phase: 'nebulosa escura (sem protoestrela)',
          notes: {
            2: 'Um ponto quente começa a se formar no coração da nebulosa.',
            3: 'A protoestrela cresce: o desejo começa a tomar forma e nome.'
          }
        }
      },
      planets: [],
      // Orbitante: o sonho recorrente
      orbiters: [
        {
          id: 'sonho-recorrente',
          type: 'dream',
          name: 'O sonho recorrente',
          orbit: 18,
          speed: 0.18,
          params: { reach: 0.55, mass: 1 },
          info: {
            label: 'Corpo em órbita excêntrica · Sonho recorrente',
            summary: 'Em um sonho recorrente, Helena está dentro de um prédio enorme projetado por ela mesma. Quando abre a porta do último cômodo, encontra um céu noturno dentro do quarto. Ela tenta entrar, mas acorda antes.',
            law: 'escala',
            why: 'Órbita excêntrica porque o sonho retorna sempre ao mesmo ponto — e Helena acorda antes de entrar. A excentricidade representa que ele chega perto do coração da nebulosa, mas nunca o atravessa ainda.',
            phase: 'órbita excêntrica: retorna mas não entra',
            notes: {
              2: 'O sonho chega mais perto do coração da nebulosa.',
              3: 'O sonho quase alcança o centro: a protoestrela e o sonho se aproximam.'
            }
          }
        }
      ]
    },

    // ── 8. RAFAEL (visitante externo; seu approach muda com os capítulos) ───
    {
      id: 'rafael',
      name: 'Rafael',
      // Posição inicial do path (approach=0.2 no cap. 0)
      position: [140, 10, -32],
      depth: 2,   // 2 = memória recente / presente
      center: {
        kind: 'visitor',
        color: '#ffd166',         // dourado quente
        patch: ['#ffe599', '#e6a800', '#fff0b0'],
        params: { mass: 5, approach: 0.2 },
        // Caminho que Rafael percorre (approach 0 = longe, 1 = próximo)
        path: [[150, 12, -30], [92, 0, -42]],
        info: {
          label: 'Corpo visitante · Amor como gravidade',
          summary: 'Rafael é um fotógrafo que vive de trabalhos temporários. Não é um planeta nem uma estrela do sistema: é um corpo externo que alterou as órbitas existentes. A presença dele puxa Helena em direção ao exoplaneta da vida criativa.',
          law: 'massa',
          why: 'Visitante porque é externo ao sistema — não emergiu da galáxia de Helena, mas passou a exercer gravidade nela. O amor funciona como gravidade: invisível, mas dobra trajetórias.',
          phase: 'corpo visitante em aproximação',
          notes: {
            1: 'Rafael convida Helena para viajar; a gravidade dele aumenta.',
            3: 'Rafael está mais próximo; a órbita de alguns planetas se inclina levemente em direção a ele.'
          }
        }
      },
      planets: [],
      orbiters: []
    }

  ], // fim de systems[]

  // ─── FORÇAS ───────────────────────────────────────────────────────────────
  // Sentimentos não são corpos; são forças que movem os corpos existentes.
  forces: [
    {
      id: 'mare-aprovacao',
      kind: 'tide',
      source: 'aprovacao',         // lua da aprovação pulsa sobre a carreira
      targets: ['carreira'],
      params: { strength: 0.7 },
      info: {
        label: 'Maré · Aprovação',
        summary: 'A lua da aprovação aumenta as marés sempre que Helena recebe elogios ou críticas. O planeta da carreira "respira" — expande e contrai conforme a aprovação externa.',
        law: 'massa',
        why: 'A aprovação não é um corpo; é uma força. Age como maré gravitacional: o planeta vive ao ritmo do olhar do outro.'
      }
    },
    {
      id: 'eclipse-medo',
      kind: 'eclipse',
      source: 'medo',              // lua do medo se alinha com a estrela da criação
      targets: ['carreira'],
      star: 'criacao',
      params: { strength: 0.6 },
      info: {
        label: 'Eclipse · Medo',
        summary: 'A lua do medo provoca eclipses quando aparece diante da estrela da criação. Helena continua vendo seu trabalho, mas deixa de enxergar por que começou a fazê-lo.',
        law: 'luz',
        why: 'O medo bloqueia a luz — não o corpo. É um eclipse: temporário, mas capaz de esconder a estrela completamente enquanto dura.'
      }
    },
    {
      id: 'amor-rafael',
      kind: 'gravity',
      source: 'rafael',            // Rafael puxa a carreira e o exoplaneta
      targets: ['carreira', 'exoplaneta'],
      params: { strength: 0.4 },
      info: {
        label: 'Gravidade · Amor',
        summary: 'Rafael alterou as órbitas existentes. Sua presença puxa Helena em direção ao exoplaneta da vida criativa, mas também perturba o gigante gasoso da carreira.',
        law: 'massa',
        why: 'O amor funciona como gravidade: sem corpo próprio, mas capaz de inclinar trajetórias. Quanto mais Rafael se aproxima (approach), mais forte o efeito.'
      }
    }
  ], // fim de forces[]

  // ─── CAPÍTULOS ────────────────────────────────────────────────────────────
  // set = os params que mudam neste capítulo (os outros ficam iguais ao cap. anterior)
  chapters: [
    {
      id: 0,
      title: 'Helena hoje',
      caption: 'Helena hoje: por fora, tudo funciona. Por dentro, as órbitas estão mudando.',
      set: {}   // cap. 0 = estado inicial; sem mudanças (os params acima já são os valores do cap. 0)
    },
    {
      id: 1,
      title: 'A proposta',
      caption: 'Helena aceita a promoção. A carreira ganha massa e o corpo perde atmosfera.',
      set: {
        criacao:          { brightness: 0.45 },
        carreira:         { size: 1.25, mass: 10, atmosphere: 0.95 },
        corpo:            { atmosphere: 0.1 },
        'desejo-seguranca': { tension: 1.0 },
        mae:              { mass: 9 },
        trauma:           { disk: 0.9 },
        'sonho-recorrente': { reach: 0.55 },
        exoplaneta:       { signals: 0 },
        rafael:           { approach: 0.55 },
        'amor-rafael':    { strength: 0.8 },
        'eclipse-medo':   { strength: 1.0 },
        'mare-aprovacao': { strength: 1.0 }
      }
    },
    {
      id: 2,
      title: 'A supernova',
      caption: 'Uma caixa de desenhos na casa da mãe. Uma supernova reorganiza o sistema.',
      event: 'supernova',   // sinaliza o evento visual (supernova.js, P19)
      set: {
        criacao:          { brightness: 1.4 },
        carreira:         { size: 1.25, mass: 10, atmosphere: 0.8 },
        corpo:            { atmosphere: 0.1 },
        'desejo-seguranca': { tension: 1.0 },
        mae:              { mass: 9, tone: 1 },
        trauma:           { disk: 0.9 },
        nebulosa:         { protostar: 0.2 },
        'sonho-recorrente': { reach: 0.7 },
        exoplaneta:       { signals: 1 },
        rafael:           { approach: 0.55 },
        'amor-rafael':    { strength: 0.8 },
        'eclipse-medo':   { strength: 0.7 },
        'mare-aprovacao': { strength: 0.7 }
      }
    },
    {
      id: 3,
      title: 'O novo equilíbrio',
      caption: 'O novo equilíbrio: Helena não encontra um novo eu. Ela muda a gravidade da galáxia que já tem.',
      set: {
        criacao:          { brightness: 1.15 },
        carreira:         { size: 0.8, mass: 7, atmosphere: 0.55 },
        corpo:            { atmosphere: 0.6 },
        'desejo-seguranca': { tension: 0.45 },
        mae:              { mass: 8, tone: 1 },
        trauma:           { disk: 0.45 },
        nebulosa:         { protostar: 0.6 },
        'sonho-recorrente': { reach: 0.9 },
        exoplaneta:       { signals: 3 },
        rafael:           { approach: 0.9 },
        'amor-rafael':    { strength: 0.5 },
        'eclipse-medo':   { strength: 0.2 },
        'mare-aprovacao': { strength: 0.35 }
      }
    }
  ] // fim de chapters[]

}; // fim de NEXUS.data

// Ponto ÚNICO de acesso aos dados.
// No futuro, só esta linha muda para buscar do backend.
NEXUS.getUniverse = () => NEXUS.data;
