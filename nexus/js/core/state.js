/* state.js — NEXUS.state: gerencia os parâmetros animáveis de todos os corpos e forças.
   Lê os valores iniciais do mock (capítulo 0) e cria uma CÓPIA DE TRABALHO.
   O objeto original do mock NUNCA é alterado. */
(function() {
  const N = NEXUS;
  let data = N.getUniverse();

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
      if (data.historyFrames) {
        const previous = this.frame, current = this.current;
        this.frame = data.historyFrames[n];
        this.current = JSON.parse(JSON.stringify(cap.set));
        this.target = JSON.parse(JSON.stringify(cap.set));
        // Somente os valores visuais interpolam. Ausências desligam na hora;
        // textos e referências já pertencem à fase escolhida.
        for (const id in this.current) {
          if (!this.current[id].presence) continue;
          const continuing = N.presence && N.presence.isPresentIn(id, previous) && N.presence.isPresent(id);
          for (const param in this.current[id]) {
            if (param === 'presence') continue;
            if (continuing && current[id] && current[id][param] !== undefined) this.current[id][param] = current[id][param];
            else if (param === 'size' || param === 'brightness' || param === 'strength') this.current[id][param] = 0;
          }
        }
        if (N.presence) N.presence.apply(previous);
        return;
      }
      // Helena usa alterações esparsas: reconstrói o estado acumulado até esta
      // fase, mesmo ao recuar. Chaves que surgem depois começam desligadas.
      const completo = JSON.parse(JSON.stringify(this.initial));
      data.chapters.forEach(c => {
        Object.keys(c.set || {}).forEach(id => {
          if (!completo[id]) completo[id] = {};
          Object.keys(c.set[id]).forEach(p => {
            if (completo[id][p] === undefined) completo[id][p] = 0;
          });
        });
      });
      for (const c of data.chapters) {
        if (c.set) Object.keys(c.set).forEach(id => Object.assign(completo[id], c.set[id]));
        if (c.id === n) break;
      }
      this.target = completo;
    },

    // Aproxima os valores atuais dos alvos suavemente (lerp com easing orgânico, ~1,2s)
    update(dt) {
      const speed = 2.8; // fator de lerp para atingir o alvo suavemente (~1,2s)
      for (const id in this.target) {
        if (!this.current[id]) this.current[id] = {};
        for (const param in this.target[id]) {
          if (this.current[id][param] === undefined) {
            this.current[id][param] = this.target[id][param];
          }
          const curr = this.current[id][param];
          const tgt = this.target[id][param];
          // Easing suave: avança proporcionalmente à distância restante
          if (Math.abs(tgt - curr) < 0.0005) {
            this.current[id][param] = tgt;
          } else {
            this.current[id][param] += (tgt - curr) * Math.min(dt * speed, 1);
          }
        }
      }
    }
  };

  // Inicialização: carrega os params do cap. 0 de todos os itens do universo
  function initParams(universo) {
    // Os capítulos e os parâmetros precisam vir do mesmo universo recebido.
    const src = universo || N.currentUniverse || N.getUniverse();
    data = src;
    state.chapter = src.chapter || 0;
    state.current = {};
    state.target = {};
    state.initial = {};
    state.frame = null;
    if (src.historyFrames) {
      state.frame = src.historyFrames[state.chapter];
      state.current = JSON.parse(JSON.stringify(state.frame.set));
      state.target = JSON.parse(JSON.stringify(state.frame.set));
      state.initial = JSON.parse(JSON.stringify(src.historyFrames[0].set));
      return;
    }

    const loadParams = (obj, id) => {
      if (obj && obj.params) {
        state.current[id] = { ...obj.params };
        state.target[id] = { ...obj.params };
        state.initial[id] = { ...obj.params };
      }
    };

    (src.systems || []).forEach(sys => {
      // O centro do sistema usa o próprio ID do sistema como chave
      loadParams(sys.center, sys.id);

      (sys.planets || []).forEach(p => {
        loadParams(p, p.id);
        (p.moons || []).forEach(m => loadParams(m, m.id));
        (p.elements || []).forEach(el => loadParams(el, el.id));
      });
      (sys.orbiters || []).forEach(o => loadParams(o, o.id));
    });

    (src.forces || []).forEach(f => loadParams(f, f.id));
  }

  state.init = initParams;

  // Carrega inicialmente com o universo padrão
  initParams(data);

  N.state = state;
})();

