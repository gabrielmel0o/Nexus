/* universeSource.js — Fonte de dados do universo para o NEXUS.
   Permite carregar o universo tanto do backend quanto localmente.
   
   Disponibiliza:
     NEXUS.universeSource.fromBackend(texto)
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
     * Envia o texto da pessoa para o backend local, valida e compila o universo.
     * @param {string} texto Relato em primeira pessoa (500 a 3000 caracteres)
     * @returns {Promise<object>} Objeto no formato do mockUniverse compilado
     */
    async fromBackend(texto) {
      let response;
      try {
        response = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify({ texto: texto })
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

      // Compilação determinística para o formato do motor 3D
      if (typeof N.compileSpec !== 'function') {
        throw { tipo: 'servidor' };
      }

      const universoCompilado = N.compileSpec(data.spec);
      return universoCompilado;
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
