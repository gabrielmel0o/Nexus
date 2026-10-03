/* planets.js — cria os planetas a partir dos dados e os faz orbitar.
   Evoluído com:
   1) Tipos visuais por kind ('rocky', 'gas', 'ringed', 'exo').
   2) Animação suave de state: 'size' (escala corpo, halo, anéis) e 'atmosphere' (halo e névoa).
      REGRA: Não mexe em material.opacity (controlado pelo LOD); usa escala e cor aditiva.
   3) Anéis múltiplos finos e coloridos girando devagar.
   4) Luas estilizadas com leve inclinação e órbita circular própria.
   5) Semente determinística por id (reprodutível, universo sempre abre igual). */
(function () {
  const N = NEXUS;

  // Cria a textura do planeta conforme seu kind
  function createPlanetTexture(d, rng) {
    return N.makeTexture(512, 256, (g, w, h) => {
      // Cor base
      g.fillStyle = d.base;
      g.fillRect(0, 0, w, h);

      const patch = d.patch || [d.base];

      if (d.kind === 'gas') {
        // GIGANTE GASOSO: faixas horizontais suaves e ondulações
        const bands = 12;
        for (let i = 0; i < bands; i++) {
          const y = (i / bands) * h;
          const bandHeight = (h / bands) * (0.8 + rng() * 0.6);
          const col = patch[i % patch.length];
          g.fillStyle = col;
          g.fillRect(0, y, w, bandHeight);

          // Faixas/manchas horizontais alongadas para dar movimento atmosférico
          const streaks = 4;
          for (let s = 0; s < streaks; s++) {
            g.fillStyle = patch[(i + s + 1) % patch.length];
            const sw = 80 + rng() * 140;
            const sh = 10 + rng() * 20;
            const sx = rng() * w;
            const sy = y + (rng() - 0.5) * 10;
            N.capsule(g, sx, sy, sw, sh);
            N.capsule(g, sx - w, sy, sw, sh);
          }
        }
      } else if (d.kind === 'exo') {
        // EXOPLANETA: misterioso, suave, poucas manchas sutis com transições calmas
        for (let i = 0; i < 10; i++) {
          g.fillStyle = patch[i % patch.length];
          const bw = 60 + rng() * 90;
          const bh = 30 + rng() * 40;
          const x = rng() * w;
          const y = (h * 0.12) + rng() * (h * 0.72);
          N.capsule(g, x, y, bw, bh);
          N.capsule(g, x - w, y, bw, bh);
        }
      } else {
        // ROCHOSO / COM ANÉIS (padrão): manchas orgânicas em cápsula
        const numBlobs = d.kind === 'rocky' ? 22 : 16;
        N.blobs(g, w, h, patch, numBlobs, rng);
      }
    });
  }

  // Cria UM planeta dentro do grupo do sistema (parent)
  function buildPlanet(d, parent) {
    const rng = N.createRNG(d.id);

    // Grupo para a órbita do planeta: permite que forças como gravidade inclinem o plano orbital inteiro
    const orbitGroup = new THREE.Group();
    parent.add(orbitGroup);

    // 1) Linha discreta da órbita do planeta
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * d.orbit, 0, Math.sin(a) * d.orbit));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const orbitMat = N.createOrbitMaterial ? N.createOrbitMaterial(0x8a8fe8) : new THREE.LineBasicMaterial({ color: 0x8a8fe8, transparent: true, opacity: 0.2 });
    const orbit = new THREE.Line(orbitGeo, orbitMat);
    orbitGroup.add(orbit);

    // Grupo do planeta (posicionado ao longo da órbita)
    const group = new THREE.Group();
    orbitGroup.add(group);

    // Subgrupo visual: corpo, halo, névoa e anéis (é este que escala com o param 'size')
    const visualGroup = new THREE.Group();
    visualGroup.userData.pickId = d.id;
    group.add(visualGroup);

    // Corpo esférico com material lambert para reagir à luz real da estrela
    const bodyTex = createPlanetTexture(d, rng);
    const bodyGeo = new THREE.SphereGeometry(d.size, 48, 32);
    const bodyMat = new THREE.MeshLambertMaterial({
      map: bodyTex
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.userData.pickId = d.id;
    visualGroup.add(body);

    // Alvo invisível amplo para clique no planeta
    const hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(d.size * 1.35, 16, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitSphere.userData.pickId = d.id;
    visualGroup.add(hitSphere);

    // corDaNevoa: deriva da cor base, mais clara e menos saturada
    const baseCol = new THREE.Color(d.base);
    const hsl = {};
    baseCol.getHSL(hsl);
    const mistColor = new THREE.Color().setHSL(hsl.h, Math.max(0, hsl.s * 0.7), Math.min(1.0, hsl.l + 0.2));

    // Névoa da superfície para simular atmosfera espessa (oculta o contraste das manchas)
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mistMesh = new THREE.Mesh(new THREE.SphereGeometry(d.size * 1.02, 32, 24), mistMat);
    visualGroup.add(mistMesh);

    // Halo atmosférico externo: visto por dentro (BackSide)
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    // Escala inicial base da esfera é igual ao raio; fator (1.05 + 0.35 * curAtmo) é aplicado no scale
    const halo = new THREE.Mesh(new THREE.SphereGeometry(d.size, 32, 16), haloMat);
    visualGroup.add(halo);

    // Anéis: aceita array de anéis finos ou valor único
    let ringsGroup = null;
    if (d.rings) {
      ringsGroup = new THREE.Group();
      ringsGroup.rotation.set(Math.PI / 2 - 0.38, 0, 0.22);

      const ringList = Array.isArray(d.rings)
        ? d.rings
        : [{ inner: 1.5, outer: 2.0, color: d.rings }, { inner: 2.15, outer: 2.3, color: d.rings }];

      ringList.forEach(r => {
        const innerRadius = d.size * (r.inner || 1.4);
        const outerRadius = d.size * (r.outer || 1.6);
        const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: r.color || 0xffffff,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(ringGeo, ringMat);
        ringsGroup.add(mesh);
      });
      visualGroup.add(ringsGroup);
    }

    // Luas: array de { id, name, size, orbit, speed, color }
    // As luas orbitam o grupo do planeta com leve inclinação individual
    const moonControllers = [];
    const moonsById = {};
    const moons = d.moons || [];
    moons.forEach((m, idx) => {
      const moonPivot = new THREE.Group();
      moonPivot.userData.pickId = m.id;
      // Inclinação suave para não ficar perfeitamente no mesmo plano
      moonPivot.rotation.x = 0.15 + (idx * 0.18);
      moonPivot.rotation.z = -0.1 + (idx * 0.12);

      const moonMesh = new THREE.Mesh(
        new THREE.SphereGeometry(m.size, 24, 16),
        new THREE.MeshLambertMaterial({
          color: m.color || '#e9ecef'
        })
      );
      moonMesh.userData.pickId = m.id;
      // Posição orbital inicial no raio especificado
      moonMesh.position.x = m.orbit;
      moonPivot.add(moonMesh);

      // Alvo invisível para clique na lua
      const moonHit = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(m.size * 2.4, 1.2), 12, 10),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      moonHit.position.x = m.orbit;
      moonHit.userData.pickId = m.id;
      moonPivot.add(moonHit);

      group.add(moonPivot);

      // Linha discreta da órbita da lua
      const mPts = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        mPts.push(new THREE.Vector3(Math.cos(a) * m.orbit, 0, Math.sin(a) * m.orbit));
      }
      const mGeo = new THREE.BufferGeometry().setFromPoints(mPts);
      const mMat = N.createOrbitMaterial ? N.createOrbitMaterial(m.color || 0x8a8fe8) : new THREE.LineBasicMaterial({ color: 0x8a8fe8, transparent: true, opacity: 0.2 });
      const moonOrbitLine = new THREE.Line(mGeo, mMat);
      moonPivot.add(moonOrbitLine);

      const moonLabel = N.createLabel(m.name, m.id);

      const mc = {
        data: m,
        pivot: moonPivot,
        moonMesh,
        moonOrbitLine,
        label: moonLabel,
        angle: rng() * Math.PI * 2
      };
      moonControllers.push(mc);
      moonsById[m.id] = mc;

      if (N.registerOrbit) {
        const moonWP = new THREE.Vector3();
        N.registerOrbit({
          line: moonOrbitLine,
          category: 'moon',
          getBodyPos: function () {
            moonMesh.getWorldPosition(moonWP);
            return moonWP;
          },
          getPhase: function () {
            return mc.angle / (Math.PI * 2);
          },
          getDir: function () {
            return (m.speed < 0) ? -1.0 : 1.0;
          }
        });
      }
    });

    // Elementos em volta do planeta (ex: estrela de conquista / sinal)
    const elementos = [];
    if (d.elements) {
      d.elements.forEach(el => {
        const builder = N.elementBuilders && N.elementBuilders[el.type];
        if (builder) {
          const inst = builder(el, d);
          group.add(inst.object);
          elementos.push(inst);
        }
      });
    }

    // Ângulo inicial: usa startAngle fixo se existir; senão, semente determinística
    const angle = typeof d.startAngle === 'number' ? d.startAngle : rng() * Math.PI * 2;

    // Registra o PLANETA no mapa de seleção (segue o grupo em órbita)
    const planetWP = new THREE.Vector3();
    N.pickRegistry[d.id] = {
      getPos: () => { group.getWorldPosition(planetWP); return planetWP; },
      radius: d.size
    };

    // Registra cada LUA (segue a moonMesh em órbita ao redor do planeta)
    moonControllers.forEach(mc => {
      const moonWP = new THREE.Vector3();
      N.pickRegistry[mc.data.id] = {
        getPos: () => { mc.moonMesh.getWorldPosition(moonWP); return moonWP; },
        radius: mc.data.size
      };
    });

    const planetObj = {
      d,
      group,
      orbitGroup,
      visualGroup,
      body,
      mistMesh,
      mistColor,
      halo,
      ringsGroup,
      moonControllers,
      moonsById,
      orbit,
      label: N.createLabel(d.name, d.id),
      angle,
      elementos,
      // Valores atuais para interpolação suave
      curSize: (d.params && d.params.size !== undefined) ? d.params.size : 1.0,
      curAtmo: (d.params && d.params.atmosphere !== undefined) ? d.params.atmosphere : 0.4,
      // Modificadores dinâmicos de forças
      scaleModifier: 1.0,
      haloModifier: 1.0,
      haloColorFactor: 1.0,
      colorModifier: new THREE.Color(1, 1, 1)
    };

    if (N.registerOrbit) {
      const pWP = new THREE.Vector3();
      N.registerOrbit({
        line: orbit,
        category: 'planet',
        getBodyPos: function () {
          group.getWorldPosition(pWP);
          return pWP;
        },
        getPhase: function () {
          return planetObj.angle / (Math.PI * 2);
        },
        getDir: function () {
          return (d.speed < 0) ? -1.0 : 1.0;
        }
      });
    }

    // Registra no mapa global para fácil acesso por forças
    N.planetsById = N.planetsById || {};
    N.planetsById[d.id] = planetObj;

    return planetObj;
  }

  N.buildPlanets = (list, parent) => list.map(d => buildPlanet(d, parent));

  // Chamado a cada quadro: move órbita, rotações, luas, anima parâmetros dinâmicos e atualiza rótulo
  N.updatePlanets = (items, dt, nomes = 1) => {
    items.forEach(p => {
      const id = p.d.id;

      // 1) Animação da posição orbital em torno da estrela
      p.angle += p.d.speed * dt;
      p.group.position.set(
        Math.cos(p.angle) * p.d.orbit,
        0,
        Math.sin(p.angle) * p.d.orbit
      );

      // Rotação axial do planeta
      p.body.rotation.y += dt * 0.25;

      // 2) Parâmetros dinâmicos via state
      let targetSize = (p.d.params && p.d.params.size !== undefined) ? p.d.params.size : 1.0;
      let targetAtmo = (p.d.params && p.d.params.atmosphere !== undefined) ? p.d.params.atmosphere : 0.4;

      if (N.state) {
        const s = N.state.get(id, 'size');
        if (s !== undefined && s !== null) targetSize = s;
        const a = N.state.get(id, 'atmosphere');
        if (a !== undefined && a !== null) targetAtmo = a;
      }

      // Aproxima os valores atuais dos alvos suavemente
      const lerpFactor = 1 - Math.exp(-dt * 4);
      p.curSize += (targetSize - p.curSize) * lerpFactor;
      p.curAtmo += (targetAtmo - p.curAtmo) * lerpFactor;

      // Escala 'size': afeta corpo, halo e anéis (visualGroup), preservando o raio orbital
      const scaleMod = (p.scaleModifier !== undefined) ? p.scaleModifier : 1.0;
      const finalScale = p.curSize * scaleMod;
      p.visualGroup.scale.set(finalScale, finalScale, finalScale);

      // 'atmosphere' (0 a 1): controla halo e névoa
      // Halo: Escala = 1.05 + 0.35 * curAtmo
      const haloMod = (p.haloModifier !== undefined) ? p.haloModifier : 1.0;
      const haloScale = (1.05 + 0.35 * p.curAtmo) * haloMod;
      p.halo.scale.set(haloScale, haloScale, haloScale);
      
      // Halo cor = corDaNevoa * (curAtmo ^ 1.5)
      const haloColFactor = (p.haloColorFactor !== undefined) ? p.haloColorFactor : 1.0;
      const haloIntensity = Math.pow(Math.max(0, p.curAtmo), 1.5) * haloColFactor;
      p.halo.material.color.copy(p.mistColor).multiplyScalar(haloIntensity);

      // Névoa da superfície: cor = corDaNevoa * (curAtmo * 0.5)
      p.mistMesh.material.color.copy(p.mistColor).multiplyScalar(p.curAtmo * 0.5);

      // Modificador de cor do corpo do planeta (forças como eclipse escurecem o material, NUNCA opacity)
      if (p.colorModifier) {
        p.body.material.color.copy(p.colorModifier);
      }

      // 3) Anéis: rotação lenta
      if (p.ringsGroup) {
        p.ringsGroup.rotation.z += dt * 0.04;
      }

      // 4) Luas: avançam na sua respectiva velocidade orbital
      // 4) Luas: avançam na sua respectiva velocidade orbital
      const moonWP = new THREE.Vector3();
      p.moonControllers.forEach(mc => {
        mc.angle += mc.data.speed * dt;
        mc.pivot.rotation.y = mc.angle;

        // Atualiza o rótulo da lua com a curva de distância da categoria 'moon'
        mc.moonMesh.getWorldPosition(moonWP);
        const moonAlpha = N.getLabelDistFactor ? N.getLabelDistFactor(moonWP, 'moon') : (nomes * 0.7);
        N.updateLabel(mc.label, mc.moonMesh, mc.data.size, moonAlpha);
      });

      // 5) Elementos
      p.elementos.forEach(e => e.update(dt, nomes));

      // Rótulo posicionado sobre o planeta com a curva de distância da categoria 'planet'
      const planetWP = new THREE.Vector3();
      p.group.getWorldPosition(planetWP);
      const planetLabelAlpha = N.getLabelDistFactor ? N.getLabelDistFactor(planetWP, 'planet') : nomes;
      N.updateLabel(p.label, p.group, p.d.size * finalScale, planetLabelAlpha);
    });
  };
})();
