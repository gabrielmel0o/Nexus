/* elements/comet.js — elemento do tipo 'comet' (A PROPOSTA): um cometa que se aproxima
   do planeta da Carreira ao longo da narrativa.
   Registra-se em NEXUS.elementBuilders['comet'].

   Dados esperados no elemento:
     id       — identificador único (ex: 'proposta')
     params   — { approach: 0-1, appear: 0-1 }

   REGRA IMPORTANTE: NÃO anima material.opacity (o LOD controla).
   O cometa é a exceção que emite luz: apenas a cauda e os traços usam blending aditivo.
*/
(function () {
  var N = NEXUS;
  N.elementBuilders = N.elementBuilders || {};

  // ─── Constantes visuais ───────────────────────────────────────────────────
  var COR_NUCLEO  = '#db2777'; // rosa-magenta / roxo vivo saturado (estilo ilustração)
  var COR_CAMADA1 = 0xffa07a; // Laranja-pêssego suave (camada larga)
  var COR_CAMADA2 = 0xf43f5e; // Rosa (camada média)
  var COR_CAMADA3 = 0xfff0f5; // Quase branca (camada estreita)

  var RAIO_NUCLEO = 0.6;      // Escala ~1.6× a original (0.38 × 1.6 ≈ 0.6)
  var COMP_CAUDA  = 3.6;      // ~3× o diâmetro da cabeça (diâmetro = 1.2 → 3.6)

  // Órbita em relação ao planeta
  var DIST_LONGE  = 7.0;
  var DIST_PERTO  = 2.4;
  var VEL_ORBITA  = 0.18;

  // Função auxiliar para gerar geometria de plano afunilado cruzado em 3D (formato X)
  function createTaperedPlaneGeo(wHead, wTip, length) {
    var geo = new THREE.BufferGeometry();
    var vertices = new Float32Array([
      // Plano 1 (XY)
      0,  wHead / 2, 0,
      0, -wHead / 2, 0,
      length,  wTip / 2, 0,
      length, -wTip / 2, 0,
      // Plano 2 (XZ)
      0, 0,  wHead / 2,
      0, 0, -wHead / 2,
      length, 0,  wTip / 2,
      length, 0, -wTip / 2
    ]);
    var indices = [
      0, 1, 2,  2, 1, 3,
      4, 5, 6,  6, 5, 7
    ];
    var uvs = new Float32Array([
      0, 1,  0, 0,  1, 1,  1, 0,
      0, 1,  0, 0,  1, 1,  1, 0
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  N.elementBuilders.comet = function (el, planeta) {
    var h = 0;
    var id = el.id || 'proposta';
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
    var seed = h / 100000;

    // ── Grupo raiz do cometa ──────────────────────────────────────────────
    var grupo = new THREE.Group();

    // ── Esfera invisível exclusiva para raycaster / interação ─────────────
    var hitGeo = new THREE.SphereGeometry(RAIO_NUCLEO * 3.0, 16, 12);
    var hitMat = new THREE.MeshBasicMaterial({ visible: false });
    var hit = new THREE.Mesh(hitGeo, hitMat);
    hit.userData.pickId = id; // Somente a esfera de hit responde ao picking
    grupo.add(hit);

    // ── Grupo Visual (escala no hover com lerp) ───────────────────────────
    var visualGroup = new THREE.Group();
    grupo.add(visualGroup);

    // 1. Núcleo: rocha facetada com cor rosa-magenta/roxo vivo
    var nucleoGeo = new THREE.IcosahedronGeometry(RAIO_NUCLEO, 0).toNonIndexed();
    nucleoGeo.computeVertexNormals();
    var nucleoMat = new THREE.MeshToonMaterial({
      color: COR_NUCLEO,
      gradientMap: N.toon
    });
    var nucleo = new THREE.Mesh(nucleoGeo, nucleoMat);
    nucleo.rotation.set(seed * 6.28, seed * 3.14, 0);
    visualGroup.add(nucleo);

    // 2. Cauda: 3 camadas empilhadas afuniladas
    var tailGroup = new THREE.Group();
    visualGroup.add(tailGroup);

    // Camada 1: Larga (laranja-pêssego)
    var geo1 = createTaperedPlaneGeo(RAIO_NUCLEO * 1.5, 0.08, COMP_CAUDA);
    var mat1 = new THREE.MeshBasicMaterial({
      color: COR_CAMADA1,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    var mesh1 = new THREE.Mesh(geo1, mat1);
    tailGroup.add(mesh1);

    // Camada 2: Média (rosa)
    var geo2 = createTaperedPlaneGeo(RAIO_NUCLEO * 0.95, 0.04, COMP_CAUDA * 0.92);
    var mat2 = new THREE.MeshBasicMaterial({
      color: COR_CAMADA2,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    var mesh2 = new THREE.Mesh(geo2, mat2);
    tailGroup.add(mesh2);

    // Camada 3: Estreita (quase branca)
    var geo3 = createTaperedPlaneGeo(RAIO_NUCLEO * 0.5, 0.02, COMP_CAUDA * 0.85);
    var mat3 = new THREE.MeshBasicMaterial({
      color: COR_CAMADA3,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    var mesh3 = new THREE.Mesh(geo3, mat3);
    tailGroup.add(mesh3);

    // 3. Traços de velocidade: 5 linhas brancas paralelas deslizando em loop
    var streaks = [];
    var NUM_STREAKS = 5;
    for (var s = 0; s < NUM_STREAKS; s++) {
      var sAngle = (s / NUM_STREAKS) * Math.PI * 2;
      var sOffR = 0.1 + (s % 3) * 0.08;
      var sLen = 0.6 + (s % 2) * 0.4;
      var pts = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(sLen, 0, 0)
      ];
      var sGeo = new THREE.BufferGeometry().setFromPoints(pts);
      var sMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      var line = new THREE.Line(sGeo, sMat);
      line.position.set(0, Math.cos(sAngle) * sOffR, Math.sin(sAngle) * sOffR);
      tailGroup.add(line);

      streaks.push({
        line: line,
        speed: 2.2 + (s % 3) * 0.6,
        startDist: (s / NUM_STREAKS) * COMP_CAUDA
      });
    }

    // ── Pivô de órbita ───────────────────────────────────────────────────
    var pivo = new THREE.Group();
    pivo.rotation.x = 0.3 + seed * 0.4;
    pivo.rotation.z = seed * 1.57;

    grupo.position.x = DIST_LONGE;
    pivo.add(grupo);

    var angle = seed * Math.PI * 2;
    var label = N.createLabel(el.title || 'A proposta', id);

    // Registra no mapa de seleção
    var cometaWP = new THREE.Vector3();
    N.pickRegistry = N.pickRegistry || {};
    N.pickRegistry[id] = {
      getPos: function () {
        grupo.getWorldPosition(cometaWP);
        return cometaWP;
      },
      radius: RAIO_NUCLEO * 3.0
    };

    var qTail = new THREE.Quaternion();
    var eixoX = new THREE.Vector3(1, 0, 0);
    var t = 0;
    var curHoverScale = 1.0;

    return {
      object: pivo,
      update: function (dt, nomes) {
        t += dt;

        // Lê parâmetros do state
        var approach = 0.1;
        var appear   = 1.0;
        if (N.state) {
          approach = N.state.get(id, 'approach');
          appear   = N.state.get(id, 'appear');
          if (approach === 0 && el.params && el.params.approach !== undefined) {
            if (!N.state.current[id] || N.state.current[id].approach === undefined) approach = el.params.approach;
          }
          if (appear === 0 && el.params && el.params.appear !== undefined) {
            if (!N.state.current[id] || N.state.current[id].appear === undefined) appear = el.params.appear;
          }
        } else if (el.params) {
          approach = el.params.approach !== undefined ? el.params.approach : approach;
          appear   = el.params.appear   !== undefined ? el.params.appear   : appear;
        }

        // 1. Distância e movimento orbital
        var dist = DIST_LONGE + (DIST_PERTO - DIST_LONGE) * approach;
        var vel = VEL_ORBITA * (1.0 + approach * 0.6);
        angle += vel * dt;

        grupo.position.x = Math.cos(angle) * dist;
        grupo.position.z = Math.sin(angle) * dist;
        grupo.position.y = 0;

        // Rotação axial do núcleo
        nucleo.rotation.y += dt * 0.22;
        nucleo.rotation.x += dt * 0.09;

        // 2. Cauda aponta SEMPRE no sentido oposto à velocidade (tangente da órbita)
        // Tangente de velocidade: (-sin(angle), 0, cos(angle))
        // Oposto à velocidade: (sin(angle), 0, -cos(angle))
        var dirOpposite = new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle));
        qTail.setFromUnitVectors(eixoX, dirOpposite);
        tailGroup.quaternion.copy(qTail);

        // 3. Respiração (oscilação senoidal suave ±6%)
        var breath = 1.0 + 0.06 * Math.sin(t * 1.5);
        var compFator = 0.6 + approach * 0.4;
        tailGroup.scale.set(breath * compFator, breath, breath);

        // 4. Traços de velocidade deslizando lentamente para trás em loop
        var maxTailLen = COMP_CAUDA * compFator;
        for (var k = 0; k < streaks.length; k++) {
          var st = streaks[k];
          var posX = (st.startDist + t * st.speed) % maxTailLen;
          st.line.position.x = posX;
        }

        // 5. Interação / Hover (escala de ~1.15× com lerp suave)
        var isHovered = (N.hoveredId === id);
        var targetHoverScale = isHovered ? 1.15 : 1.0;
        curHoverScale += (targetHoverScale - curHoverScale) * (1 - Math.exp(-dt * 8));

        var finalVisScale = Math.max(appear, 0) * curHoverScale;
        visualGroup.scale.set(finalVisScale, finalVisScale, finalVisScale);

        var escPivo = Math.max(appear, 0);
        pivo.scale.set(escPivo, escPivo, escPivo);

        // 6. Atualização do rótulo (obedece o LOD 'nomes' por distância)
        if (label && N.cam) {
          var lodNomes = (typeof nomes === 'number') ? nomes : 0;
          var alphaLabel = lodNomes * Math.max(appear, 0);
          N.updateLabel(label, nucleo, RAIO_NUCLEO, alphaLabel);
        }
      }
    };
  };

})();
