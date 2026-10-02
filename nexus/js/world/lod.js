/* lod.js — NÍVEL DE DETALHE por distância. Cada sistema mostra mais ou menos coisas
   conforme a distância entre a câmera e o centro DELE:
     LONGE : só a estrela (com brilho) + pontinhos no lugar dos planetas. Sem órbitas, sem nomes.
     MÉDIO : planetas e órbitas discretas.
     PERTO : também os nomes dos planetas.
   A troca entre os níveis é suave (fade). */
(function () {
  const N = NEXUS;

  // ====================== AJUSTES (mexa só aqui) ======================
  const DIST_PERTO = 70;    // câmera a MENOS disso do sistema = PERTO (nomes aparecem)
  const DIST_LONGE = 350;   // câmera a MAIS disso do sistema = LONGE (só estrela + pontinhos)
                            // entre os dois valores = MÉDIO
  const TEMPO_FADE = 0.5;   // segundos que a transição leva
  const TAMANHO_PONTO = 7;  // tamanho do pontinho do planeta, em pixels da tela
  // ====================================================================

  // Textura do pontinho: círculo branco com borda macia. Uma só, dividida por todos os sistemas.
  let texPonto = null;
  function getTexPonto() {
    if (texPonto) return texPonto;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(.45, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    texPonto = new THREE.CanvasTexture(cv);
    return texPonto;
  }

  // Guarda os materiais de um objeto (e dos filhos) com a opacidade ORIGINAL de cada um.
  // Assim o fade multiplica a opacidade original, e no "cheio" tudo fica igual a antes.
  function guardarMateriais(obj) {
    const lista = [];
    obj.traverse(o => {
      if (o.material) lista.push({ m: o.material, base: o.material.opacity, eraTransp: o.material.transparent });
    });
    return lista;
  }

  // a = 0 (invisível) até 1 (normal).
  function aplicarOpacidade(lista, a) {
    lista.forEach(e => {
      e.m.opacity = e.base * a;
      e.m.transparent = e.eraTransp || a < .999;   // só vira transparente enquanto está no meio do fade
    });
  }

  // Prepara o LOD de UM sistema. group = a "caixa" do sistema, planets = o que buildPlanets devolveu.
  N.buildLOD = (group, planets) => {
    // Pontinhos: um ponto por planeta, com a cor base do planeta.
    const n = planets.length;
    const pos = new Float32Array(n * 3);
    const cor = new Float32Array(n * 3);
    planets.forEach((p, i) => {
      const c = new THREE.Color(p.d.base);
      cor.set([c.r, c.g, c.b], i * 3);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cor, 3));
    const mat = new THREE.PointsMaterial({
      size: TAMANHO_PONTO, sizeAttenuation: false,   // tamanho fixo na tela, não muda com a distância
      map: getTexPonto(), vertexColors: true,
      transparent: true, opacity: 0, depthWrite: false
    });
    const pontos = new THREE.Points(geo, mat);
    pontos.frustumCulled = false;                    // os pontos se mexem, então não deixa a câmera "cortar" eles
    pontos.visible = false;
    group.add(pontos);                               // dentro da caixa: acompanha a posição e a inclinação do sistema

    return {
      pontos, geo,
      planetas: planets.map(p => ({ grupo: p.group, mats: guardarMateriais(p.group) })),
      orbitas: planets.map(p => ({ linha: p.orbit, mats: guardarMateriais(p.orbit) })),
      cur: null    // níveis atuais (0 a 1); começa vazio e "pula" direto para o certo no 1º quadro
    };
  };

  const sysWorldPos = new THREE.Vector3();

  // Chamado a cada quadro, DEPOIS de updatePlanets (para os pontos usarem a posição nova dos planetas).
  N.updateLOD = (system, dt) => {
    const L = system.lod;
    system.group.getWorldPosition(sysWorldPos);
    const dist = N.cam.position.distanceTo(sysWorldPos);   // câmera até o centro deste sistema no mundo

    // Alvo de cada coisa neste nível: 1 = aparece, 0 = some.
    let alvo;
    if (dist >= DIST_LONGE) alvo = { planetas: 0, orbitas: 0, nomes: 0, pontos: 1 };       // longe
    else if (dist >= DIST_PERTO) alvo = { planetas: 1, orbitas: 1, nomes: 0, pontos: 0 };  // médio
    else alvo = { planetas: 1, orbitas: 1, nomes: 1, pontos: 0 };                          // perto

    if (!L.cur) L.cur = { ...alvo };                 // primeiro quadro: já começa no valor certo, sem fade
    const passo = dt / TEMPO_FADE;                   // quanto andar neste quadro (1 = fade inteiro em TEMPO_FADE segundos)
    for (const k in alvo) {
      const d = alvo[k] - L.cur[k];
      L.cur[k] += Math.max(-passo, Math.min(passo, d));
    }

    // Aplica os valores atuais nos objetos.
    L.planetas.forEach(p => {
      aplicarOpacidade(p.mats, L.cur.planetas);
      p.grupo.visible = L.cur.planetas > .01;        // totalmente apagado: nem desenha (economiza)
    });
    L.orbitas.forEach(o => {
      aplicarOpacidade(o.mats, L.cur.orbitas);
      o.linha.visible = L.cur.orbitas > .01;
    });

    L.pontos.material.opacity = L.cur.pontos;
    L.pontos.visible = L.cur.pontos > .01;
    if (L.pontos.visible) {                          // copia a posição de cada planeta para o seu pontinho
      const arr = L.geo.attributes.position.array;
      const vLOD = new THREE.Vector3();
      system.planets.forEach((p, i) => {
        p.group.getWorldPosition(vLOD);
        system.group.worldToLocal(vLOD);
        arr[i * 3] = vLOD.x;
        arr[i * 3 + 1] = vLOD.y;
        arr[i * 3 + 2] = vLOD.z;
      });
      L.geo.attributes.position.needsUpdate = true;
    }
  };
})();
