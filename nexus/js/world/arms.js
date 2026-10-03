/* arms.js — braços espirais da galáxia (as rotinas organizadas de Helena).
   NEXUS.buildArms() cria 2 braços em espiral logarítmica de r≈20 até r≈150 a partir do Eu (origem).
   MUITO discretos: não competem com as estrelas dos sistemas.
   Aglomerados de rotinas: Trabalho, Academia, Contas, Mensagens e Compromissos.
   Rótulos das rotinas aparecem apenas quando a câmera está próxima. */
(function () {
  const N = NEXUS;

  // ══════════════════════════════════════════════════════════════════
  // CONFIGURAÇÃO (mexa aqui para ligar/desligar ou ajustar)
  // ══════════════════════════════════════════════════════════════════
  const ATIVAR_BRACOS        = true;   // Chave geral liga/desliga os braços
  const NUM_PONTOS_TOTAL     = 400;    // Quantidade total de pontos discretos
  const RAIO_INICIAL         = 20;     // Início da espiral próximo ao Eu
  const RAIO_FINAL           = 150;    // Raio máximo dos braços
  // Velocidade angular alinhada à do sistema mais próximo
  const DIST_LABEL_VISIVEL   = 65;     // Distância da câmera onde os rótulos de rotina aparecem
  const OPACIDADE_PONTOS     = 0.38;   // Opacidade sutil dos pontos (não ofusca estrelas)
  // ══════════════════════════════════════════════════════════════════

  N.buildArms = function () {
    const ROTACAO_VELOCIDADE = (2 * Math.PI) / (N.VOLTA_GALAXIA_SEGUNDOS || 240);

    const armsGroup = new THREE.Group();
    N.scene.add(armsGroup);

    if (!ATIVAR_BRACOS) {
      return {
        object: armsGroup,
        update: () => {}
      };
    }

    const universe = N.getUniverse();
    const routinesData = (universe.galaxy && universe.galaxy.arms && universe.galaxy.arms.routines)
      ? universe.galaxy.arms.routines
      : [];

    const rng = N.createRNG('helena-routines-arms');

    // Espiral logarítmica: r = a * exp(b * theta)
    // Para r=20 até r=150 com theta de 0 a ~2.2*PI:
    const thetaMax = 2.2 * Math.PI;
    const bConst = Math.log(RAIO_FINAL / RAIO_INICIAL) / thetaMax; // ~0.29

    // Cores discretas: branco-quente e lilás pálido
    const colWarmWhite = new THREE.Color('#fff5ea');
    const colPaleLilac = new THREE.Color('#cfc2ea');

    const positions = new Float32Array(NUM_PONTOS_TOTAL * 3);
    const colors = new Float32Array(NUM_PONTOS_TOTAL * 3);

    let ptIdx = 0;

    // 1) 5 aglomerados das rotinas de Helena ao longo dos braços
    const routineAnchors = [];
    const ptsPerCluster = 12;
    const clusterTotalPts = routinesData.length * ptsPerCluster;
    const ptsPerArm = Math.floor((NUM_PONTOS_TOTAL - clusterTotalPts) / 2);

    routinesData.forEach((rot) => {
      const t = rot.progress || 0.5;
      const armOffset = (rot.arm === 1) ? Math.PI : 0;
      const thBase = t * thetaMax + armOffset;
      const rBase = RAIO_INICIAL * Math.exp(bConst * (t * thetaMax));

      const cx = Math.cos(thBase) * rBase;
      const cz = Math.sin(thBase) * rBase;
      const cy = (rng() - 0.5) * 1.5;

      // Âncora 3D para posicionamento do rótulo
      const anchor = new THREE.Object3D();
      anchor.position.set(cx, cy, cz);
      armsGroup.add(anchor);

      const label = N.createLabel(rot.name);

      routineAnchors.push({
        name: rot.name,
        anchor,
        label,
        pos: new THREE.Vector3(cx, cy, cz)
      });

      // Pontos concentrados no aglomerado
      for (let k = 0; k < ptsPerCluster; k++) {
        if (ptIdx >= NUM_PONTOS_TOTAL) break;

        const spreadR = (rng() - 0.5) * 4.5;
        const spreadAng = (rng() - 0.5) * 0.12;
        const px = Math.cos(thBase + spreadAng) * (rBase + spreadR);
        const pz = Math.sin(thBase + spreadAng) * (rBase + spreadR);
        const py = cy + (rng() - 0.5) * 2.2;

        positions[ptIdx * 3] = px;
        positions[ptIdx * 3 + 1] = py;
        positions[ptIdx * 3 + 2] = pz;

        // Cor mesclada
        const c = colWarmWhite.clone().lerp(colPaleLilac, rng() * 0.85);
        colors[ptIdx * 3] = c.r;
        colors[ptIdx * 3 + 1] = c.g;
        colors[ptIdx * 3 + 2] = c.b;

        ptIdx++;
      }
    });

    // 2) Pontos gerais distribuídos nos 2 braços em espiral
    for (let arm = 0; arm < 2; arm++) {
      const armOffset = arm * Math.PI;

      for (let i = 0; i < ptsPerArm; i++) {
        if (ptIdx >= NUM_PONTOS_TOTAL) break;

        const t = (i / ptsPerArm);
        const th = t * thetaMax;
        const rBase = RAIO_INICIAL * Math.exp(bConst * th);

        // Dispersão suave ao longo do braço (alarga um pouco na periferia)
        const spreadR = (rng() - 0.5) * (4.0 + t * 14.0);
        const spreadTh = (rng() - 0.5) * 0.32;

        const r = rBase + spreadR;
        const thEff = th + armOffset + spreadTh;

        const px = Math.cos(thEff) * r;
        const pz = Math.sin(thEff) * r;
        const py = (rng() - 0.5) * 4.8 * (0.3 + 0.7 * t); // Bem achatado: |y| < 2.5

        positions[ptIdx * 3] = px;
        positions[ptIdx * 3 + 1] = py;
        positions[ptIdx * 3 + 2] = pz;

        const c = colWarmWhite.clone().lerp(colPaleLilac, rng() * 0.75);
        colors[ptIdx * 3] = c.r;
        colors[ptIdx * 3 + 1] = c.g;
        colors[ptIdx * 3 + 2] = c.b;

        ptIdx++;
      }
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pointsMat = new THREE.PointsMaterial({
      size: 2.4,
      sizeAttenuation: true,
      map: N.sparkTexture(),
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: OPACIDADE_PONTOS,
      depthWrite: false
    });

    const pointsMesh = new THREE.Points(pointsGeo, pointsMat);
    armsGroup.add(pointsMesh);

    const worldPos = new THREE.Vector3();

    return {
      object: armsGroup,
      update(dt) {
        // Rotação lentíssima dos braços da galáxia (sincronizada com a galáxia)
        if (N.ROTACAO_GALAXIA !== false) {
          armsGroup.rotation.y += dt * ROTACAO_VELOCIDADE;
        }

        // Atualização dos rótulos das rotinas com a câmera perto
        const camPos = N.cam.position;
        routineAnchors.forEach((rot) => {
          rot.anchor.getWorldPosition(worldPos);
          const dist = camPos.distanceTo(worldPos);

          if (dist < DIST_LABEL_VISIVEL) {
            // Fade suave quando a câmera se aproxima de 65 até 35 unidades
            const alpha = Math.max(0, Math.min(1, (DIST_LABEL_VISIVEL - dist) / 28));
            N.updateLabel(rot.label, rot.anchor, 1.2, alpha * 0.85);
          } else {
            rot.label.style.opacity = 0;
          }
        });
      }
    };
  };
})();
