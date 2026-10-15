/* universeSource.js — Fonte de dados do universo para o NEXUS.
   Permite carregar o universo tanto do backend quanto localmente.
   
   Disponibiliza:
     NEXUS.universeSource.fromBackend(texto, respostas, especificacaoAnterior)
     NEXUS.universeSource.fromHistory(historico)
     NEXUS.universeSource.saveHistory(historico)
     NEXUS.universeSource.fromHelenaCompilada()
*/

(function () {
  const N = NEXUS;
  const BACKEND_URL = 'http://127.0.0.1:3000/api/universo';

  // O código HTTP escolhe o estado da Start; detalhes técnicos ficam fora da tela.
  function tipoDoErro(status) {
    if (status === 429) return 'limite';
    if (status === 400 || status === 413 || status === 422) return 'validacao';
    return 'servidor';
  }

  N.universeSource = {
    /**
     * Envia o texto para o backend local e devolve a especificação validada.
     * @param {string} texto Relato (500 a 3000) ou novidades (100 a 3000 caracteres)
     * @param {Array<string>} [respostas] Segunda rodada; [] significa pular perguntas
     * @param {object} [especificacaoAnterior] Somente a fase mais recente na atualização
     * @returns {Promise<object>} { especificacao } ou { duvidas: [...] }
     */
    async fromBackend(texto, respostas, especificacaoAnterior) {
      if (especificacaoAnterior !== undefined && !N.history.validateSpecification(especificacaoAnterior).ok) {
        throw { tipo: 'validacao' };
      }
      let response;
      try {
        response = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify({ texto: texto, ...(respostas !== undefined ? { respostas: respostas } : {}),
            ...(especificacaoAnterior !== undefined ? { especificacaoAnterior: especificacaoAnterior } : {}) })
        });
      } catch (err) {
        throw { tipo: 'rede' };
      }

      let data;
      try {
        data = await response.json();
      } catch (err) {
        throw { tipo: tipoDoErro(response.status) };
      }

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw { tipo: tipoDoErro(response.status) };
      }

      // Verificação de erro retornado pelo servidor
      if (!response.ok || data.erro) {
        if (data.erro === 'cuidado') {
          throw { tipo: 'cuidado' };
        }

        throw { tipo: tipoDoErro(response.status) };
      }

      if (Object.prototype.hasOwnProperty.call(data, 'duvidas')) {
        const duvidas = data.duvidas;
        if (respostas !== undefined || especificacaoAnterior !== undefined || data.spec || !Array.isArray(duvidas)
          || duvidas.length < 1 || duvidas.length > 5
          || duvidas.some(q => typeof q !== 'string' || !q.trim() || q.length > 200)) {
          throw { tipo: 'validacao' };
        }
        return { duvidas: duvidas.map(q => q.trim()) };
      }

      if (!data.spec) {
        throw { tipo: 'servidor' };
      }

      // Validação semântica no navegador segundo as Leis do NEXUS
      if (typeof N.validateSpec !== 'function') {
        throw { tipo: 'servidor' };
      }
      const validacao = N.validateSpec(data.spec);
      if (!validacao.ok) {
        throw { tipo: 'validacao' };
      }

      // O menu compõe e valida o histórico inteiro antes de substituir o salvo.
      return { especificacao: JSON.parse(JSON.stringify(data.spec)) };
    },

    fromHistory(historico) {
      return N.compileHistory(historico);
    },

    saveHistory(historico) {
      // Falha de compilação também preserva o mapa anterior. O boot vem depois.
      const universo = this.fromHistory(historico);
      return Object.assign(N.universeStore.save(historico), { universo: universo });
    },

    /**
     * Compila diretamente a especificação canônica de Helena (para testes locais sem backend).
     * @returns {object} Universo de Helena compilado
     */
    fromHelenaCompilada() {
      const specHelena = (N.specs && N.specs.helena) || null;
      if (!specHelena) {
        throw {
          tipo: 'validacao',
          mensagem: 'Especificação canônica de Helena não foi carregada (NEXUS.specs.helena).'
        };
      }

      if (typeof N.compileSpec !== 'function') {
        throw {
          tipo: 'servidor',
          mensagem: 'Compilador do NEXUS não encontrado (NEXUS.compileSpec).'
        };
      }

      return N.compileSpec(specHelena);
    }
  };
})();
