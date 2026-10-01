/* binary.js — centro do tipo 'binary': duas estrelas orbitando o centro de massa.
   Registra-se em NEXUS.centerBuilders['binary'].

   Dados esperados em center:
     colorA, patchA — cor e manchas da estrela A (desejo)
     colorB, patchB — cor e manchas da estrela B (segurança)
     params.tension — 0 (afastadas e lentas) a 1 (muito próximas e rápidas)

   Distância e velocidade da órbita mútua variam suavemente pelo tension do state.
   Sem PointLight: system.js só cria luz em sistemas com planetas. */
(function () {
  var N = NEXUS;
  N.centerBuilders = N.centerBuilders || {};

  // ── Ajustes ────────────────────────────────────────────────────────────────
  var RAIO_ESTRELA = 2.2;       // cada estrela tem esse raio
  var DIST_MIN     = 3.2;       // distância mínima do centro (tension=1, quase se tocam)
  var DIST_MAX     = 8.0;       // distância máxima do centro (tension=0, afastadas)
  var VEL_MIN      = 0.15;      // velocidade angular mínima (rad/s, tension=0)
  var VEL_MAX      = 1.2;       // velocidade angular máxima (rad/s, tension=1)
  var GLOW_TAM     = 12;        // tamanho do sprite de glow
  var GLOW_OPAC    = 0.6;       // opacidade base do glow
  var MANCHAS      = 25;        // quantas manchas na textura de cada estrela

  // Gera rgba a partir de THREE.Color
  function rgba(col, k, a) {
    var r = Math.round((col.r + (1 - col.r) * k) * 255);
    var g = Math.round((col.g + (1 - col.g) * k) * 255);
    var b = Math.round((col.b + (1 - col.b) * k) * 255);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  // Cria uma estrela (esfera + glow) e devolve o grupo e os materiais
  function criarEstrela(cor, patch) {
    var col = new THREE.Color(cor);
    var grupo = new THREE.Group();

    // Esfera com manchas
    var esfera = new THREE.Mesh(
      new THREE.SphereGeometry(RAIO_ESTRELA, 48, 32),
      new THREE.MeshBasicMaterial({
        map: N.makeTexture(512, 256, function (g, w, h) {
          g.fillStyle = cor; g.fillRect(0, 0, w, h);
          N.blobs(g, w, h, patch, MANCHAS);
        })
      })
    );

    // Glow
    var glowTex = N.makeTexture(128, 128, function (g) {
      var r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, rgba(col, .35, 1));
      r.addColorStop(.35, rgba(col, 0, .35));
      r.addColorStop(1, rgba(col, 0, 0));
      g.fillStyle = r;
      g.fillRect(0, 0, 128, 128);
    });
    var glowMat = new THREE.SpriteMaterial({
      map: glowTex, blending: THREE.AdditiveBlending,
      transparent: true, opacity: GLOW_OPAC, depthWrite: false
    });
    var glow = new THREE.Sprite(glowMat);
    glow.scale.set(GLOW_TAM, GLOW_TAM, 1);

    grupo.add(esfera, glow);
    return { grupo: grupo, esfera: esfera, glowMat: glowMat };
  }

  // ── O builder ──────────────────────────────────────────────────────────────
  N.centerBuilders.binary = function (systemData, parent) {
    var center = systemData.center || {};
    var systemId = systemData.id;

    // Cria as duas estrelas
    var estA = criarEstrela(
      center.colorA || '#ff6b6b',
      center.patchA || ['#ffa8a8', '#e03131', '#ffe3e3']
    );
    var estB = criarEstrela(
      center.colorB || '#74c0fc',
      center.patchB || ['#d0ebff', '#339af0', '#a5d8ff']
    );

    // Pivô que gira e carrega as duas estrelas em lados opostos
    var pivo = new THREE.Group();
    pivo.userData.pickId = systemId;
    estA.esfera.userData.pickId = systemId;
    estB.esfera.userData.pickId = systemId;
    pivo.add(estA.grupo);
    pivo.add(estB.grupo);

    // Alvo invisível amplo cobrindo a região entre as duas estrelas
    var hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(DIST_MAX + RAIO_ESTRELA * 1.5, 16, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitSphere.userData.pickId = systemId;
    pivo.add(hitSphere);

    // Leve inclinação para a órbita não ficar perfeitamente horizontal
    pivo.rotation.x = 0.3;

    parent.add(pivo);

    var angulo = 0;

    return {
      object: pivo,
      update: function (dt) {
        // Realce de hover
        var isHov = (N.hoveredId === systemId);
        pivo.scale.setScalar(isHov ? 1.06 : 1.0);

        // Lê a tensão do state (0 a 1)
        var tension = N.state.get(systemId, 'tension');

        // Distância de cada estrela ao centro de massa (opostas: A de um lado, B do outro)
        var dist = DIST_MAX - (DIST_MAX - DIST_MIN) * tension;

        // Velocidade angular
        var vel = VEL_MIN + (VEL_MAX - VEL_MIN) * tension;

        // Avança o ângulo
        angulo += vel * dt;

        // Posiciona A e B em lados opostos
        estA.grupo.position.set(Math.cos(angulo) * dist, 0, Math.sin(angulo) * dist);
        estB.grupo.position.set(Math.cos(angulo + Math.PI) * dist, 0, Math.sin(angulo + Math.PI) * dist);

        // Gira as esferas no próprio eixo
        estA.esfera.rotation.y += dt * 0.06;
        estB.esfera.rotation.y += dt * 0.04;
      }
    };
  };
})();
