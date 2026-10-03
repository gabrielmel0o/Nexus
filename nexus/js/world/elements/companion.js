/* elements/companion.js — estrela companheira em órbita circular estável ao redor do SISTEMA.
   Registra-se em NEXUS.elementBuilders['companion'].

   O construtor recebe os dados do orbitante (el) e do planeta (neste caso, o sistema que
   chamou; system.js passa o systemData como segundo argumento para orbitantes).
   Usa o mesmo visual de sun.js (variante por spectral), mas é construído aqui de forma
   independente (sem PointLight) e orbita o centro do sistema.

   Dados esperados no orbitante:
     spectral — 'redDwarf' etc. (usa as mesmas configurações de sun.js)
     orbit    — raio da órbita circular ao redor do centro
     speed    — velocidade angular (rad/s) */
(function () {
  var N = NEXUS;
  N.elementBuilders = N.elementBuilders || {};

  // Configurações por tipo espectral (mesmos valores de sun.js)
  var VARIANTES = {
    sun:        { raio: 4,   glow1: 24, glow2: 48, opac1: .95, opac2: .4,  manchas: 40 },
    redDwarf:   { raio: 1.4, glow1: 8,  glow2: 16, opac1: .7,  opac2: .25, manchas: 20 },
    whiteDwarf: { raio: 1.0, glow1: 5,  glow2: 9,  opac1: .85, opac2: .3,  manchas: 12 },
    brownDwarf: { raio: 1.4, glow1: 5,  glow2: 10, opac1: .35, opac2: .12, manchas: 15 }
  };

  // Gera rgba a partir de THREE.Color
  function rgbaC(col, k, a) {
    var r = Math.round((col.r + (1 - col.r) * k) * 255);
    var g = Math.round((col.g + (1 - col.g) * k) * 255);
    var b = Math.round((col.b + (1 - col.b) * k) * 255);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  N.elementBuilders.companion = function (el, contexto) {
    var spectral = el.spectral || 'redDwarf';
    var v = VARIANTES[spectral] || VARIANTES.redDwarf;

    // Cor: usa a cor da variante do mock (colors do CONTEXT, seção 9)
    var CORES = {
      redDwarf:   { color: '#e5533d', patch: ['#f07050', '#c03020', '#ff8a70'] },
      whiteDwarf: { color: '#cfe8ff', patch: ['#e8f4ff', '#b8d8f8', '#a0c8f0'] },
      brownDwarf: { color: '#8a4b3a', patch: ['#a06040', '#6a3525', '#c07050'] },
      sun:        { color: '#ffb020', patch: ['#ffd43b', '#ff8a1f', '#fff3a0'] }
    };
    var cores = CORES[spectral] || CORES.redDwarf;
    var col = new THREE.Color(cores.color);

    // ── Esfera com manchas ───────────────────────────────────────────────
    var esfera = new THREE.Mesh(
      new THREE.SphereGeometry(v.raio, 32, 24),
      new THREE.MeshBasicMaterial({
        map: N.makeTexture(256, 128, function (g, w, h) {
          g.fillStyle = cores.color; g.fillRect(0, 0, w, h);
          N.blobs(g, w, h, cores.patch, v.manchas);
        })
      })
    );

    // ── Glow ─────────────────────────────────────────────────────────────
    var glowTex = N.makeTexture(128, 128, function (g) {
      var r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, rgbaC(col, .35, 1));
      r.addColorStop(.35, rgbaC(col, 0, .35));
      r.addColorStop(1, rgbaC(col, 0, 0));
      g.fillStyle = r;
      g.fillRect(0, 0, 128, 128);
    });

    var makeGlow = function (tam, opac) {
      var mat = new THREE.SpriteMaterial({
        map: glowTex, blending: THREE.AdditiveBlending,
        transparent: true, opacity: opac, depthWrite: false
      });
      var s = new THREE.Sprite(mat);
      s.scale.set(tam, tam, 1);
      return s;
    };

    // ── Pivô orbital ─────────────────────────────────────────────────────
    // O pivô fica no centro do sistema; girar o pivô faz a estrela orbitar.
    var pivo = new THREE.Group();
    var corpo = new THREE.Group();
    corpo.userData.pickId = el.id;
    esfera.userData.pickId = el.id;
    corpo.add(esfera, makeGlow(v.glow1, v.opac1), makeGlow(v.glow2, v.opac2));

    // Alvo invisível para clique na estrela companheira
    var hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(v.raio * 2.2, 3.5), 16, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitSphere.userData.pickId = el.id;
    corpo.add(hitSphere);

    // Afasta o corpo do centro pela distância orbital
    var orbitDist = el.orbit || 9;
    corpo.position.x = orbitDist;
    pivo.add(corpo);

    // Inclina levemente a órbita para não ficar chapada
    pivo.rotation.x = 0.2;
    pivo.rotation.z = 0.15;

    var velocidade = el.speed || 0.4;
    var angulo = 0;

    // Linha de órbita da estrela companheira
    var cPts = [];
    for (var i = 0; i <= 64; i++) {
      var a = (i / 64) * Math.PI * 2;
      cPts.push(new THREE.Vector3(Math.cos(a) * orbitDist, 0, Math.sin(a) * orbitDist));
    }
    var cGeo = new THREE.BufferGeometry().setFromPoints(cPts);
    var cMat = N.createOrbitMaterial ? N.createOrbitMaterial(col.getHex()) : new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.2 });
    var cOrbitLine = new THREE.Line(cGeo, cMat);
    pivo.add(cOrbitLine);

    if (N.registerOrbit) {
      var compWP = new THREE.Vector3();
      N.registerOrbit({
        line: cOrbitLine,
        category: 'major',
        getBodyPos: function () {
          corpo.getWorldPosition(compWP);
          return compWP;
        },
        getPhase: function () {
          return angulo / (Math.PI * 2);
        }
      });
    }

    return {
      object: pivo,
      update: function (dt) {
        angulo += velocidade * dt;
        corpo.position.x = Math.cos(angulo) * orbitDist;
        corpo.position.z = Math.sin(angulo) * orbitDist;
        esfera.rotation.y += dt * 0.08;
      }
    };
  };
})();
