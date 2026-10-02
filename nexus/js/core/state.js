/* state.js — NEXUS.state: gerencia os parâmetros animáveis de todos os corpos e forças.
   Lê os valores iniciais do mock (capítulo 0) e cria uma CÓPIA DE TRABALHO.
   O objeto original do mock NUNCA é alterado. */
(function() {
  const N = NEXUS;
  const data = N.getUniverse();

  const state = {
    chapter: data.chapter || 0,
    current: {},
    target: {},
    initial: {},

    // Retorna o valor atual (suavizado) de um parâmetro
    get(id, nome) {
      if (!this.current[id]) return 0;
      return this.current[id][nome] || 0;
    },

    // Define um novo alvo para a animação
    setTarget(id, nome, valor) {
      if (!this.target[id]) this.target[id] = {};
      this.target[id][nome] = valor;
    },

    // Lê os novos alvos do capítulo N e guarda o capítulo atual
    applyChapter(n) {
      const cap = data.chapters.find(c => c.id === n);
      if (!cap) return;
      this.chapter = n;
      // Ao voltar ao capítulo 0, restaura todos os parâmetros originais
      if (n === 0 && this.initial) {
        for (const id in this.initial) {
          for (const param in this.initial[id]) {
            this.setTarget(id, param, this.initial[id][param]);
          }
        }
      }
      if (cap.set) {
        for (const id in cap.set) {
          for (const param in cap.set[id]) {
            this.setTarget(id, param, cap.set[id][param]);
          }
        }
      }
    },

    // Aproxima os valores atuais dos alvos suavemente (lerp, ~1,2s)
    update(dt) {
      const speed = 3.0; // fator de lerp para atingir o alvo suavemente
      for (const id in this.target) {
        for (const param in this.target[id]) {
          if (this.current[id][param] === undefined) {
            this.current[id][param] = this.target[id][param];
          }
          const curr = this.current[id][param];
          const tgt = this.target[id][param];
          // Easing simples: avança uma fração da distância por quadro
          this.current[id][param] += (tgt - curr) * Math.min(dt * speed, 1);
        }
      }
    }
  };

  // Inicialização: carrega os params do cap. 0 de todos os itens do universo
  const loadParams = (obj, id) => {
    if (obj && obj.params) {
      state.current[id] = { ...obj.params };
      state.target[id] = { ...obj.params };
      state.initial[id] = { ...obj.params };
    }
  };

  data.systems.forEach(sys => {
    // O centro do sistema usa o próprio ID do sistema como chave
    loadParams(sys.center, sys.id);
    
    (sys.planets || []).forEach(p => loadParams(p, p.id));
    (sys.orbiters || []).forEach(o => loadParams(o, o.id));
  });

  (data.forces || []).forEach(f => loadParams(f, f.id));

  N.state = state;
})();
