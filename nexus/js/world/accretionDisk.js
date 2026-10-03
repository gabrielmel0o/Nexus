/* accretionDisk.js — disco de acreção estilizado em faixas concêntricas com traços em arco.
   NEXUS.buildAccretionDisk(opcoes) → { object, update(dt) }

   opcoes:
     raioInterno   — raio interno do disco (em unidades de cena)
     raioExterno   — raio externo do disco
     paleta        — array de cores hex (da borda interna para a externa) para as faixas base
     paletaTracos  — array de cores hex para os traços-arco em cima das faixas
     semente       — string para o RNG determinístico (derivada do id)
     inclinacao    — { rx, ry, rz } rotação do plano do disco (em radianos)
     velocidades   — [opcional] array com 3 velocidades para os anéis [interno, médio, externo]

   Estrutura:
     3 anéis planos concêntricos (THREE.RingGeometry), cada um cobrindo 1/3 da largura total.
     Cada anel possui textura própria (CanvasTexture 1024x1024, transparente).
     Em cada anel: círculos concêntricos de cores chapadas da paleta e 30 a 50 traços em arco.
     Material: MeshBasicMaterial, NormalBlending (sem glow, sem aditivo), depthWrite: false, depthTest: true.
     update(dt): anéis giram no próprio plano, interno mais rápido, sentido anti-horário (P22). */

(function () {
  'use strict';
  var N = NEXUS;

  // ══════════════════════════════════════════════════════════════════
  // SENTIDO DE GIRO DOS DISCOS (1 ou -1)
  // Usada por todos os discos de acreção.
  // 1 = Giro HORÁRIO visto de cima (olhando de +Y para -Y), igual aos sistemas.
  // ══════════════════════════════════════════════════════════════════
  var SENTIDO_GIRO_DISCOS = 1;

  // Velocidades padrão de rotação dos 3 anéis (rad/s)
  // O interno mais rápido, o do meio médio, o externo mais lento.
  var VELOCIDADE_INTERNO = 0.055;
  var VELOCIDADE_MEDIO   = 0.032;
  var VELOCIDADE_EXTERNO = 0.016;

  // Converte número hex (ex: 0xFFF3A8) para string CSS '#FFF3A8'
  function hexToCSS(hex) {
    return '#' + ('000000' + (hex >>> 0).toString(16)).slice(-6).toUpperCase();
  }

  // ─────────────────────────────────────────────────────────────────
  // Gera a CanvasTexture de um dos 3 anéis
  //   ringIndex: 0 (interno), 1 (médio), 2 (externo)
  //   rIn, rOut: raios interno e externo deste anel específico
  //   raioTotalIn, raioTotalOut: raios globais do disco completo
  //   paletaCSS: array de cores CSS da paleta principal
  //   tracosHex: array original de hex dos traços
  //   rng: gerador determinístico (NEXUS.createRNG)
  // ─────────────────────────────────────────────────────────────────
  function makeRingTexture(ringIndex, rIn, rOut, raioTotalIn, raioTotalOut, paletaCSS, tracosHex, rng) {
    var SIZE = 1024;
    var CX = SIZE / 2;
    var CY = SIZE / 2;
    var RAIO_CANVAS_MAX = SIZE / 2; // 512 px: no RingGeometry o raio externo é a borda do canvas

    // No RingGeometry(rIn, rOut), os vértices em rOut mapeiam para raio 512px.
    // Os vértices em rIn mapeiam para raio 512 * (rIn / rOut) px.
    var rCanvasMin = RAIO_CANVAS_MAX * (rIn / rOut);
    var rCanvasMax = RAIO_CANVAS_MAX;
    var ringWidthPx = rCanvasMax - rCanvasMin;

    return N.makeTexture(SIZE, SIZE, function (ctx) {
      // 1) Fundo totalmente transparente
      ctx.clearRect(0, 0, SIZE, SIZE);

      // 2) Círculos concêntricos de cores chapadas da paleta
      // Dividimos cada anel em 4 sub-faixas para mostrar a transição da paleta
      var SUB_FAIXAS = 4;
      for (var f = 0; f < SUB_FAIXAS; f++) {
        var f0 = rCanvasMin + (f / SUB_FAIXAS) * ringWidthPx;
        var f1 = rCanvasMin + ((f + 1) / SUB_FAIXAS) * ringWidthPx;

        // Fração global u ∈ [0, 1] no disco inteiro
        var fracLocal = (f + 0.5) / SUB_FAIXAS;
        var uGlobal = (ringIndex + fracLocal) / 3;

        // Cor chapada correspondente na paleta
        var colorIdx = Math.min(paletaCSS.length - 1, Math.max(0, Math.round(uGlobal * (paletaCSS.length - 1))));
        var corFaixa = paletaCSS[colorIdx];

        ctx.beginPath();
        // Pequena sobreposição de 0.5px para evitar lacunas de rasterização
        ctx.arc(CX, CY, f1 + 0.5, 0, Math.PI * 2);
        ctx.arc(CX, CY, Math.max(0, f0 - 0.5), 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = corFaixa;
        ctx.fill();
      }

      // 3) 30 a 50 traços curtos em arco (de 8° a 40°, finos, lineCap = 'round')
      // Mais claros que a faixa onde estão
      var numTracos = 35 + Math.floor(rng() * 15); // entre 35 e 49
      ctx.lineCap = 'round';

      for (var t = 0; t < numTracos; t++) {
        var fracR = rng();
        // Raio do traço com margem para não cortar nas bordas
        var rTraco = rCanvasMin + 3 + fracR * (ringWidthPx - 6);

        // Fração global deste traço no disco total
        var uTraco = (ringIndex + fracR) / 3;

        // Ângulo inicial e comprimento do arco (8° a 40°)
        var angStart = rng() * Math.PI * 2;
        var angGraus = 8 + rng() * 32;
        var angExt = angGraus * (Math.PI / 180);

        // Espessura fina
        var espessura = 1.6 + rng() * 1.8; // 1.6 a 3.4 px

        // Seleção de cor do traço: sempre mais clara que a faixa de fundo
        var corHex;
        if (uTraco < 0.28) {
          // Fundo amarelo claro: traço branco puro
          corHex = tracosHex[0] !== undefined ? tracosHex[0] : 0xFFFFFF;
        } else if (uTraco < 0.52) {
          // Fundo amarelo-laranja: traço amarelo suave ou branco
          corHex = rng() > 0.35 ? (tracosHex[1] || 0xFFE9A0) : (tracosHex[0] || 0xFFFFFF);
        } else if (uTraco < 0.76) {
          // Fundo laranja-avermelhado / magenta: traço dourado-laranja claro ou amarelo
          corHex = rng() > 0.35 ? (tracosHex[2] || 0xFFB347) : (tracosHex[1] || 0xFFE9A0);
        } else {
          // Fundo violeta / roxo profundo: traço violeta claro / lavanda
          corHex = rng() > 0.25 ? (tracosHex[3] || 0xB77CF0) : (tracosHex[2] || 0xFFB347);
        }

        ctx.beginPath();
        ctx.arc(CX, CY, rTraco, angStart, angStart + angExt);
        ctx.strokeStyle = hexToCSS(corHex);
        ctx.lineWidth = espessura;
        ctx.globalAlpha = 0.75 + rng() * 0.25; // 0.75 a 1.0 (vívidos e nítidos)
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Construtor principal
  // ─────────────────────────────────────────────────────────────────
  N.buildAccretionDisk = function (opcoes) {
    opcoes = opcoes || {};
    var raioInterno   = opcoes.raioInterno   || 1.0;
    var raioExterno   = opcoes.raioExterno   || 4.0;
    var paleta        = opcoes.paleta        || [0xFFF3A8, 0xFFD84A, 0xFF9A1F, 0xD9632B, 0x9A3F6E, 0x5B2A9E, 0x3B2478];
    var paletaTracos  = opcoes.paletaTracos  || [0xFFFFFF, 0xFFE9A0, 0xFFB347, 0xB77CF0];
    var semente       = opcoes.semente       || 'eu-accretion';
    var inclinacao    = opcoes.inclinacao    || { rx: 0, ry: 0, rz: 0 };
    var velList       = opcoes.velocidades   || [VELOCIDADE_INTERNO, VELOCIDADE_MEDIO, VELOCIDADE_EXTERNO];

    var paletaCSS = paleta.map(hexToCSS);

    var larguraTotal = raioExterno - raioInterno;
    var larguraAnel  = larguraTotal / 3;

    // Grupo raiz: mantém a rotação / inclinação do plano fixa
    var rootGroup = new THREE.Group();
    rootGroup.rotation.set(inclinacao.rx, inclinacao.ry, inclinacao.rz);
    rootGroup.updateMatrixWorld(true);

    // Avalia o vetor normal do plano no mundo (Z local transformado)
    var normalMundo = new THREE.Vector3(0, 0, 1);
    normalMundo.applyQuaternion(rootGroup.quaternion);

    // Se a normal aponta para baixo (y < 0), rotação +Z local gira no sentido HORÁRIO visto de cima.
    // Se a normal aponta para cima (y >= 0), rotação -Z local gira no sentido HORÁRIO visto de cima.
    var sinalInclinacao = normalMundo.y < 0 ? 1 : -1;
    var fatorSentido = SENTIDO_GIRO_DISCOS * sinalInclinacao;

    var aneis = [];

    // Constrói os 3 anéis concêntricos
    for (var i = 0; i < 3; i++) {
      var rIn  = raioInterno + i * larguraAnel;
      var rOut = rIn + larguraAnel;

      // Semente determinística única por anel
      var rngAnel = N.createRNG(semente + '-anel-' + i);

      // Textura do anel desenhada na proporção correta
      var texture = makeRingTexture(i, rIn, rOut, raioInterno, raioExterno, paletaCSS, paletaTracos, rngAnel);

      var geometry = new THREE.RingGeometry(rIn, rOut, 128);
      var material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: true,
        blending: THREE.NormalBlending // cores chapadas: sem glow, sem AdditiveBlending
      });

      var mesh = new THREE.Mesh(geometry, material);

      // Cada anel precisa de seu próprio grupo para rotação independente em torno do seu eixo Z
      var ringPivot = new THREE.Group();
      ringPivot.add(mesh);
      rootGroup.add(ringPivot);

      aneis.push({
        pivot: ringPivot,
        speed: velList[i] !== undefined ? velList[i] : (velList[0] || VELOCIDADE_INTERNO)
      });
    }

    return {
      object: rootGroup,
      update: function (dt) {
        // Giro no próprio plano: sentido HORÁRIO garantido visto de cima (+Y para -Y)
        for (var k = 0; k < aneis.length; k++) {
          aneis[k].pivot.rotation.z += aneis[k].speed * dt * fatorSentido;
        }
      }
    };
  };

})();
