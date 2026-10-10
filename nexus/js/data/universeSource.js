/* universeSource.js — Fonte de dados do universo para o NEXUS.
   Permite carregar o universo tanto do backend quanto localmente.
   
   Disponibiliza:
     NEXUS.universeSource.fromBackend(texto)
     NEXUS.universeSource.fromHelenaCompilada()
*/

(function () {
  const N = NEXUS;
  const BACKEND_URL = 'http://127.0.0.1:3000/api/universo';

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
        throw {
          tipo: 'rede',
          mensagem: 'Não foi possível conectar ao servidor local (127.0.0.1:3000). Verifique se o backend está rodando com npm start.'
        };
      }

      let data;
      try {
        data = await response.json();
      } catch (err) {
        throw {
          tipo: 'servidor',
          mensagem: 'O servidor retornou uma resposta que não é um JSON válido.'
        };
      }

      // Verificação de erro retornado pelo servidor
      if (!response.ok || data.erro) {
        if (data.erro === 'cuidado') {
          throw {
            tipo: 'cuidado',
            mensagem: 'Se você estiver passando por um momento difícil ou pensando em se machucar, procure apoio. No Brasil, ligue 188 (CVV). Você não está sozinho.'
          };
        }

        if (response.status === 429) {
          throw {
            tipo: 'limite',
            mensagem: data.erro || 'Limite de requisições temporariamente excedido. Aguarde alguns instantes.'
          };
        }

        if (response.status === 400) {
          throw {
            tipo: 'limite',
            mensagem: data.erro || 'O texto enviado não atende aos requisitos de tamanho.'
          };
        }

        throw {
          tipo: 'servidor',
          mensagem: data.erro || 'Ocorreu uma falha no servidor ao processar o seu universo.'
        };
      }

      if (!data.spec) {
        throw {
          tipo: 'servidor',
          mensagem: 'O servidor não devolveu uma especificação válida.'
        };
      }

      // Validação semântica no navegador segundo as Leis do NEXUS
      if (typeof N.validateSpec === 'function') {
        const validacao = N.validateSpec(data.spec);
        if (!validacao.ok) {
          throw {
            tipo: 'validacao',
            mensagem: 'A especificação gerada não passou na validação das Leis do NEXUS: ' + validacao.erros.join('; ')
          };
        }
      }

      // Compilação determinística para o formato do motor 3D
      if (typeof N.compileSpec !== 'function') {
        throw {
          tipo: 'servidor',
          mensagem: 'Compilador do NEXUS não encontrado no navegador.'
        };
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
