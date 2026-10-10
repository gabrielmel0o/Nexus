/* testHelena.js — Suíte de testes do validador e compilador do NEXUS.
   Executa com: node backend/test/testHelena.js
*/

// Configura objeto global NEXUS antes de carregar módulos
global.NEXUS = {};

// Carrega os módulos
require('../../nexus/js/data/mockUniverse.js');
const helenaSpec = require('../../nexus/js/data/spec/helenaSpec.js');
const validateSpec = require('../../nexus/js/data/validator.js');
const compileSpec = require('../../nexus/js/data/compiler.js');

let verificacoesOk = 0;
let totalVerificacoes = 0;

function verificar(nome, condicao, detalhes) {
  totalVerificacoes++;
  if (condicao) {
    verificacoesOk++;
    console.log(`[OK] Verificação ${totalVerificacoes}: ${nome}`);
  } else {
    console.error(`[FALHOU] Verificação ${totalVerificacoes}: ${nome}`);
    if (detalhes) console.error('   Detalhes:', detalhes);
  }
}

console.log('====================================================');
console.log('   NEXUS BACKEND — TESTE DE VALIDAÇÃO E COMPILAÇÃO   ');
console.log('====================================================\n');

// -----------------------------------------------------------------
// (a) validateSpec(helena) -> ok
// -----------------------------------------------------------------
const resValidHelena = validateSpec(helenaSpec);
verificar(
  'validateSpec(helenaSpec) devolve ok: true sem erros',
  resValidHelena.ok === true && resValidHelena.erros.length === 0,
  resValidHelena.erros
);

// -----------------------------------------------------------------
// (b) compileSpec(helena) tem mesmos ids, tipos, quantidades, params do cap 0 e textos
// -----------------------------------------------------------------
const mock = NEXUS.data;
const compiled = compileSpec(helenaSpec);

// 1. Quantidade de sistemas
let bOk = true;
let bDetalhes = '';

if (compiled.systems.length !== mock.systems.length) {
  bOk = false;
  bDetalhes += `Qtd de sistemas diferente: comp=${compiled.systems.length}, mock=${mock.systems.length}; `;
}

// 2. Mapear sistemas e comparar
const mockSysMap = new Map(mock.systems.map(s => [s.id, s]));
const compSysMap = new Map(compiled.systems.map(s => [s.id, s]));

mockSysMap.forEach((mockSys, id) => {
  const compSys = compSysMap.get(id);
  if (!compSys) {
    bOk = false;
    bDetalhes += `Sistema ${id} faltando no compilado; `;
    return;
  }
  // Kind do centro
  if (compSys.center.kind !== mockSys.center.kind) {
    bOk = false;
    bDetalhes += `Kind do centro em ${id} difere (${compSys.center.kind} vs ${mockSys.center.kind}); `;
  }
  // Textos de info
  if (compSys.center.info.why !== mockSys.center.info.why) {
    bOk = false;
    bDetalhes += `Texto why do centro em ${id} difere; `;
  }
  // Planetas
  if (compSys.planets.length !== mockSys.planets.length) {
    bOk = false;
    bDetalhes += `Qtd de planetas em ${id} difere; `;
  } else {
    for (let i = 0; i < mockSys.planets.length; i++) {
      const mp = mockSys.planets[i];
      const cp = compSys.planets.find(p => p.id === mp.id);
      if (!cp) {
        bOk = false;
        bDetalhes += `Planeta ${mp.id} não encontrado; `;
      } else {
        if (cp.kind !== mp.kind) {
          bOk = false;
          bDetalhes += `Kind do planeta ${mp.id} difere; `;
        }
        if (cp.info.why !== mp.info.why) {
          bOk = false;
          bDetalhes += `Texto why do planeta ${mp.id} difere; `;
        }
        // Luas
        if ((cp.moons || []).length !== (mp.moons || []).length) {
          bOk = false;
          bDetalhes += `Qtd luas em ${mp.id} difere; `;
        }
        // Elementos
        if ((cp.elements || []).length !== (mp.elements || []).length) {
          bOk = false;
          bDetalhes += `Qtd elementos em ${mp.id} difere; `;
        }
      }
    }
  }
  // Orbitantes
  if (compSys.orbiters.length !== mockSys.orbiters.length) {
    bOk = false;
    bDetalhes += `Qtd orbitantes em ${id} difere; `;
  } else {
    for (let i = 0; i < mockSys.orbiters.length; i++) {
      const mo = mockSys.orbiters[i];
      const co = compSys.orbiters.find(o => o.id === mo.id);
      if (!co || co.type !== mo.type) {
        bOk = false;
        bDetalhes += `Orbitante ${mo.id} difere; `;
      }
    }
  }
});

// Forças
if (compiled.forces.length !== mock.forces.length) {
  bOk = false;
  bDetalhes += `Qtd de forças difere; `;
}

verificar(
  'compileSpec(helenaSpec) possui os mesmos IDs, tipos, quantidades e textos do mock',
  bOk,
  bDetalhes
);

// -----------------------------------------------------------------
// (c) Posições dos sistemas dentro da faixa da profundidade e sem sobreposição
// -----------------------------------------------------------------
let cOk = true;
let cDetalhes = '';
const FAIXAS = {
  0: { rMin: 0, rMax: 0 },
  1: { rMin: 45, rMax: 70 },
  2: { rMin: 75, rMax: 115 },
  3: { rMin: 95, rMax: 135 },
  4: { rMin: 140, rMax: 170 }
};

compiled.systems.forEach(s => {
  const d = Math.hypot(s.position[0], s.position[2]);
  const f = FAIXAS[s.depth];
  if (d < f.rMin || d > f.rMax) {
    cOk = false;
    cDetalhes += `Sistema ${s.id} (depth ${s.depth}) com dist ${d.toFixed(1)} fora da faixa [${f.rMin}, ${f.rMax}]; `;
  }
});

// Checar sobreposição entre pares
for (let i = 0; i < compiled.systems.length; i++) {
  for (let j = i + 1; j < compiled.systems.length; j++) {
    const s1 = compiled.systems[i], s2 = compiled.systems[j];
    const distPares = Math.hypot(s1.position[0] - s2.position[0], s1.position[2] - s2.position[2]);
    if (distPares < 45) { // Distância mínima estrita
      cOk = false;
      cDetalhes += `Sobreposição entre ${s1.id} e ${s2.id} (dist ${distPares.toFixed(1)} < 45); `;
    }
  }
}

verificar(
  'Posições dos sistemas ficam nas faixas de profundidade e sem sobreposição',
  cOk,
  cDetalhes
);

// -----------------------------------------------------------------
// (d) Compilar duas vezes gera JSON idêntico (Determinismo)
// -----------------------------------------------------------------
const comp1 = compileSpec(helenaSpec);
const comp2 = compileSpec(helenaSpec);
const json1 = JSON.stringify(comp1);
const json2 = JSON.stringify(comp2);

verificar(
  'Compilação é determinística (compilar duas vezes gera JSON estritamente idêntico)',
  json1 === json2
);

// -----------------------------------------------------------------
// (e) 9 especificações quebradas de propósito reprovadas com o erro certo
// -----------------------------------------------------------------
function clonar(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// 1. Só estrela emite luz (planeta ou buraco com brilho)
const spec1 = clonar(helenaSpec);
spec1.sistemas[0].planetas[0].brilho = 5;
const r1 = validateSpec(spec1);
verificar(
  'Regra 1: Rejeita quando planeta possui brilho',
  r1.ok === false && r1.erros.some(e => e.includes('planetas apenas refletem')),
  r1.erros
);

// 2. Sentimento isolado vira aviso (ou erro se faltar força)
const spec2 = clonar(helenaSpec);
spec2.sistemas[0].planetas[0].nome = 'Medo';
const r2 = validateSpec(spec2);
verificar(
  'Regra 2: Alerta quando planeta tem nome de sentimento isolado',
  r2.avisos.some(a => a.includes('sentimento isolado')),
  r2.avisos
);

// 3. Quantidade de sistemas de estrela (fora de 1 a 3)
const spec3 = clonar(helenaSpec);
// Muda o centro estrela para anaBranca e a binária para anaBranca (0 estrelas)
spec3.sistemas[0].centro.tipo = 'anaBranca';
spec3.sistemas[1].centro.tipo = 'anaBranca';
const r3 = validateSpec(spec3);
verificar(
  'Regra 3a: Rejeita quando há 0 sistemas de estrela',
  r3.ok === false && r3.erros.some(e => e.includes('sistemas de estrela')),
  r3.erros
);

// 3b. Quantidade de planetas (fora de 3 a 6)
const spec3b = clonar(helenaSpec);
spec3b.sistemas[0].planetas = spec3b.sistemas[0].planetas.slice(0, 1); // deixa só 1 planeta + 1 exo = 2 planetas
const r3b = validateSpec(spec3b);
verificar(
  'Regra 3b: Rejeita quando há menos de 3 planetas no total',
  r3b.ok === false && r3b.erros.some(e => e.includes('planetas no total')),
  r3b.erros
);

// 4. Ids duplicados ou inexistentes em forças
const spec4 = clonar(helenaSpec);
spec4.forcas[0].alvos = ['id-que-nao-existe'];
const r4 = validateSpec(spec4);
verificar(
  'Regra 4: Rejeita quando alvo de força não existe',
  r4.ok === false && r4.erros.some(e => e.includes('não existe no universo')),
  r4.erros
);

// 5. Tipo fora do catálogo e regras de exo/sinal
const spec5 = clonar(helenaSpec);
spec5.sistemas[0].planetas[0].tipo = 'tipo_inventado';
const r5 = validateSpec(spec5);
verificar(
  'Regra 5: Rejeita tipo fora do catálogo permitido',
  r5.ok === false && r5.erros.some(e => e.includes('não é permitido')),
  r5.erros
);

// 6. Escalas fora de 0 a 10 e profundidade fora de 0 a 4
const spec6 = clonar(helenaSpec);
spec6.sistemas[0].profundidade = 7;
const r6 = validateSpec(spec6);
verificar(
  'Regra 6: Rejeita profundidade fora de 0 a 4',
  r6.ok === false && r6.erros.some(e => e.includes('profundidade inválida')),
  r6.erros
);

// 7. Texto de lei copiado no resumo/why
const spec7 = clonar(helenaSpec);
spec7.sistemas[0].centro.why = 'Lei da luz: quem emite luz é interno; quem reflete é derivado.';
const r7 = validateSpec(spec7);
verificar(
  'Regra 7: Rejeita quando campo contém texto literal de uma das 5 leis',
  r7.ok === false && r7.erros.some(e => e.includes('contém o texto de uma das Leis')),
  r7.erros
);

// 8. Nome de condição clínica gera aviso
const spec8 = clonar(helenaSpec);
spec8.sistemas[0].centro.summary = 'Helena sente sintomas de depressão crônica.';
const r8 = validateSpec(spec8);
verificar(
  'Regra 8: Gera aviso amigável quando texto contém termo clínico',
  r8.avisos.some(a => a.includes('termo clínico')),
  r8.avisos
);

// 9. Texto com tamanho excessivo (> 500 chars)
const spec9 = clonar(helenaSpec);
spec9.sistemas[0].centro.summary = 'a'.repeat(600);
const r9 = validateSpec(spec9);
verificar(
  'Regra 9: Rejeita textos que ultrapassam o limite do painel',
  r9.ok === false && r9.erros.some(e => e.includes('Texto muito longo')),
  r9.erros
);

// -----------------------------------------------------------------
// (f) compileSpec não alterou a especificação de entrada
// -----------------------------------------------------------------
const specAntes = clonar(helenaSpec);
compileSpec(helenaSpec);
const specDepois = clonar(helenaSpec);

verificar(
  'compileSpec é puro e não altera a especificação de entrada',
  JSON.stringify(specAntes) === JSON.stringify(specDepois)
);

console.log('\n====================================================');
console.log(`RESULTADO: ${verificacoesOk} de ${totalVerificacoes} verificações OK`);
console.log('====================================================');

if (verificacoesOk !== totalVerificacoes) {
  process.exit(1);
}
