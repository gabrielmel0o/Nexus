/* nebula.js — centro do tipo 'nebula' (variante 'dark').
   Registra-se em NEXUS.centerBuilders['nebula'].
   NÃO cria PointLight.

   Estrutura:
   - Fundo com aglomerado de ~25 estrelinhas (sparkTexture) posicionadas atrás.
   - 10 manchas escuras e macias em camadas (NormalBlending), com cor um pouco
     mais escura e azulada que o espaço (#080a1c), gerando um VAZIO que bloqueia as estrelas.
   - Borda fria muito sutil.
   - No coração [0,0,0], uma protoestrela (laranja suave) com brilho
     modulado por state.get(id, 'protostar') (0 = invisível, 1 = viva). */
(function () {
  const N = NEXUS;
  N.centerBuilders = N.centerBuilders || {};

  // Textura suave para as manchas escuras da nebulosa
  let darkPatchTex = null;
  function getDarkPatchTex() {
    if (darkPatchTex) return darkPatchTex;
    darkPatchTex = N.makeTexture(128, 128, (g) => {
      const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      // Núcleo escuro denso azul-noite profundo
      grad.addColorStop(0, 'rgba(8, 11, 28, 0.98)');
      grad.addColorStop(0.5, 'rgba(9, 13, 32, 0.92)');
      grad.addColorStop(0.8, 'rgba(15, 22, 48, 0.45)');
      // Borda fria sutil que se dissipa no fundo
      grad.addColorStop(1, 'rgba(20, 28, 60, 0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
    });
    return darkPatchTex;
  }

  // Textura do ponto quente da protoestrela (laranja suave)
  let protoTex = null;
  function getProtoTex() {
    if (protoTex) return protoTex;
    protoTex = N.makeTexture(128, 128, (g) => {
      const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255, 230, 180, 1)');
      grad.addColorStop(0.2, 'rgba(255, 150, 60, 0.8)');
      grad.addColorStop(0.5, 'rgba(230, 90, 30, 0.3)');
      grad.addColorStop(1, 'rgba(200, 60, 20, 0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
    });
    return protoTex;
  }

  N.centerBuilders.nebula = function (systemData, parent) {
    const systemId = systemData.id;
    const group = new THREE.Group();

    // ── 1. Estrelinhas ao fundo (~25 estrelas que ficam bloqueadas pela nebulosa) ──
    const starsGroup = new THREE.Group();
    const numStars = 26;
    for (let i = 0; i < numStars; i++) {
      const starMat = new THREE.SpriteMaterial({
        map: N.sparkTexture(),
        color: 0xd8e4ff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.65 + Math.random() * 0.3,
        depthWrite: false
      });
      const star = new THREE.Sprite(starMat);
      // Espalhadas em um plano recuado atrás da nebulosa (Z negativo)
      const ang = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 11;
      star.position.set(
        Math.cos(ang) * dist,
        (Math.random() - 0.5) * 8,
        -5 - Math.random() * 6
      );
      const s = 1.2 + Math.random() * 1.5;
      star.scale.set(s, s, 1);
      starsGroup.add(star);
    }
    group.add(starsGroup);

    // ── 2. Manchas macias da nebulosa escura (10 camadas com NormalBlending) ──
    const cloudsGroup = new THREE.Group();
    const patchMat = new THREE.SpriteMaterial({
      map: getDarkPatchTex(),
      blending: THREE.NormalBlending, // Bloqueia fisicamente a luz de trás
      transparent: true,
      opacity: 0.94,
      depthWrite: false
    });

    const clouds = [];
    const numPatches = 10;
    for (let i = 0; i < numPatches; i++) {
      const sprite = new THREE.Sprite(patchMat);
      const ang = (i / numPatches) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const r = 1.5 + Math.random() * 4.2;
      sprite.position.set(
        Math.cos(ang) * r,
        (Math.random() - 0.5) * 2.8,
        (Math.random() - 0.5) * 3.5 // Entre -1.75 e +1.75 (na frente das estrelas)
      );
      const scale = 8 + Math.random() * 6.5;
      sprite.scale.set(scale, scale, 1);
      cloudsGroup.add(sprite);

      clouds.push({
        sprite,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        driftSpeed: 0.2 + Math.random() * 0.3,
        basePos: sprite.position.clone()
      });
    }
    group.add(cloudsGroup);

    // ── 3. Protoestrela no coração da nebulosa ──
    const protoGroup = new THREE.Group();
    // Núcleo denso
    const protoCoreMat = new THREE.SpriteMaterial({
      map: protoTex,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const protoCore = new THREE.Sprite(protoCoreMat);
    protoCore.scale.set(3.5, 3.5, 1);

    // Brilho difuso da protoestrela
    const protoGlowMat = new THREE.SpriteMaterial({
      map: protoTex,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const protoGlow = new THREE.Sprite(protoGlowMat);
    protoGlow.scale.set(8.5, 8.5, 1);

    protoGroup.add(protoCore);
    protoGroup.add(protoGlow);
    group.add(protoGroup);

    // Alvo invisível amplo para clique na nebulosa
    const hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(8.5, 16, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitSphere.userData.pickId = systemId;
    group.userData.pickId = systemId;
    group.add(hitSphere);

    parent.add(group);

    let tempo = 0;

    return {
      object: group,
      update(dt) {
        tempo += dt;

        // Deriva suave das manchas da nebulosa
        clouds.forEach((c, idx) => {
          c.sprite.position.x = c.basePos.x + Math.sin(tempo * c.driftSpeed + idx) * 0.4;
          c.sprite.position.y = c.basePos.y + Math.cos(tempo * c.driftSpeed + idx) * 0.3;
        });

        // Parâmetro animável 'protostar' (0 = invisível, 1 = acesa)
        let protoParam = N.state ? N.state.get(systemId, 'protostar') : 0;
        if (protoParam === undefined || protoParam === null) protoParam = 0;

        if (protoParam <= 0.01) {
          protoGroup.visible = false;
        } else {
          protoGroup.visible = true;
          // Pulsação térmica sutil
          const pulse = 0.88 + 0.12 * Math.sin(tempo * 2.4);
          const intensity = Math.min(1.0, protoParam * pulse);

          protoCoreMat.opacity = intensity * 0.95;
          protoGlowMat.opacity = intensity * 0.45;

          const coreScale = 3.2 * (0.8 + 0.3 * intensity);
          const glowScale = 7.5 * (0.8 + 0.35 * intensity);
          protoCore.scale.set(coreScale, coreScale, 1);
          protoGlow.scale.set(glowScale, glowScale, 1);
        }
      }
    };
  };
})();
