/* validator.js — Validador semântico das Leis do NEXUS.
   Funciona tanto no navegador (registra em NEXUS.validateSpec)
   quanto no Node.js (module.exports).
   
   Devolve:
     { ok: true, avisos: [...] }
   ou
     { ok: false, erros: [...], avisos: [...] }
*/

(function () {
  // Lista de sentimentos para a Regra 2
  var SENTIMENTOS = [
    'amor', 'medo', 'culpa', 'desejo', 'aprovacao', 'aprovação',
    'responsabilidade', 'raiva', 'curiosidade', 'pertencimento',
    'tristeza', 'ansiedade', 'alegria', 'vergonha', 'orgulho',
    'angustia', 'angústia', 'solidao', 'solidão', 'saudade',
    'inveja', 'ciume', 'ciúme', 'ressentimento', 'esperanca', 'esperança'
  ];

  // Expressões de diagnósticos clínicos para a Regra 8
  var TERMOS_CLINICOS = [
    'depressao', 'depressão', 'tept', 'ptsd', 'transtorno',
    'burnout', 'bipolar', 'panico', 'pânico', 'toc', 'tdah',
    'esquizofrenia', 'borderline', 'anorexia', 'bulimia'
  ];

  // Textos das 5 leis fixas (seção 3 do NEXUS_CONTEXT.md)
  var TEXTOS_LEIS = [
    'quem emite luz é interno',
    'massa é carga afetiva',
    'mede o quanto algo é acessível',
    'a duração de um astro é a permanência',
    'nada é só uma coisa'
  ];

  var CAT_CENTRO = ['estrela', 'anaBranca', 'anaMarrom', 'binaria', 'buracoNegro', 'nebulosa', 'visitante'];
  var CAT_PLANETA = ['rochoso', 'gasoso', 'aneis', 'exo'];
  var CAT_ORBITANTE = ['companheira', 'sonho'];
  var CAT_ELEMENTO = ['passageiro', 'sinal'];
  var CAT_FORCA = ['mare', 'eclipse', 'gravidade'];
  var CHAVES_LEIS = ['luz', 'massa', 'distancia', 'escala', 'evolucao'];

  function normalizarTexto(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function validateSpec(spec) {
    var erros = [];
    var avisos = [];

    if (!spec || typeof spec !== 'object') {
      return {
        ok: false,
        erros: ['A especificação fornecida não é um objeto válido.'],
        avisos: []
      };
    }

    if (!spec.titulo || typeof spec.titulo !== 'string') {
      erros.push('A galáxia precisa de um campo "titulo" em texto.');
    }

    if (!Array.isArray(spec.sistemas) || spec.sistemas.length === 0) {
      erros.push('A especificação precisa conter uma lista "sistemas" com pelo menos 1 sistema.');
      return { ok: false, erros: erros, avisos: avisos };
    }

    // Mapa de verificação de IDs
    var idsRegistrados = {};
    function registrarId(id, tipo, local) {
      if (!id || typeof id !== 'string') {
        erros.push('ID inválido ou ausente em ' + local + '. Defina um id em texto.');
        return;
      }
      if (idsRegistrados[id]) {
        erros.push('ID duplicado "' + id + '" encontrado em ' + local + ' (já usado em ' + idsRegistrados[id].local + '). IDs devem ser únicos em todo o universo.');
      } else {
        idsRegistrados[id] = { tipo: tipo, local: local };
      }
    }

    // Função de checagem de textos das leis e termos clínicos
    function inspecionarTextos(obj, localId) {
      var camposTexto = ['summary', 'resumo', 'why', 'porque', 'phase', 'fase', 'rotulo', 'label'];
      camposTexto.forEach(function (campo) {
        var val = obj[campo];
        if (typeof val === 'string') {
          // Limite de tamanho de texto (máx 500 caracteres por campo do painel)
          if (val.length > 500) {
            erros.push('Texto muito longo no campo "' + campo + '" do corpo "' + localId + '" (' + val.length + ' caracteres). Reduza para até 500 caracteres para caber no painel.');
          }

          var norm = normalizarTexto(val);

          // Regra 7: Texto de lei nunca gerado
          TEXTOS_LEIS.forEach(function (trecho) {
            if (norm.indexOf(normalizarTexto(trecho)) !== -1) {
              erros.push('O campo "' + campo + '" do corpo "' + localId + '" contém o texto de uma das Leis do NEXUS. A IA deve gerar apenas a chave da lei (luz, massa, distancia, escala, evolucao) no campo "lei", nunca o texto literal da lei.');
            }
          });

          // Regra 8: Nomes de condições clínicas geram AVISO
          TERMOS_CLINICOS.forEach(function (termo) {
            // Busca palavra isolada
            var regex = new RegExp('\\b' + termo + '\\b', 'i');
            if (regex.test(norm)) {
              avisos.push('O corpo "' + localId + '" menciona o termo clínico "' + termo + '" no campo "' + campo + '". O NEXUS organiza metáforas poéticas e narrativas, não diagnósticos nem categorias médicas.');
            }
          });
        }
      });
    }

    // Checagem de escala 0 a 10
    function checarEscala0a10(val, nomeCampo, localId, obrigatorio) {
      if (val === undefined || val === null) {
        if (obrigatorio) {
          erros.push('Campo "' + nomeCampo + '" é obrigatório no corpo "' + localId + '".');
        }
        return;
      }
      if (typeof val !== 'number' || isNaN(val) || val < 0 || val > 10) {
        erros.push('O campo "' + nomeCampo + '" no corpo "' + localId + '" tem valor ' + val + '. Deve ser um número entre 0 e 10.');
      }
    }

    // Checagem da chave de lei
    function checarChaveLei(obj, localId) {
      var lei = obj.lei || obj.law;
      if (!lei || CHAVES_LEIS.indexOf(lei) === -1) {
        erros.push('Campo "lei" no corpo "' + localId + '" deve ser exatamente uma das 5 chaves válidas: "luz", "massa", "distancia", "escala" ou "evolucao".');
      }
    }

    // Contadores para a Regra 3
    var totalSistemasEstrela = 0;
    var totalPlanetas = 0;

    // Varredura dos sistemas
    spec.sistemas.forEach(function (sis, idxSis) {
      var sisId = sis.id || ('sistema_' + idxSis);
      registrarId(sis.id, 'sistema', 'sistema[' + sisId + ']');

      // Regra 6: profundidade inteira de 0 a 4
      if (typeof sis.profundidade !== 'number' || !Number.isInteger(sis.profundidade) || sis.profundidade < 0 || sis.profundidade > 4) {
        erros.push('O sistema "' + sisId + '" tem profundidade inválida (' + sis.profundidade + '). Deve ser um número inteiro entre 0 e 4.');
      }

      var centro = sis.centro;
      if (!centro || typeof centro !== 'object') {
        erros.push('O sistema "' + sisId + '" não possui um objeto "centro" válido.');
      } else {
        // Regra 5: catálogo de centro
        if (!centro.tipo || CAT_CENTRO.indexOf(centro.tipo) === -1) {
          erros.push('Tipo de centro "' + centro.tipo + '" no sistema "' + sisId + '" não é permitido. Tipos permitidos: ' + CAT_CENTRO.join(', ') + '.');
        }

        // Regra 3: Sistemas de estrela (estrela ou binaria contam)
        if (centro.tipo === 'estrela' || centro.tipo === 'binaria') {
          totalSistemasEstrela++;
        }

        // Regra 1: Só estrela emite luz
        if (centro.brilho !== undefined && centro.brilho !== null) {
          var emiteLuz = (centro.tipo === 'estrela' || centro.tipo === 'anaBranca' || centro.tipo === 'anaMarrom' || centro.tipo === 'binaria');
          if (!emiteLuz && centro.brilho > 0) {
            erros.push('O centro do sistema "' + sisId + '" é do tipo "' + centro.tipo + '" mas possui brilho (' + centro.brilho + '). Pela Lei da Luz, só estrelas emitem luz própria; buracos negros, nebulosas e visitantes não devem ter brilho.');
          }
        }

        // Regra 2: Sentimento isolado no centro
        if (sis.nome) {
          var nomeNorm = normalizarTexto(sis.nome);
          if (SENTIMENTOS.indexOf(nomeNorm) !== -1) {
            avisos.push('O sistema "' + sisId + '" tem nome de sentimento isolado ("' + sis.nome + '"). Segundo as Leis do NEXUS, sentimentos devem ser forças em "forcas[]", não corpos.');
          }
        }

        checarEscala0a10(centro.massa, 'massa', sisId, true);
        if (centro.brilho !== undefined) checarEscala0a10(centro.brilho, 'brilho', sisId, false);
        if (centro.tensao !== undefined) checarEscala0a10(centro.tensao, 'tensao', sisId, false);
        if (centro.disco !== undefined) checarEscala0a10(centro.disco, 'disco', sisId, false);
        if (centro.protoestrela !== undefined) checarEscala0a10(centro.protoestrela, 'protoestrela', sisId, false);
        if (centro.aproximacao !== undefined) checarEscala0a10(centro.aproximacao, 'aproximacao', sisId, false);

        checarChaveLei(centro, sisId);
        inspecionarTextos(centro, sisId);
      }

      // Varredura dos planetas
      var planetas = sis.planetas || [];
      if (Array.isArray(planetas)) {
        totalPlanetas += planetas.length;

        planetas.forEach(function (plan, idxPlan) {
          var planId = plan.id || ('planeta_' + idxPlan);
          registrarId(plan.id, 'planeta', 'planeta[' + planId + ']');

          // Regra 5: catálogo de planeta
          if (!plan.tipo || CAT_PLANETA.indexOf(plan.tipo) === -1) {
            erros.push('Tipo de planeta "' + plan.tipo + '" no corpo "' + planId + '" não é permitido. Tipos permitidos: ' + CAT_PLANETA.join(', ') + '.');
          }

          // Regra 5: exo só em sistema com anaMarrom
          if (plan.tipo === 'exo' && centro && centro.tipo !== 'anaMarrom') {
            erros.push('O planeta "' + planId + '" é do tipo "exo", mas está em um sistema cujo centro é "' + centro.tipo + '". Pelo catálogo do NEXUS, planetas do tipo "exo" só podem existir em sistemas com centro "anaMarrom".');
          }

          // Regra 1: Planeta nunca emite luz
          if (plan.brilho !== undefined && plan.brilho > 0) {
            erros.push('O planeta "' + planId + '" possui brilho (' + plan.brilho + '). Pela Lei da Luz, planetas apenas refletem a luz da estrela do sistema e nunca emitem brilho próprio.');
          }

          // Regra 2: Sentimento isolado em planeta
          if (plan.nome) {
            var planNomeNorm = normalizarTexto(plan.nome);
            if (SENTIMENTOS.indexOf(planNomeNorm) !== -1) {
              avisos.push('O planeta "' + planId + '" tem o nome de um sentimento isolado ("' + plan.nome + '"). Planetas representam áreas da vida; sentimentos devem ser modelados como forças em "forcas[]".');
            }
          }

          checarEscala0a10(plan.massa, 'massa', planId, true);
          checarEscala0a10(plan.tamanho, 'tamanho', planId, true);
          if (plan.atmosfera !== undefined) checarEscala0a10(plan.atmosfera, 'atmosfera', planId, false);
          if (plan.sinais !== undefined) checarEscala0a10(plan.sinais, 'sinais', planId, false);

          checarChaveLei(plan, planId);
          inspecionarTextos(plan, planId);

          // Varredura de luas
          var luas = plan.luas || [];
          if (Array.isArray(luas)) {
            luas.forEach(function (lua, idxLua) {
              var luaId = lua.id || ('lua_' + idxLua);
              registrarId(lua.id, 'lua', 'lua[' + luaId + ']');

              checarEscala0a10(lua.massa, 'massa', luaId, true);
              checarEscala0a10(lua.tamanho, 'tamanho', luaId, true);
              checarChaveLei(lua, luaId);
              inspecionarTextos(lua, luaId);
            });
          }

          // Varredura de elementos
          var elementos = plan.elementos || [];
          if (Array.isArray(elementos)) {
            elementos.forEach(function (elem, idxElem) {
              var elemId = elem.id || ('elemento_' + idxElem);
              registrarId(elem.id, 'elemento', 'elemento[' + elemId + ']');

              if (!elem.tipo || CAT_ELEMENTO.indexOf(elem.tipo) === -1) {
                erros.push('Tipo de elemento "' + elem.tipo + '" no corpo "' + elemId + '" não é permitido. Tipos permitidos: ' + CAT_ELEMENTO.join(', ') + '.');
              }

              // Regra 5: sinal só em exo
              if (elem.tipo === 'sinal' && plan.tipo !== 'exo') {
                erros.push('O elemento "' + elemId + '" é do tipo "sinal", mas está dentro do planeta "' + planId + '" que é do tipo "' + plan.tipo + '". Elementos do tipo "sinal" só podem existir dentro de planetas do tipo "exo".');
              }

              if (elem.aproximacao !== undefined) checarEscala0a10(elem.aproximacao, 'aproximacao', elemId, false);
              if (elem.presenca !== undefined) checarEscala0a10(elem.presenca, 'presenca', elemId, false);
              if (elem.lei) checarChaveLei(elem, elemId);
              inspecionarTextos(elem, elemId);
            });
          }
        });
      }

      // Varredura de orbitantes
      var orbitantes = sis.orbitantes || [];
      if (Array.isArray(orbitantes)) {
        orbitantes.forEach(function (orb, idxOrb) {
          var orbId = orb.id || ('orbitante_' + idxOrb);
          registrarId(orb.id, 'orbitante', 'orbitante[' + orbId + ']');

          if (!orb.tipo || CAT_ORBITANTE.indexOf(orb.tipo) === -1) {
            erros.push('Tipo de orbitante "' + orb.tipo + '" no corpo "' + orbId + '" não é permitido. Tipos permitidos: ' + CAT_ORBITANTE.join(', ') + '.');
          }

          checarEscala0a10(orb.massa, 'massa', orbId, true);
          if (orb.brilho !== undefined) checarEscala0a10(orb.brilho, 'brilho', orbId, false);
          if (orb.alcance !== undefined) checarEscala0a10(orb.alcance, 'alcance', orbId, false);

          checarChaveLei(orb, orbId);
          inspecionarTextos(orb, orbId);
        });
      }
    });

    // Regra 3: Quantidade de sistemas de estrela (1 a 3) e planetas (3 a 6)
    if (totalSistemasEstrela < 1 || totalSistemasEstrela > 3) {
      erros.push('O universo possui ' + totalSistemasEstrela + ' sistemas de estrela (estrela ou binaria). A regra do NEXUS exige de 1 a 3 sistemas de estrela no total (anã branca, anã marrom e companheiras não entram nessa conta). Ajuste os tipos dos centros dos sistemas.');
    }

    if (totalPlanetas < 3 || totalPlanetas > 6) {
      erros.push('O universo possui ' + totalPlanetas + ' planetas no total. A regra do NEXUS exige de 3 a 6 planetas no universo inteiro. Adicione ou remova planetas para ficar na faixa permitida.');
    }

    // Varredura de forças (Regra 4: IDs existentes e únicos)
    var forcas = spec.forcas || [];
    if (!Array.isArray(forcas) || forcas.length === 0) {
      erros.push('O universo precisa ter pelo menos 1 força registrada no campo "forcas".');
    } else {
      forcas.forEach(function (f, idxF) {
        var fId = f.id || ('forca_' + idxF);
        registrarId(f.id, 'forca', 'forca[' + fId + ']');

        if (!f.tipo || CAT_FORCA.indexOf(f.tipo) === -1) {
          erros.push('Tipo de força "' + f.tipo + '" na força "' + fId + '" não é permitido. Tipos permitidos: ' + CAT_FORCA.join(', ') + '.');
        }

        // Checar origem existente
        if (!f.origem || !idsRegistrados[f.origem]) {
          erros.push('A força "' + fId + '" tem origem "' + f.origem + '", que não existe no universo. Defina como origem o ID de um corpo existente.');
        }

        // Checar alvos existentes
        if (!Array.isArray(f.alvos) || f.alvos.length === 0) {
          erros.push('A força "' + fId + '" precisa de uma lista "alvos" com pelo menos um ID de corpo.');
        } else {
          f.alvos.forEach(function (alvoId) {
            if (!idsRegistrados[alvoId]) {
              erros.push('A força "' + fId + '" aponta para o alvo "' + alvoId + '", que não existe no universo. Corrija o ID do alvo.');
            }
          });
        }

        // Checar estrela no eclipse
        if (f.tipo === 'eclipse') {
          if (!f.estrela || !idsRegistrados[f.estrela]) {
            erros.push('A força de eclipse "' + fId + '" precisa indicar o campo "estrela" com o ID de uma estrela existente.');
          }
        }

        checarEscala0a10(f.intensidade, 'intensidade', fId, true);
        checarChaveLei(f, fId);
        inspecionarTextos(f, fId);
      });
    }

    return {
      ok: erros.length === 0,
      erros: erros,
      avisos: avisos
    };
  }

  // Exportação compatível com navegador e Node
  if (typeof NEXUS !== 'undefined') {
    NEXUS.validateSpec = validateSpec;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = validateSpec;
  }
})();
