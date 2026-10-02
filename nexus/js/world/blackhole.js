/* blackhole.js — centros do tipo 'blackhole' (buracos negros).
   Registra-se em NEXUS.centerBuilders['blackhole'].
   Nenhuma variante emite luz (PointLight).

   Variantes:
   - 'self' (O Eu): supermassivo, esfera preta pura, sem disco brilhante,
     apenas um anel finíssimo e muito tênue (índigo/lilás) girando devagar.
   - 'trauma' (A perda da mãe): esfera preta + disco de acreção (200 partículas em espiral)
     violeta/magenta (#9b5de5/#c77dff) + espinhos finos de luz roxa estilo Outer Wilds.
     Brilho e intensidade do disco modulados por state.get(id, 'disk'). */
(function () {
  const N = NEXUS;
  N.centerBuilders = N.centerBuilders || {};

  // Textura suave circular compartilhada para as partículas do disco
  let diskParticleTex = null;
  function getParticleTex() {
    if (diskParticleTex) return diskParticleTex;
    diskParticleTex = N.makeTexture(32, 32, (g) => {
      const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.4, 'rgba(215,160,255,0.8)');
      grad.addColorStop(1, 'rgba(155,93,229,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 32, 32);
    });
    return diskParticleTex;
  }

  N.centerBuilders.blackhole = function (systemData, parent) {
    const center = systemData.center || {};
    const variant = center.variant || 'self';
    const systemId = systemData.id;
    const group = new THREE.Group();

    if (variant === 'self') {
      // ═════════════════════════════════════════════════════════════════
      // 1. O EU (supermassivo, escuro, inalcançável)
      // ═════════════════════════════════════════════════════════════════
      const raioEu = 4.2;
      group.userData.pickId = systemId;
      // Esfera preta pura, sem reflexo nem brilho
      const blackGeo = new THREE.SphereGeometry(raioEu, 48, 32);
      const blackMat = new THREE.MeshBasicMaterial({ color: 0x010003 });
      const sphere = new THREE.Mesh(blackGeo, blackMat);
      sphere.userData.pickId = systemId;
      group.add(sphere);

      // Alvo invisível amplo para facilitar clique no Eu
      const hitSphere = new THREE.Mesh(
        new THREE.SphereGeometry(raioEu * 1.5, 16, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      hitSphere.userData.pickId = systemId;
      group.add(hitSphere);

      // Anel finíssimo e muito sutil (índigo/lilás tênue)
      const ringGeo = new THREE.RingGeometry(raioEu * 1.05, raioEu * 1.09, 96);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x7b68ee,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.set(Math.PI / 2 - 0.25, 0.1, 0);
      group.add(ring);

      parent.add(group);

      return {
        object: group,
        update(dt) {
          // Rotação sutil e contemplativa do anel tênue
          ring.rotation.z += dt * 0.03;
        }
      };
    }

    // ═════════════════════════════════════════════════════════════════
    // 2. TRAUMA (estelar, com disco de acreção em espiral e espinhos)
    // ═════════════════════════════════════════════════════════════════
    const raioTrauma = 2.4;
    group.userData.pickId = systemId;
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(raioTrauma, 40, 28),
      new THREE.MeshBasicMaterial({ color: 0x020005 })
    );
    sphere.userData.pickId = systemId;
    group.add(sphere);

    // Alvo invisível cobrindo o disco de acreção
    const hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(raioTrauma * 3.5, 16, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitSphere.userData.pickId = systemId;
    group.add(hitSphere);

    // Borda interna suave (horizonte de eventos)
    const rimGeo = new THREE.RingGeometry(raioTrauma * 0.98, raioTrauma * 1.15, 64);
    const rimMat = new THREE.MeshBasicMaterial({
      color: 0xc77dff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.set(Math.PI / 2 - 0.35, 0, 0.15);
    group.add(rim);

    // Disco de partículas (ruminações): ~200 pontos em espiral decrescente
    const numPoints = 210;
    const rMin = raioTrauma * 1.15;
    const rMax = raioTrauma * 3.4;
    const particlesData = [];
    const positions = new Float32Array(numPoints * 3);
    const colors = new Float32Array(numPoints * 3);

    const colInner = new THREE.Color(0xc77dff); // magenta claro no centro
    const colOuter = new THREE.Color(0x7b2cbf); // violeta profundo na borda

    for (let i = 0; i < numPoints; i++) {
      const r = rMin + Math.random() * (rMax - rMin);
      const theta = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 0.7; // velocidade angular
      const spiralSpeed = 0.35 + Math.random() * 0.45; // velocidade de queda

      particlesData.push({ r, theta, speed, spiralSpeed });

      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const y = (Math.random() - 0.5) * 0.25;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Interpolação de cor da borda externa para o centro
      const t = (r - rMin) / (rMax - rMin);
      const c = colInner.clone().lerp(colOuter, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pointsMat = new THREE.PointsMaterial({
      size: 4.5,
      map: getParticleTex(),
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });

    const diskPoints = new THREE.Points(pointsGeo, pointsMat);
    // Leve inclinação do plano do disco
    const diskGroup = new THREE.Group();
    diskGroup.rotation.set(Math.PI / 2 - 0.35, 0, 0.15);
    diskGroup.add(diskPoints);
    group.add(diskGroup);

    // 4 espinhos finos de luz roxa estilo Outer Wilds
    const spikesGroup = new THREE.Group();
    spikesGroup.rotation.copy(diskGroup.rotation);
    const spikeLength = raioTrauma * 4.2;
    const spikeMat = new THREE.LineBasicMaterial({
      color: 0xc77dff,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });

    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + Math.PI / 4;
      const pts = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.cos(ang) * spikeLength, 0, Math.sin(ang) * spikeLength)
      ];
      const spikeGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const spikeLine = new THREE.Line(spikeGeo, spikeMat);
      spikesGroup.add(spikeLine);
    }
    group.add(spikesGroup);

    parent.add(group);

    let tempo = 0;

    return {
      object: group,
      update(dt) {
        tempo += dt;

        // Parâmetro animável 'disk' (0 a 1) do capítulo atual
        let diskParam = N.state ? N.state.get(systemId, 'disk') : 0.9;
        if (diskParam === undefined || diskParam === null) diskParam = 0.9;

        // Pulsação suave
        const pulse = 0.9 + 0.1 * Math.sin(tempo * 1.8);
        const effectiveDisk = Math.max(0.05, diskParam * pulse);

        // Modula a intensidade do disco e dos espinhos
        pointsMat.color.setScalar(effectiveDisk);
        rimMat.color.copy(colInner).multiplyScalar(effectiveDisk);
        spikeMat.color.copy(colInner).multiplyScalar(effectiveDisk);

        // Rotação dos espinhos
        spikesGroup.rotation.z += dt * 0.08;

        // Atualiza as partículas em espiral
        const posArr = pointsGeo.attributes.position.array;
        for (let i = 0; i < numPoints; i++) {
          const p = particlesData[i];

          // Gira e desce em direção ao centro (ruminação)
          p.theta += (p.speed * (1.6 / Math.sqrt(p.r))) * dt;
          p.r -= p.spiralSpeed * dt * (0.8 + 0.4 * diskParam);

          // Se atingiu a borda interna, reaparece na borda externa
          if (p.r <= rMin) {
            p.r = rMax - Math.random() * 0.3;
            p.theta = Math.random() * Math.PI * 2;
          }

          posArr[i * 3] = Math.cos(p.theta) * p.r;
          posArr[i * 3 + 2] = Math.sin(p.theta) * p.r;
        }
        pointsGeo.attributes.position.needsUpdate = true;
      }
    };
  };
})();
