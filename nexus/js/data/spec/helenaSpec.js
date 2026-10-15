/* helenaSpec.js — Especificação semântica canônica do universo de Helena (Capítulo 0).
   Representa o estado inicial da mente de Helena estritamente no Formato A (significado psicológico e Leis).
   
   REGRAS DE CONVERSÃO DE ESCALA (do mockUniverse.js para 0 a 10):
   1. Brilho de estrelas: no motor Three.js varia de 0 a 1.5. Na especificação, 0 a 10 (regra: valor * (10 / 1.5), ex: 0.65 -> ~4.33; anã marrom 0.2 -> ~1.33; anã branca 0.8 -> ~5.33; anã vermelha 1.0 -> ~6.67).
   2. Atmosfera de planetas: no motor varia de 0 a 1. Na especificação, 0 a 10 (regra: valor * 10, ex: 0.25 -> 2.5; 0.95 -> 9.5).
   3. Massa: no motor já é de 0 a 10 (mantida idêntica).
   4. Tensão de binárias: no motor varia de 0 a 1. Na especificação, 0 a 10 (regra: valor * 10, ex: 0.6 -> 6.0).
   5. Disco de acreção: no motor varia de 0 a 1. Na especificação, 0 a 10 (regra: valor * 10, ex: 0.9 -> 9.0).
   6. Protoestrela: no motor varia de 0 a 1. Na especificação, 0 a 10 (cap. 0 é 0 -> 0.0).
   7. Alcance do sonho (reach): no motor varia de 0 a 1. Na especificação, 0 a 10 (regra: 0.55 * 10 -> 5.5).
   8. Aproximação do visitante (approach): no motor varia de 0 a 1. Na especificação, 0 a 10 (regra: 0.2 * 10 -> 2.0).
   9. Intensidade de forças (strength): no motor varia de 0 a 1. Na especificação, 0 a 10 (regra: valor * 10, ex: 0.7 -> 7.0; 0.6 -> 6.0; 0.4 -> 4.0).
   10. Tamanhos e elementos: escala relativa 0 a 10 (planeta rochoso 1.0 -> 5.0; gigante gasoso 1.8 -> 9.0; planetas com anéis 1.4 -> 7.0; exoplaneta 1.1 -> 5.5; cometa approach 0.1 -> 1.0; appear 1 -> 10.0; sinais 0 -> 0).
   
   NOTA ARQUITETURAL:
   O sistema central 'eu' (buraco negro supermassivo na origem) NÃO entra aqui:
   o compilador sempre o acrescenta compulsoriamente no Formato B.
*/

var helenaSpec = {
  titulo: 'A galáxia de Helena',
  rotinas: [
    { id: 'rot-trabalho',     nome: 'Trabalho' },
    { id: 'rot-academia',     nome: 'Academia' },
    { id: 'rot-contas',       nome: 'Contas' },
    { id: 'rot-mensagens',    nome: 'Mensagens' },
    { id: 'rot-compromissos', nome: 'Compromissos' }
  ],
  sistemas: [
    // ── 1. A CRIAÇÃO (sistema solar principal com planetas e companheira) ──
    {
      id: 'criacao',
      nome: 'A criação',
      profundidade: 1,
      centro: {
        tipo: 'estrela',
        massa: 7,
        brilho: 4.33, // 0.65 no motor
        temperatura: 'quente',
        rotulo: 'Estrela · Valor interno',
        summary: 'Helena não ama apenas arquitetura como profissão; gosta de imaginar lugares onde as pessoas possam respirar melhor. Quando está próxima dessa luz, trabalha com energia e sente que o mundo fica mais amplo.',
        why: 'Emite luz própria porque é um valor interno, uma paixão genuína — não um papel ou obrigação. Ilumina os planetas ao redor.',
        phase: 'estrela principal em fase ativa',
        law: 'luz'
      },
      planetas: [
        {
          id: 'corpo',
          nome: 'Corpo',
          tipo: 'rochoso',
          massa: 3,
          tamanho: 5.0, // base 1.0
          atmosfera: 2.5, // 0.25 no motor
          rotulo: 'Planeta rochoso · Área da vida',
          summary: 'O corpo de Helena é pequeno, concreto e sensível. Nos últimos meses sua atmosfera ficou rarefeita: ela dorme pouco, trabalha além do limite e tem dificuldade de perceber o próprio cansaço.',
          why: 'Reflete luz — é uma área da vida, não um valor. Rochoso porque é limitado e sensível às condições externas.',
          phase: 'atmosfera rarefeita',
          law: 'luz',
          luas: [],
          elementos: []
        },
        {
          id: 'carreira',
          nome: 'Carreira',
          tipo: 'gasoso',
          massa: 9,
          tamanho: 9.0, // base 1.8
          atmosfera: 9.5, // 0.95 no motor
          rotulo: 'Gigante gasoso · Área da vida',
          summary: 'A carreira tem enorme massa gravitacional: mesmo quando Helena pensa em outra coisa, ela continua puxando decisões, horários e energia. A atmosfera ficou tão espessa que Helena já não consegue enxergar a superfície.',
          why: 'Gigante gasoso porque acumulou camadas de currículo, reconhecimento e estabilidade — a superfície original ficou escondida pela atmosfera densa.',
          phase: 'gigante gasoso com atmosfera opaca',
          law: 'massa',
          luas: [
            {
              id: 'aprovacao',
              nome: 'Lua da aprovação',
              massa: 3,
              tamanho: 2.8, // 0.28
              tom: 'claro',
              rotulo: 'Lua · Faceta da carreira',
              summary: 'Aumenta as marés quando Helena recebe elogios, críticas ou reconhecimento. Faz a carreira parecer maior do que é.',
              why: 'Lua de baixa massa mas órbita próxima: perturba a estabilidade da carreira através de forças de maré.',
              phase: 'órbita luminosa em torno da carreira',
              law: 'massa'
            },
            {
              id: 'medo',
              nome: 'Lua do medo',
              massa: 4,
              tamanho: 2.2, // 0.22
              tom: 'escuro',
              rotulo: 'Lua · Faceta da carreira',
              summary: 'Provoca eclipses ao passar diante da estrela da criação. Helena continua vendo o trabalho, mas deixa de enxergar por que começou a fazê-lo.',
              why: 'Uma lua escura e veloz que não emite luz própria e projeta sua sombra sobre a área mais ativa de sua vida.',
              phase: 'órbita rápida em sombra periódica',
              law: 'luz'
            }
          ],
          elementos: [
            {
              id: 'proposta',
              tipo: 'passageiro',
              titulo: 'A proposta',
              aproximacao: 1.0, // approach 0.1
              presenca: 10.0, // appear 1
              rotulo: 'Cometa · Evento',
              summary: 'Uma proposta para coordenar um grande projeto em outra cidade. Prestigiosa, segura e coerente com a imagem de Helena — mas passageira. Aparece, pressiona a Carreira e, no equilíbrio final, é recusada.',
              why: 'A proposta é passageira: aparece, pressiona a Carreira e é recusada. Cometa porque tem duração limitada — não é uma estrutura permanente, é um evento que altera órbitas enquanto passa.',
              phase: 'em aproximação (cap. 1), recusada e some (cap. 3)',
              law: 'escala'
            }
          ]
        },
        {
          id: 'familia',
          nome: 'Família',
          tipo: 'aneis',
          massa: 6,
          tamanho: 7.0, // base 1.4
          camadasAneis: 'mistas',
          rotulo: 'Planeta com anéis · Área da vida',
          summary: 'Cada anel é uma camada de história: infância, expectativas, luto, obrigações e memórias. Os anéis são bonitos à distância, mas também representam coisas que continuam girando ao redor de Helena mesmo depois de já terem passado.',
          why: 'Os anéis representam permanência: histórias que continuam em órbita mesmo quando seu tempo já passou. A escala do planeta mostra a duração desses vínculos.',
          phase: 'planeta com anéis: lembranças e pendências em órbita',
          law: 'escala',
          luas: [],
          elementos: []
        }
      ],
      orbitantes: [
        {
          id: 'cuidado',
          tipo: 'companheira',
          nome: 'O cuidado silencioso',
          massa: 2,
          brilho: 6.67, // 1.0 no motor (escala 0 a 1.5)
          rotulo: 'Anã vermelha · Hábito de cuidar',
          summary: 'Helena manda mensagens para os amigos, leva comida quando alguém está doente e lembra de detalhes que os outros esquecem. Não é a parte mais chamativa de sua personalidade, mas continua brilhando mesmo nos períodos difíceis.',
          why: 'Anã vermelha: pequena, persistente, de longa duração. Brilha igual em todos os capítulos porque o cuidado não desaparece — é um hábito que dura.',
          phase: 'anã vermelha em queima estável',
          law: 'escala'
        }
      ]
    },

    // ── 2. DESEJO E SEGURANÇA (estrela binária) ─────────────────────────────
    {
      id: 'desejo-seguranca',
      nome: 'Desejo e segurança',
      profundidade: 1,
      centro: {
        tipo: 'binaria',
        massa: 6,
        tensao: 6.0, // 0.6 no motor
        rotulo: 'Estrela binária · Forças internas',
        summary: 'Helena possui duas forças orbitando uma à outra: o desejo de mudar de cidade e a necessidade de manter segurança financeira. Nenhuma das duas desaparece; quando uma ganha massa, a outra reage.',
        why: 'Binária porque as duas forças têm massa semelhante e se puxam mutuamente. Não há como separar uma sem alterar a outra.',
        phase: 'sistema binário em equilíbrio tenso',
        law: 'massa'
      },
      planetas: [],
      orbitantes: []
    },

    // ── 3. A VOZ DA MÃE (anã branca) ────────────────────────────────────────
    {
      id: 'mae',
      nome: 'A voz da mãe',
      profundidade: 3,
      centro: {
        tipo: 'anaBranca',
        massa: 9,
        brilho: 5.33, // 0.8 no motor
        temperatura: 'fria', // tone=0 inicial (azulado frio)
        rotulo: 'Anã branca · Crença herdada',
        summary: 'Depois da morte da mãe, restou uma crença extremamente densa: "uma mulher responsável não abandona o que construiu". Uma pequena lembrança ou frase é capaz de alterar uma decisão inteira.',
        why: 'Anã branca: a estrela apagou, mas sua massa ficou comprimida. Pequena e densa — pesa mais que corpos maiores. Distante mas não irrelevante (Lei da distância).',
        phase: 'anã branca fria (crença cristalizada)',
        law: 'massa'
      },
      planetas: [],
      orbitantes: []
    },

    // ── 4. A VIDA NÃO ESCOLHIDA (anã marrom + exoplaneta) ───────────────────
    {
      id: 'nao-escolhida',
      nome: 'A vida não escolhida',
      profundidade: 2,
      centro: {
        tipo: 'anaMarrom',
        massa: 3,
        brilho: 1.33, // 0.2 no motor
        rotulo: 'Anã marrom · Potencial latente',
        summary: 'A versão de Helena que teria estudado música e aberto um pequeno estúdio. Ela não vive nesse planeta, mas às vezes o observa durante viagens, mudanças de emprego ou encontros com músicos.',
        why: 'Anã marrom: nunca acendeu o suficiente para ser uma estrela, mas ainda emite calor. Não é "a vida certa" — é um caminho não percorrido que revela o que falta no caminho atual.',
        phase: 'anã marrom: nunca acendeu, mas ainda aquece',
        law: 'evolucao'
      },
      planetas: [
        {
          id: 'exoplaneta',
          nome: 'Estúdio de música',
          tipo: 'exo',
          massa: 2,
          tamanho: 5.5, // 1.1
          sinais: 0.0, // signals: 0
          rotulo: 'Exoplaneta · O eu que poderia ter sido',
          summary: 'Fora do sistema principal existe um exoplaneta: a versão de Helena que teria estudado música e aberto um pequeno estúdio. Não é necessariamente "a vida certa"; revela o que falta no planeta atual — espaço para improvisar.',
          why: 'Exoplaneta porque está fora do sistema principal de criação. A distância não significa que é menos importante — significa que está menos acessível à consciência agora.',
          phase: 'exoplaneta sem sinais (cap. 0), recebendo sinais (cap. 3)',
          law: 'distancia',
          luas: [],
          elementos: [
            {
              id: 'sinal-1',
              tipo: 'sinal',
              titulo: 'Sinal',
              indiceSinal: 1,
              presenca: 0.0 // appear 0
            },
            {
              id: 'sinal-2',
              tipo: 'sinal',
              titulo: 'Sinal',
              indiceSinal: 2,
              presenca: 0.0 // appear 0
            },
            {
              id: 'sinal-3',
              tipo: 'sinal',
              titulo: 'Sinal',
              indiceSinal: 3,
              presenca: 0.0 // appear 0
            }
          ]
        }
      ],
      orbitantes: []
    },

    // ── 5. O TRAUMA (buraco negro de trauma com disco) ──────────────────────
    {
      id: 'trauma',
      nome: 'A perda da mãe',
      profundidade: 3,
      centro: {
        tipo: 'buracoNegro',
        massa: 8,
        disco: 9.0, // 0.9 no motor
        rotulo: 'Buraco negro · Trauma',
        summary: 'O trauma da morte da mãe não emite luz diretamente, mas curva tudo ao redor. Helena revisa mensagens antes de enviar, tem dificuldade de aceitar ajuda e transforma qualquer mudança em ameaça.',
        why: 'Buraco negro porque absorve em vez de emitir. O disco de acreção são as ruminações: "e se eu tivesse percebido antes?". Pensar mais não é o mesmo que atravessar.',
        phase: 'buraco negro com disco de acreção ativo',
        law: 'luz'
      },
      planetas: [],
      orbitantes: []
    },

    // ── 6. A NEBULOSA (desejo reprimido + sonho recorrente) ─────────────────
    {
      id: 'nebulosa',
      nome: 'O que ainda não tem nome',
      profundidade: 3,
      centro: {
        tipo: 'nebulosa',
        massa: 4,
        protoestrela: 0.0, // protostar 0 no cap. 0
        rotulo: 'Nebulosa escura · Desejo reprimido',
        summary: 'Na borda da galáxia há uma nebulosa escura. Ela bloqueia a luz de estrelas ao fundo. É o desejo reprimido de Helena: ela quer mudar, mas ainda não consegue formular para onde. Durante o dia Helena chama isso de indecisão. A nebulosa se revela melhor à noite.',
        why: 'Nebulosa escura porque não emite nem reflete luz — é inconsciente. O que existe aqui não tem nome ainda; revela-se pelo efeito que produz nos outros corpos ao redor.',
        phase: 'nebulosa escura (sem protoestrela)',
        law: 'luz'
      },
      planetas: [],
      orbitantes: [
        {
          id: 'sonho-recorrente',
          tipo: 'sonho',
          nome: 'O sonho recorrente',
          massa: 1,
          alcance: 5.5, // reach 0.55
          rotulo: 'Corpo em órbita excêntrica · Sonho recorrente',
          summary: 'Em um sonho recorrente, Helena está dentro de um prédio enorme projetado por ela mesma. Quando abre a porta do último cômodo, encontra um céu noturno dentro do quarto. Ela tenta entrar, mas acorda antes.',
          why: 'Órbita excêntrica porque o sonho retorna sempre ao mesmo ponto — e Helena acorda antes de entrar. A excentricidade representa que ele chega perto do coração da nebulosa, mas nunca o atravessa ainda.',
          phase: 'órbita excêntrica: retorna mas não entra',
          law: 'escala'
        }
      ]
    },

    // ── 7. RAFAEL (visitante externo em aproximação) ────────────────────────
    {
      id: 'rafael',
      nome: 'Rafael',
      profundidade: 2,
      centro: {
        tipo: 'visitante',
        massa: 5,
        aproximacao: 2.0, // approach 0.2
        rotulo: 'Corpo visitante · Amor como gravidade',
        summary: 'Rafael é um fotógrafo que vive de trabalhos temporários. Não é um planeta nem uma estrela do sistema: é um corpo externo que alterou as órbitas existentes. A presença dele puxa Helena em direção ao exoplaneta da vida criativa.',
        why: 'Visitante porque é externo ao sistema — não emergiu da galáxia de Helena, mas passou a exercer gravidade nela. O amor funciona como gravidade: invisível, mas dobra trajetórias.',
        phase: 'corpo visitante em aproximação',
        law: 'massa'
      },
      planetas: [],
      orbitantes: []
    }
  ],

  // ─── FORÇAS ───────────────────────────────────────────────────────────────
  forcas: [
    {
      id: 'mare-aprovacao',
      tipo: 'mare',
      origem: 'aprovacao',
      alvos: ['carreira'],
      intensidade: 7.0, // strength 0.7
      rotulo: 'Maré · Aprovação',
      summary: 'A lua da aprovação aumenta as marés sempre que Helena recebe elogios ou críticas. O planeta da carreira "respira" — expande e contrai conforme a aprovação externa.',
      why: 'A aprovação não é um corpo; é uma força. Age como maré gravitacional: o planeta vive ao ritmo do olhar do outro.',
      law: 'massa'
    },
    {
      id: 'eclipse-medo',
      tipo: 'eclipse',
      origem: 'medo',
      alvos: ['carreira'],
      estrela: 'criacao',
      intensidade: 6.0, // strength 0.6
      rotulo: 'Eclipse · Medo',
      summary: 'A lua do medo provoca eclipses quando aparece diante da estrela da criação. Helena continua vendo seu trabalho, mas deixa de enxergar por que começou a fazê-lo.',
      why: 'O medo bloqueia a luz — não o corpo. É um eclipse: temporário, mas capaz de esconder a estrela completamente enquanto dura.',
      law: 'luz'
    },
    {
      id: 'amor-rafael',
      tipo: 'gravidade',
      origem: 'rafael',
      alvos: ['carreira', 'exoplaneta'],
      intensidade: 4.0, // strength 0.4
      rotulo: 'Gravidade · Amor',
      summary: 'Rafael alterou as órbitas existentes. Sua presença puxa Helena em direção ao exoplaneta da vida criativa, mas também perturba o gigante gasoso da carreira.',
      why: 'O amor funciona como gravidade: sem corpo próprio, mas capaz de inclinar trajetórias. Quanto mais Rafael se aproxima (approach), mais forte o efeito.',
      law: 'massa'
    }
  ]
};

// Registro no padrão global NEXUS (navegador) e module.exports (Node.js)
if (typeof NEXUS !== 'undefined') {
  NEXUS.specs = NEXUS.specs || {};
  NEXUS.specs.helena = helenaSpec;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = helenaSpec;
}
