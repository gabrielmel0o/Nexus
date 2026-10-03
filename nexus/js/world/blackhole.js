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

  // ══════════════════════════════════════════════════════════════════
  // DISCO DE O EU — mude aqui para testar outros tamanhos.
  // Sistema mais próximo: "criacao" dist ≈ 51.35 → 70% ≈ 35.9 u.
  // raioEu = 4.2, então máx seguro ≈ 8.5×. Valor atual: 6× = 25.2 ✓
  // ══════════════════════════════════════════════════════════════════
  const EU_DISCO_RAIO_EXTERNO = 6; // múltiplo do raio do buraco negro

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

  // Textura radial do disco de acreção para O Eu
  let accretionDiskTex = null;
  function getAccretionDiskTex() {
    if (accretionDiskTex) return accretionDiskTex;
    accretionDiskTex = N.makeTexture(512, 512, (g) => {
      const cx = 256, cy = 256;
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, 256);

      const rInner = 1.3 / EU_DISCO_RAIO_EXTERNO; // posição normalizada da borda interna

      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(Math.max(0, rInner - 0.008), 'rgba(0,0,0,0)');
      // Borda interna: branco-quente (faixa fina e intensa)
      grad.addColorStop(rInner,          'rgba(255,250,235,1)');
      grad.addColorStop(rInner + 0.025,  'rgba(255,220,100,1)');
      // Amarelo-laranja
      grad.addColorStop(rInner + 0.07,   'rgba(255,140,40,0.95)');
      // Laranja avermelhado
      grad.addColorStop(rInner + 0.15,   'rgba(220,60,20,0.85)');
      // Magenta
      grad.addColorStop(rInner + 0.30,   'rgba(200,30,160,0.65)');
      // Violeta largo e suave
      grad.addColorStop(rInner + 0.52,   'rgba(80,20,160,0.35)');
      // Transparente na borda
      grad.addColorStop(1, 'rgba(40,0,80,0)');

      g.fillStyle = grad;
      g.fillRect(0, 0, 512, 512);
    });
    return accretionDiskTex;
  }

  N.centerBuilders.blackhole = function (systemData, parent) {
    const center = systemData.center || {};
    const variant = center.variant || 'self';
    const systemId = systemData.id;
    const group = new THREE.Group();

    if (variant === 'self') {
      // ═════════════════════════════════════════════════════════════════
      // 1. O EU (supermassivo, escuro, inalcançável)
      // Raio: 8000 UC / 2 * 0.001 = 4.0 u  (N.scale.raio('eu'))
      // ═════════════════════════════════════════════════════════════════
      const raioEu = N.scale ? N.scale.raio('eu') : 4.0; // 4.0 u
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

      // Disco de acreção estilizado em faixas com traços em arco
      const menorDistanciaSistema = 51.35; // distância ao sistema 'criacao' [48,3,18]
      const raioMaximoSeguro = menorDistanciaSistema * 0.7; // ~35.94
      const raioExt = Math.min(raioEu * 4.4, raioMaximoSeguro);

      const disco = N.buildAccretionDisk({
        raioInterno:  raioEu * 1.25,
        raioExterno:  raioExt,
        paleta:       [0xFFF3A8, 0xFFD84A, 0xFF9A1F, 0xD9632B, 0x9A3F6E, 0x5B2A9E, 0x3B2478],
        paletaTracos: [0xFFFFFF, 0xFFE9A0, 0xFFB347, 0xB77CF0],
        semente:      systemId,
        inclinacao:   { rx: Math.PI / 2 - 0.25, ry: 0.1, rz: 0 }
      });
      group.add(disco.object);

      parent.add(group);

      return {
        object: group,
        update(dt) {
          disco.update(dt);
        }
      };
    }

    // ═════════════════════════════════════════════════════════════════
    // 2. TRAUMA (estelar, A perda da mãe)
    // Raio: 700 UC / 2 * 0.001 = 0.35 u  (N.scale.raio('buracoNegroEstelar'))
    // ═════════════════════════════════════════════════════════════════
    const raioTrauma = N.scale ? N.scale.raio('buracoNegroEstelar') : 0.35; // 0.35 u
    group.userData.pickId = systemId;

    // Esfera preta central
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(raioTrauma, 40, 28),
      new THREE.MeshBasicMaterial({ color: 0x020005 })
    );
    sphere.userData.pickId = systemId;
    group.add(sphere);

    // Alvo invisível cobrindo o disco de acreção para clique
    const hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(raioTrauma * 4.5, 16, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitSphere.userData.pickId = systemId;
    group.add(hitSphere);

    // Disco de acreção estilizado em faixas concêntricas (A perda da mãe)
    const discoTrauma = N.buildAccretionDisk({
      raioInterno:  raioTrauma * 1.25,
      raioExterno:  raioTrauma * 4.4,
      paleta:       [0xFF9A9A, 0xFF7AA8, 0xE0309A, 0xB03BC8, 0x7B3FD0, 0x4A2A9A, 0x2E2070],
      paletaTracos: [0xFFD6E4, 0xFFB5CF, 0xF0A0FF, 0xB89CFF],
      semente:      systemId,
      inclinacao:   { rx: Math.PI / 2 - 0.35, ry: 0, rz: 0.15 },
      velocidades:  [0.08, 0.048, 0.024] // velocidades um pouco maiores que O Eu
    });
    group.add(discoTrauma.object);

    parent.add(group);

    let tempo = 0;

    return {
      object: group,
      update(dt) {
        tempo += dt;

        // Parâmetro animável 'disk' (0 a 1) do capítulo atual
        let diskParam = N.state ? N.state.get(systemId, 'disk') : 1.0;
        if (diskParam === undefined || diskParam === null) diskParam = 1.0;

        // Pulsação muito leve (~3% na escala)
        const pulse = 1.0 + 0.03 * Math.sin(tempo * 1.8);
        discoTrauma.object.scale.set(pulse, pulse, pulse);

        // Controla a presença/brilho do disco via cor (0.35 + 0.65 * disk) sem mexer na opacidade
        const colorFactor = 0.35 + 0.65 * diskParam;
        discoTrauma.object.children.forEach((pivot) => {
          if (pivot.children && pivot.children[0] && pivot.children[0].material) {
            pivot.children[0].material.color.setScalar(colorFactor);
          }
        });

        // Atualiza a rotação dos anéis
        discoTrauma.update(dt);
      }
    };
  };
})();
