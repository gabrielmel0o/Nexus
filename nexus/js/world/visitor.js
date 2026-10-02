/* visitor.js — Rafael: corpo celeste visitante externo.
   Uma pequena estrela quente dourada (#ffd166) com sprite de 4 pontas,
   brilho suave (sparkTexture) e anéis finíssimos de ondas de gravidade que pulsam devagar.
   SEM PointLight.
   A posição vem de system.center.path (dois pontos [início, fim]) e
   state.get(id, 'approach') (0 a 1), interpolada suavemente.
   Passa entre "A criação" e "A vida não escolhida". */
(function () {
  const N = NEXUS;

  N.centerBuilders = N.centerBuilders || {};

  N.centerBuilders.visitor = function (systemData, parent) {
    const systemId = systemData.id;
    const group = new THREE.Group();
    group.userData.pickId = systemId;
    parent.add(group);

    // 1) Alvo invisível amplo para clique/hover (sem aumentar tamanho no hover)
    const hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 16, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitSphere.userData.pickId = systemId;
    group.add(hitSphere);

    // 2) Núcleo estelar dourado quente (#ffd166)
    const coreGeo = new THREE.SphereGeometry(0.75, 32, 24);
    const coreMat = new THREE.MeshToonMaterial({
      color: 0xffd166,
      gradientMap: N.toon
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.userData.pickId = systemId;
    group.add(coreMesh);

    // 3) Camadas de sprite com sparkTexture (4 pontas + brilho suave)
    // Camada interna: cruz brilhante bem nítida e clara
    const sparkMat = new THREE.SpriteMaterial({
      map: N.sparkTexture(),
      color: 0xfff9db,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const sparkSprite = new THREE.Sprite(sparkMat);
    sparkSprite.scale.set(4.2, 4.2, 1);
    group.add(sparkSprite);

    // Camada externa: halo suave e dourado quente
    const glowMat = new THREE.SpriteMaterial({
      map: N.sparkTexture(),
      color: 0xffd166,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const glowSprite = new THREE.Sprite(glowMat);
    glowSprite.scale.set(7.6, 7.6, 1);
    group.add(glowSprite);

    // 4) 3 anéis finíssimos de ondas de gravidade concêntricas que pulsam devagar
    // Geometria base fina de anel
    const ringGeo = new THREE.RingGeometry(0.96, 1.04, 64);
    const waves = [];
    const NUM_WAVES = 3;

    for (let i = 0; i < NUM_WAVES; i++) {
      const waveMat = new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const waveMesh = new THREE.Mesh(ringGeo, waveMat);
      group.add(waveMesh);

      waves.push({
        mesh: waveMesh,
        mat: waveMat,
        fase: (i / NUM_WAVES) * (Math.PI * 2)
      });
    }

    // Caminho entre os dois pontos [início, fim]
    const path = (systemData.center && systemData.center.path) || systemData.path || [
      [150, 12, -30],
      [92, 0, -42]
    ];
    const p0 = path[0];
    const p1 = path[1];

    let t = 0;

    return {
      object: group,
      update(dt) {
        t += dt;

        // Rotação suave do núcleo e dos sprites
        coreMesh.rotation.y += dt * 0.4;
        sparkSprite.material.rotation += dt * 0.05;
        glowSprite.material.rotation -= dt * 0.03;

        // Pulsação suave do brilho da estrelinha (com suporte ao pulso da supernova)
        const pulseSupernova = (parent && parent.userData && parent.userData.supernovaPulse !== undefined)
          ? parent.userData.supernovaPulse
          : (group.userData.supernovaPulse !== undefined ? group.userData.supernovaPulse : 1.0);
        const pulse = (0.88 + 0.12 * Math.sin(t * 2.2)) * pulseSupernova;
        sparkSprite.scale.set(4.2 * pulse, 4.2 * pulse, 1);
        glowSprite.scale.set(7.6 * pulse, 7.6 * pulse, 1);
        sparkSprite.material.color.setScalar(pulseSupernova);
        glowSprite.material.color.setScalar(pulseSupernova);

        // Ondas de gravidade emanando do centro
        for (let i = 0; i < waves.length; i++) {
          const w = waves[i];
          w.fase += dt * 0.85; // velocidade lenta e contemplativa
          const progresso = (w.fase % (Math.PI * 2)) / (Math.PI * 2); // 0 a 1

          // Escala expande de 1.4 até 5.8
          const raioAtual = 1.4 + progresso * 4.4;
          w.mesh.scale.set(raioAtual, raioAtual, 1);

          // Opacidade alta perto do centro, dissipa suavemente até 0 no limite
          const fade = Math.sin(progresso * Math.PI);
          w.mat.opacity = fade * 0.28;

          // Alinha o anel para sempre olhar para a câmera (visível de qualquer ângulo)
          if (N.cam) {
            w.mesh.quaternion.copy(N.cam.quaternion);
          }
        }

        // Interpola a posição do sistema ao longo do path pelo parâmetro 'approach' (0 a 1)
        let approach = 0.2;
        if (N.state && typeof N.state.get === 'function') {
          approach = N.state.get(systemId, 'approach');
          if (approach === undefined || approach === null) {
            approach = (systemData.center && systemData.center.params && systemData.center.params.approach !== undefined)
              ? systemData.center.params.approach
              : 0.2;
          }
        }

        // Posição no mundo interpolada suavemente
        const curX = p0[0] + (p1[0] - p0[0]) * approach;
        const curY = p0[1] + (p1[1] - p0[1]) * approach;
        const curZ = p0[2] + (p1[2] - p0[2]) * approach;

        parent.position.set(curX, curY, curZ);
      }
    };
  };
})();
