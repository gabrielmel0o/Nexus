/* elements/dream.js — orbitante do tipo 'dream' (O sonho recorrente).
   Registra-se em NEXUS.elementBuilders['dream'].

   Estrutura:
   - Corpo pequeno esférico lilás pálido (#c8b6ff) com glow suave.
   - Rastro curto e macio (trail de partículas aditivas).
   - Órbita excêntrica (elipse alongada) com o centro do sistema em um dos focos.
   - Velocidade kepleriana: acelera significativamente ao passar perto do coração
     da nebulosa e desacelera no afélio (distante).
   - O parâmetro state.get(id, 'reach') (0 a 1) controla a distância de aproximação
     ao coração (periastro): 0 = fica afastado; 1 = passa raspando sem entrar. */
(function () {
  const N = NEXUS;
  N.elementBuilders = N.elementBuilders || {};

  // Textura suave para o rastro do sonho
  let dreamParticleTex = null;
  function getDreamParticleTex() {
    if (dreamParticleTex) return dreamParticleTex;
    dreamParticleTex = N.makeTexture(64, 64, (g) => {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(235, 225, 255, 1)');
      grad.addColorStop(0.35, 'rgba(200, 182, 255, 0.7)');
      grad.addColorStop(0.7, 'rgba(170, 140, 245, 0.25)');
      grad.addColorStop(1, 'rgba(150, 120, 230, 0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    });
    return dreamParticleTex;
  }

  N.elementBuilders.dream = function (el, systemData) {
    const orbiterId = el.id;
    const group = new THREE.Group();

    // ── 1. Linha tênue da órbita excêntrica ──
    const orbitPtsCount = 128;
    const orbitGeo = new THREE.BufferGeometry();
    const orbitPositions = new Float32Array((orbitPtsCount + 1) * 3);
    orbitGeo.setAttribute('position', new THREE.BufferAttribute(orbitPositions, 3));
    const orbitLineMat = new THREE.LineBasicMaterial({
      color: 0xc8b6ff,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitLineMat);
    group.add(orbitLine);

    // ── 2. Corpo do sonho (esfera lilás pálido) ──
    const dreamPivot = new THREE.Group();
    // Leve inclinação orbital
    group.rotation.set(0.22, 0.35, -0.15);

    // Raio: classe 'lua' = 18 UC / 2 * 0.001 = 0.009 u  (N.scale.raio('sonhoRecorrente'))
    const dreamRadius = N.scale ? N.scale.raio('sonhoRecorrente') : 0.009;
    const bodyGeo = new THREE.SphereGeometry(dreamRadius, 24, 16);
    const bodyMat = new THREE.MeshToonMaterial({
      color: 0xc8b6ff,
      gradientMap: N.toon
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.userData.pickId = orbiterId;
    dreamPivot.userData.pickId = orbiterId;
    dreamPivot.add(bodyMesh);

    // Alvo invisível para clique no sonho (proporcional ao raio)
    const hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(dreamRadius * 4.3, 16, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitSphere.userData.pickId = orbiterId;
    dreamPivot.add(hitSphere);

    // Glow suave ao redor do corpo
    const glowMat = new THREE.SpriteMaterial({
      map: getDreamParticleTex(),
      color: 0xd8c8ff,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    const glowSprite = new THREE.Sprite(glowMat);
    const glowSize = dreamRadius * 5.7;
    glowSprite.scale.set(glowSize, glowSize, 1);
    dreamPivot.add(glowSprite);

    group.add(dreamPivot);

    // ── 3. Rastro curto e macio (trail) ──
    const trailCount = 10;
    const trailSprites = [];
    const trailHistory = [];

    for (let i = 0; i < trailCount; i++) {
      const tMat = new THREE.SpriteMaterial({
        map: getDreamParticleTex(),
        color: 0xc8b6ff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: (1 - i / trailCount) * 0.45,
        depthWrite: false
      });
      const tSprite = new THREE.Sprite(tMat);
      const s = 1.8 * (1 - (i / trailCount) * 0.65);
      tSprite.scale.set(s, s, 1);
      group.add(tSprite);
      trailSprites.push(tSprite);
    }

    let theta = 0; // Ângulo orbital verdadeiro
    const rMax = el.orbit || 18; // Distância do afélio (ponto mais distante)
    let trailTimer = 0;

    return {
      object: group,
      update(dt) {
        // Lê reach (0 a 1): define a proximidade mínima do coração
        let reach = N.state ? N.state.get(orbiterId, 'reach') : 0.55;
        if (reach === undefined || reach === null) reach = 0.55;

        // Periastro: em reach=0 fica a 7.5; em reach=1 chega a 2.0 (muito perto, sem tocar)
        const rMin = 7.5 - reach * 5.5;

        // Elementos da elipse com foco na origem (coração da nebulosa)
        const a = (rMax + rMin) / 2;
        const e = (rMax - rMin) / (rMax + rMin); // Excentricidade (0.45 a 0.8)
        const p = a * (1 - e * e); // Parâmetro semilatus rectum

        // Distância atual ao foco (centro da nebulosa)
        const r = p / (1 + e * Math.cos(theta));

        // Velocidade angular kepleriana: dTheta/dt = h / r^2 (acelera perto do centro)
        const baseSpeed = el.speed || 0.18;
        const h = baseSpeed * a * 1.5;
        const dTheta = (h / (r * r)) * dt;
        theta += dTheta;

        // Posição cartesiana no plano orbital
        const posX = Math.cos(theta) * r;
        const posZ = Math.sin(theta) * r;
        dreamPivot.position.set(posX, 0, posZ);

        // Atualiza a geometria da linha de órbita caso o reach mude
        const arr = orbitPositions;
        for (let i = 0; i <= orbitPtsCount; i++) {
          const ang = (i / orbitPtsCount) * Math.PI * 2;
          const dist = p / (1 + e * Math.cos(ang));
          arr[i * 3] = Math.cos(ang) * dist;
          arr[i * 3 + 1] = 0;
          arr[i * 3 + 2] = Math.sin(ang) * dist;
        }
        orbitGeo.attributes.position.needsUpdate = true;

        // Atualização do rastro (trail)
        trailTimer += dt;
        if (trailTimer >= 0.035) {
          trailTimer = 0;
          trailHistory.unshift(new THREE.Vector3(posX, 0, posZ));
          if (trailHistory.length > trailCount) trailHistory.pop();

          trailSprites.forEach((sp, idx) => {
            if (trailHistory[idx]) {
              sp.position.copy(trailHistory[idx]);
              sp.visible = true;
            } else {
              sp.visible = false;
            }
          });
        }
      }
    };
  };
})();
