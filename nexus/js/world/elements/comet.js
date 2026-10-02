/* elements/comet.js — elemento do tipo 'comet' (A PROPOSTA): um cometa que se aproxima
   do planeta da Carreira ao longo da narrativa.
   Registra-se em NEXUS.elementBuilders['comet'].

   Dados esperados no elemento:
     id       — identificador único (ex: 'proposta')
     params   — { approach: 0-1, appear: 0-1 }
                approach: 0 = longe (órbita ampla), 1 = encostando (órbita apertada)
                appear:   0 = ausente (escala 0), 1 = normal

   REGRA IMPORTANTE: NÃO anima material.opacity (o LOD controla).
   A cauda usa escala e cor aditiva. O appear usa escala total do grupo.

   Visual (estilo Outer Wilds, toon):
     - Núcleo: rocha de poucas faces (IcosahedronGeometry facetada) cinza-alaranjada
     - Cauda: 5 sprites aditivos azul-claro apontando para longe do planeta
     - Sem PointLight, sem fotorrealismo */
(function () {
  var N = NEXUS;
  N.elementBuilders = N.elementBuilders || {};

  // ─── Constantes visuais ───────────────────────────────────────────────────
  var COR_NUCLEO   = '#b8a090'; // cinza-alaranjado: rocha fria com toque quente
  var COR_CAUDA    = 0x88ddff;  // azul-claro: cauda de gás e poeira estilo Outer Wilds
  var RAIO_NUCLEO  = 0.38;      // raio da rocha (pequeno em relação ao planeta)

  // Órbita: distância em relação ao centro do planeta conforme approach
  // approach=0 → órbita ampla (longe), approach=1 → órbita apertada (perto)
  var DIST_LONGE   = 7.0;   // distância quando approach ≈ 0
  var DIST_PERTO   = 2.4;   // distância quando approach ≈ 1

  // Ângulo em que o cometa viaja ao redor do planeta (fixo; a distância varia)
  var VEL_ORBITA   = 0.18;  // rad/s na órbita normal

  N.elementBuilders.comet = function (el, planeta) {
    // Semente determinística para ângulo inicial fixo entre sessões
    var h = 0;
    var id = el.id || 'proposta';
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
    var seed = h / 100000;

    // ── Grupo raiz do cometa (filho direto do grupo do planeta) ───────────
    var grupo = new THREE.Group();
    grupo.userData.pickId = id;

    // ── 1. Núcleo: rocha facetada de poucas faces (IcosahedronGeometry) ──
    var nucleoGeo = new THREE.IcosahedronGeometry(RAIO_NUCLEO, 0).toNonIndexed(); // detail=0 + toNonIndexed = 20 faces planas
    nucleoGeo.computeVertexNormals();
    var nucleoMat = new THREE.MeshToonMaterial({
      color: COR_NUCLEO,
      gradientMap: N.toon
    });
    var nucleo = new THREE.Mesh(nucleoGeo, nucleoMat);
    nucleo.userData.pickId = id;
    // Rotação determinística para que o cometa sempre abra igual
    nucleo.rotation.set(seed * 6.28, seed * 3.14, 0);
    grupo.add(nucleo);

    // Alvo invisível levemente maior para facilitar o clique
    var hit = new THREE.Mesh(
      new THREE.SphereGeometry(RAIO_NUCLEO * 2.8, 12, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hit.userData.pickId = id;
    grupo.add(hit);

    // Rótulo com o nome do cometa (vinculado ao id para highlight e picking)
    var label = N.createLabel(el.title || 'A proposta', id);

    // ── 2. Cauda: sprites aditivos azul-claro ─────────────────────────────
    // Cada sprite é colocado ATRÁS do núcleo (direção +X no espaço local do grupo).
    // Ao apontar o grupo para longe do planeta (updateTail), a cauda fica oposta.
    var caudaSprites = [];
    var NUM_SPRITES = 5;
    for (var s = 0; s < NUM_SPRITES; s++) {
      var frac = (s + 1) / NUM_SPRITES;  // 0.2 a 1.0 — posição ao longo da cauda
      var tam  = RAIO_NUCLEO * (1.6 - frac * 0.9); // encolhe ao longo da cauda
      var caudaMat = new THREE.SpriteMaterial({
        map: N.sparkTexture(),
        color: COR_CAUDA,
        transparent: true,
        opacity: 0.72 - frac * 0.55, // mais opaco perto do núcleo, quase invisível na ponta
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      var caudaSprite = new THREE.Sprite(caudaMat);
      // Posição ao longo do eixo local +X (a cauda cresce nessa direção; depois invertemos)
      caudaSprite.position.x = RAIO_NUCLEO * 0.6 + frac * 2.0;
      caudaSprite.scale.set(tam, tam, 1);
      grupo.add(caudaSprite);
      caudaSprites.push({ sprite: caudaSprite, mat: caudaMat, tamBase: tam, posBase: caudaSprite.position.x });
    }

    // ── Pivô de órbita: coloca o grupo numa órbita inclinada ao redor do planeta ──
    var pivo = new THREE.Group();
    pivo.rotation.x = 0.3 + seed * 0.4;  // inclinação da órbita: dá profundidade
    pivo.rotation.z = seed * 1.57;

    grupo.position.x = DIST_LONGE; // posição inicial: longe do planeta
    pivo.add(grupo);

    // Ângulo orbital inicial (determinístico)
    var angle = seed * Math.PI * 2;

    // Registra o cometa no mapa de seleção (segue o grupo/núcleo no mundo)
    var cometaWP = new THREE.Vector3();
    N.pickRegistry = N.pickRegistry || {};
    N.pickRegistry[id] = {
      getPos: function () {
        grupo.getWorldPosition(cometaWP);
        return cometaWP;
      },
      radius: RAIO_NUCLEO * 1.5
    };

    // Vetores temporários reutilizados para calcular a direção planetocêntrica
    var dirLocal = new THREE.Vector3();
    var eixoX    = new THREE.Vector3(1, 0, 0);
    var qTail    = new THREE.Quaternion();

    // ── Atualiza a cauda para apontar sempre para longe do planeta ────────
    function atualizaTail() {
      // No espaço local do pivô (centro do planeta), a direção para longe do planeta
      // é exatamente o vetor radial (cos(angle), 0, sin(angle)).
      dirLocal.set(Math.cos(angle), 0, Math.sin(angle));
      qTail.setFromUnitVectors(eixoX, dirLocal);
      grupo.quaternion.copy(qTail);
    }

    var t = 0;

    return {
      object: pivo,
      update: function (dt) {
        t += dt;

        // ── Lê parâmetros do state ──────────────────────────────────────
        var approach = 0.1;
        var appear   = 1.0;
        if (N.state) {
          approach = N.state.get(id, 'approach');
          appear   = N.state.get(id, 'appear');
          // Fallback para valores iniciais do mock se state ainda não foi inicializado
          if (approach === 0 && el.params && el.params.approach !== undefined) {
            if (!N.state.current[id] || N.state.current[id].approach === undefined) {
              approach = el.params.approach;
            }
          }
          if (appear === 0 && el.params && el.params.appear !== undefined) {
            if (!N.state.current[id] || N.state.current[id].appear === undefined) {
              appear = el.params.appear;
            }
          }
        } else if (el.params) {
          approach = el.params.approach !== undefined ? el.params.approach : approach;
          appear   = el.params.appear   !== undefined ? el.params.appear   : appear;
        }

        // ── 1. Distância ao planeta interpolada por approach ────────────
        var dist = DIST_LONGE + (DIST_PERTO - DIST_LONGE) * approach;

        // ── 2. Movimento orbital ao redor do planeta ────────────────────
        // Velocidade cresce levemente quando mais perto (como um cometa real)
        var vel = VEL_ORBITA * (1.0 + approach * 0.6);
        angle += vel * dt;

        grupo.position.x = Math.cos(angle) * dist;
        grupo.position.z = Math.sin(angle) * dist;
        grupo.position.y = 0; // o pivô já está inclinado

        // ── 3. Rotação sutil do núcleo ───────────────────────────────────
        nucleo.rotation.y += dt * 0.22;
        nucleo.rotation.x += dt * 0.09;

        // ── 4. Cauda aponta para longe do planeta ───────────────────────
        atualizaTail();

        // ── 5. Pulsação sutil no comprimento da cauda (gelo sublimando) ─
        var pulso = 1.0 + 0.08 * Math.sin(t * 1.8);
        for (var s = 0; s < caudaSprites.length; s++) {
          var c = caudaSprites[s];
          var frac2 = (s + 1) / NUM_SPRITES;

          // Comprimento proporcional a approach (quando longe, cauda menor)
          var compFator = 0.5 + approach * 0.5; // 0.5 a 1.0
          var novaTam = c.tamBase * appear * pulso;
          c.sprite.scale.set(novaTam, novaTam, 1);

          // Reposiciona ao longo do eixo +X com variação de approach
          c.sprite.position.x = RAIO_NUCLEO * 0.6 + frac2 * 2.0 * compFator;

          // Cor: escurece quando aparecer é < 1 (sem mexer em opacity — LOD controla)
          c.mat.color.setHex(COR_CAUDA);
          c.mat.color.multiplyScalar(Math.max(appear, 0.001));
        }

        // ── 6. Escala total do grupo pelo appear ────────────────────────
        // appear = 0 → escala 0 (ausente); appear = 1 → escala normal
        // NUNCA mexemos em material.opacity — o LOD é dono disso.
        var esc = Math.max(appear, 0);
        pivo.scale.set(esc, esc, esc);

        // ── 7. Atualiza rótulo flutuante ─────────────────────────────────
        if (label && N.cam) {
          var alphaLabel = appear > 0.05 ? 1 : 0;
          N.updateLabel(label, nucleo, RAIO_NUCLEO, alphaLabel);
        }
      }
    };
  };

})();
