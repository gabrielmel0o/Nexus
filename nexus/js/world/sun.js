/* sun.js — estrela central, com variantes por spectral.
   Registra-se em NEXUS.centerBuilders['star'].

   Variantes:
     'sun'        (padrão) — tamanho 4, glow generoso, manchas coloridas
     'redDwarf'   — pequena (~0,35× Sol), vermelha, brilho suave
     'whiteDwarf' — minúscula (~0,25×), branco-azulada→dourada (tone), halo fino + ondas
     'brownDwarf' — pequena, marrom-avermelhada, quase sem brilho

   O brilho (glow e luz) vem de state.get(id, 'brightness') a cada quadro.
   A cor da anã branca vem de state.get(id, 'tone') a cada quadro.
   A PointLight é criada por system.js, não aqui. */
(function () {
  var N = NEXUS;

  // Garante que o mapa de builders existe
  N.centerBuilders = N.centerBuilders || {};

  // ── Configurações por variante ────────────────────────────────────────────
  // Raios calculados a partir da tabela de diâmetros em UC (js/core/scale.js).
  // glow1 e glow2 são múltiplos do raio para manter proporções; os valores absolutos
  // eram hardcoded nas unidades antigas — agora escalam juntos.
  function variantesSun() {
    var N = NEXUS;
    var rSun  = N.scale ? N.scale.raio('estrelaPadrao')  : 4.0;   // 1.2 u
    var rRed  = N.scale ? N.scale.raio('anaVermelha')    : 1.4;   // 0.6 u
    var rWhite= N.scale ? N.scale.raio('anaBranca')      : 1.0;   // 0.24 u
    var rBrown= N.scale ? N.scale.raio('anaBrancaMarrom'): 1.4;   // 0.6 u (= anaVermelha)
    return {
      sun:        { raio: rSun,   glow1: rSun*6,    glow2: rSun*12,   opac1: .95, opac2: .4,  manchas: 40 },
      redDwarf:   { raio: rRed,   glow1: rRed*5.7,  glow2: rRed*11.4, opac1: .7,  opac2: .25, manchas: 20 },
      whiteDwarf: { raio: rWhite, glow1: rWhite*5,  glow2: rWhite*9,  opac1: .85, opac2: .3,  manchas: 12 },
      brownDwarf: { raio: rBrown, glow1: rBrown*3.6,glow2: rBrown*7.1,opac1: .35, opac2: .12, manchas: 15 }
    };
  }
  var VARIANTES = variantesSun();


  // Mistura duas cores por um fator t (0 a 1)
  function lerpColor(hexA, hexB, t) {
    var a = new THREE.Color(hexA);
    var b = new THREE.Color(hexB);
    return a.lerp(b, t);
  }

  // Gera a string rgba a partir de um THREE.Color
  function rgbaFromColor(col, clarear, alpha) {
    var r = Math.round((col.r + (1 - col.r) * clarear) * 255);
    var g = Math.round((col.g + (1 - col.g) * clarear) * 255);
    var b = Math.round((col.b + (1 - col.b) * clarear) * 255);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // Cria a textura de glow (círculo radial com degradê)
  function makeGlowTex(col) {
    return N.makeTexture(128, 128, function (g) {
      var r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, rgbaFromColor(col, .35, 1));
      r.addColorStop(.35, rgbaFromColor(col, 0, .35));
      r.addColorStop(1, rgbaFromColor(col, 0, 0));
      g.fillStyle = r;
      g.fillRect(0, 0, 128, 128);
    });
  }

  // Cria um sprite de glow
  function makeGlowSprite(tex, tamanho, opacidade) {
    var mat = new THREE.SpriteMaterial({
      map: tex, blending: THREE.AdditiveBlending,
      transparent: true, opacity: opacidade, depthWrite: false
    });
    var s = new THREE.Sprite(mat);
    s.scale.set(tamanho, tamanho, 1);
    return { sprite: s, mat: mat, baseTamanho: tamanho, baseOpacidade: opacidade };
  }

  // ── O builder ─────────────────────────────────────────────────────────────
  N.centerBuilders.star = function (systemData, parent) {
    var center = systemData.center || {};
    var spectral = center.spectral || 'sun';
    var v = VARIANTES[spectral] || VARIANTES.sun;
    var systemId = systemData.id;

    // Cor base (usada na construção; anã branca será atualizada todo quadro)
    var corBase = new THREE.Color(center.color || '#ffffff');
    var patch = center.patch || ['#ffd43b', '#ff8a1f', '#fff3a0'];

    // ── Textura da esfera ────────────────────────────────────────────────
    var esferaTex = N.makeTexture(512, 256, function (g, w, h) {
      g.fillStyle = center.color || '#ffffff';
      g.fillRect(0, 0, w, h);
      N.blobs(g, w, h, patch, v.manchas);
    });
    var esferaMat = new THREE.MeshBasicMaterial({ map: esferaTex });
    var esfera = new THREE.Mesh(new THREE.SphereGeometry(v.raio, 48, 32), esferaMat);

    // ── Glow (duas camadas) ──────────────────────────────────────────────
    var glowTex = makeGlowTex(corBase);
    var g1 = makeGlowSprite(glowTex, v.glow1, v.opac1);
    var g2 = makeGlowSprite(glowTex, v.glow2, v.opac2);

    var grupo = new THREE.Group();
    grupo.userData.pickId = systemId;
    esfera.userData.pickId = systemId;
    grupo.add(esfera, g1.sprite, g2.sprite);

    // Alvo invisível de raio generoso para facilitar o clique (especialmente anãs branca/marrom)
    var hitRaio = Math.max(v.raio * 1.8, 5.0);
    var hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(hitRaio, 16, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitSphere.userData.pickId = systemId;
    grupo.add(hitSphere);

    // ── Ondas concêntricas da anã branca (halos finos que pulsam devagar) ─
    var ondas = [];
    if (spectral === 'whiteDwarf') {
      // 3 anéis tênues que se expandem e somem em ciclo
      for (var i = 0; i < 3; i++) {
        var anelGeo = new THREE.RingGeometry(v.raio * 1.8, v.raio * 2.0, 64);
        var anelMat = new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0,
          side: THREE.DoubleSide, depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        var anel = new THREE.Mesh(anelGeo, anelMat);
        // Cada onda começa em uma fase diferente
        anel.userData.fase = i * (Math.PI * 2 / 3);
        grupo.add(anel);
        ondas.push({ mesh: anel, mat: anelMat });
      }
    }

    parent.add(grupo);

    // Cores fria e quente para interpolação da anã branca (tone)
    var COR_FRIA   = '#cfe8ff';
    var COR_QUENTE = '#ffe7b0';

    return {
      object: grupo,
      update: function (dt) {
        esfera.rotation.y += dt * .05;

        // Lê o brilho do state (0 a 1.5)
        var bri = N.state.get(systemId, 'brightness');
        // Sem brightness no state (ex: Eu, trauma) → usa 1 como fallback seguro
        if (bri === 0 && (!N.state.current[systemId] || N.state.current[systemId].brightness === undefined)) {
          bri = 1;
        }

        // Escala do glow proporcional ao brilho (modularizado por forças externas como eclipse e supernova)
        var glowMod = (grupo.userData.glowModifier !== undefined) ? grupo.userData.glowModifier : 1.0;
        var pulseMod = (grupo.userData.supernovaPulse !== undefined)
          ? grupo.userData.supernovaPulse
          : ((parent && parent.userData && parent.userData.supernovaPulse !== undefined) ? parent.userData.supernovaPulse : 1.0);
        var fatorGlow = Math.max(bri * glowMod * pulseMod, 0.04);
        var t1 = g1.baseTamanho * fatorGlow;
        var t2 = g2.baseTamanho * fatorGlow;
        g1.sprite.scale.set(t1, t1, 1);
        g2.sprite.scale.set(t2, t2, 1);
        // Cor do glow escurece com brilho baixo (não mexe em opacity — o LOD controla)
        g1.mat.color.setScalar(fatorGlow);
        g2.mat.color.setScalar(fatorGlow);

        // ── Anã branca: atualiza cor pelo tone ──────────────────────────
        if (spectral === 'whiteDwarf') {
          var tone = N.state.get(systemId, 'tone');
          var corAtual = lerpColor(COR_FRIA, COR_QUENTE, tone);

          // Atualiza cor do glow
          g1.mat.color.copy(corAtual).multiplyScalar(fatorGlow);
          g2.mat.color.copy(corAtual).multiplyScalar(fatorGlow);

          // Ondas concêntricas: cada uma pulsa em ciclo de ~6s
          for (var i = 0; i < ondas.length; i++) {
            var o = ondas[i];
            o.mesh.userData.fase += dt * 1.05;
            var fase = o.mesh.userData.fase;
            // Onda: expande de 1.8× a 4× o raio enquanto a opacidade vai e volta
            var progresso = (Math.sin(fase) * 0.5 + 0.5); // 0 a 1
            var escala = v.raio * (1.8 + progresso * 2.2);
            o.mesh.scale.set(escala / (v.raio * 1.9), escala / (v.raio * 1.9), 1);
            // Opacidade da onda: sobe e desce, bem tênue (máximo ~0.12)
            o.mat.opacity = Math.sin(fase) * 0.06 + 0.06;
            o.mat.color.copy(corAtual);
            // Alinha a onda para olhar a câmera
            o.mesh.quaternion.copy(N.cam.quaternion);
          }
        }
      }
    };
  };
})();
