/* supernova.js — evento cósmico de Supernova tipo Ia na anã branca da mãe (sistema 'mae').
   Disparado no Capítulo 2 ("A supernova").
   Efeitos:
   1) Clarão inicial: sprite aditivo que cresce e some em ~0,8 s + flash sutil de tela em CSS (~0,5 s).
   2) Onda de choque: anel fino e achatado aditivo (dourado → violeta) expandindo até raio ~220 em ~3 s.
   3) Cada sistema cruzado pela onda pulsa seu brilho de glow (×1,3 por 0,5 s, sem mexer em opacity).
   Sem bibliotecas novas. Sem criar objetos fora do ciclo de vida do evento. */
(function () {
  var N = NEXUS;
  N.events = N.events || {};

  // Textura radial suave gerada para o clarão da supernova
  var flareTexture = null;
  function getFlareTexture() {
    if (flareTexture) return flareTexture;
    flareTexture = N.makeTexture(128, 128, function (ctx) {
      var rad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      rad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      rad.addColorStop(0.18, 'rgba(255, 245, 210, 0.95)');
      rad.addColorStop(0.45, 'rgba(255, 210, 100, 0.45)');
      rad.addColorStop(0.75, 'rgba(255, 180, 50, 0.12)');
      rad.addColorStop(1, 'rgba(255, 150, 0, 0)');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, 128, 128);
    });
    return flareTexture;
  }

  // Estado da animação ativa do evento
  var activeSupernova = null;

  // Limpa elementos 3D e pulsos caso uma supernova anterior ainda esteja em andamento
  function cleanup() {
    if (!activeSupernova) return;

    if (activeSupernova.flashSprite && activeSupernova.flashSprite.parent) {
      activeSupernova.flashSprite.parent.remove(activeSupernova.flashSprite);
      if (activeSupernova.flashSprite.material) activeSupernova.flashSprite.material.dispose();
    }

    if (activeSupernova.shockwaveMesh && activeSupernova.shockwaveMesh.parent) {
      activeSupernova.shockwaveMesh.parent.remove(activeSupernova.shockwaveMesh);
      if (activeSupernova.shockwaveMesh.geometry) activeSupernova.shockwaveMesh.geometry.dispose();
      if (activeSupernova.shockwaveMesh.material) activeSupernova.shockwaveMesh.material.dispose();
    }

    // Restaura o pulso de brilho de todos os sistemas
    if (N.systemsById) {
      for (var sysId in N.systemsById) {
        var sys = N.systemsById[sysId];
        if (sys && sys.group && sys.group.userData) {
          sys.group.userData.supernovaPulse = 1.0;
        }
      }
    }

    activeSupernova = null;
  }

  N.events.cleanup = cleanup;

  // Flash de tela discreto em CSS (~0,5 s)
  function triggerScreenFlash() {
    var flashDiv = document.createElement('div');
    flashDiv.className = 'nexus-supernova-flash';
    document.body.appendChild(flashDiv);

    // Força reflow e inicia o fade out suave
    requestAnimationFrame(function () {
      flashDiv.classList.add('fade-out');
    });

    setTimeout(function () {
      if (flashDiv.parentNode) {
        flashDiv.parentNode.removeChild(flashDiv);
      }
    }, 550);
  }

  // Cores da onda de choque: dourado (#ffd166) → violeta (#9b5de5)
  var COLOR_GOLD = new THREE.Color(0xffd166);
  var COLOR_VIOLET = new THREE.Color(0x9b5de5);

  N.events.supernova = function () {
    // 1) Se já houver uma ativa, finaliza a anterior de forma segura
    cleanup();

    // 2) Determina o ponto de origem: centro do sistema 'mae' (a anã branca)
    var origin = new THREE.Vector3(-96, 6, 6);
    if (N.systemsById && N.systemsById['mae'] && N.systemsById['mae'].group) {
      N.systemsById['mae'].group.getWorldPosition(origin);
    }

    // 3) Dispara o flash de tela CSS
    triggerScreenFlash();

    // 4) Clarão 3D: sprite aditivo que cresce e some em ~0,8 s
    var flashMat = new THREE.SpriteMaterial({
      map: getFlareTexture(),
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var flashSprite = new THREE.Sprite(flashMat);
    flashSprite.position.copy(origin);
    flashSprite.scale.set(4, 4, 1);
    N.scene.add(flashSprite);

    // 5) Onda de choque: anel fino e achatado aditivo expandindo até raio ~220 em ~3 s
    var ringGeo = new THREE.RingGeometry(0.97, 1.03, 96);
    var ringMat = new THREE.MeshBasicMaterial({
      color: COLOR_GOLD.clone(),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var shockwaveMesh = new THREE.Mesh(ringGeo, ringMat);
    shockwaveMesh.position.copy(origin);
    // Inclina no plano da galáxia (rotação x de ~0.16)
    shockwaveMesh.rotation.x = Math.PI / 2 + 0.16;
    N.scene.add(shockwaveMesh);

    // 6) Prepara lista de sistemas com suas distâncias em relação à origem
    var systemsToCross = [];
    if (N.systemsById) {
      for (var id in N.systemsById) {
        var s = N.systemsById[id];
        if (s && s.group) {
          var sysPos = new THREE.Vector3();
          s.group.getWorldPosition(sysPos);
          var dist = origin.distanceTo(sysPos);
          systemsToCross.push({
            id: id,
            system: s,
            dist: dist,
            triggered: false,
            pulseTimer: 0,
            isPulsing: false
          });
        }
      }
    }

    // Cria a estrutura de controle da animação
    activeSupernova = {
      elapsed: 0,
      flashSprite: flashSprite,
      shockwaveMesh: shockwaveMesh,
      systemsToCross: systemsToCross
    };
  };

  // Atualização chamada a cada quadro pelo maestro (NEXUS.events.update)
  N.events.update = function (dt) {
    if (!activeSupernova) return;

    var s = activeSupernova;
    s.elapsed += dt;
    var t = s.elapsed;

    // ── 1) Atualiza o Clarão 3D (duração ~0,8 s) ───────────────────────────
    if (s.flashSprite) {
      if (t <= 0.8) {
        var progClarão = t / 0.8;
        // Crescimento rápido inicial nos primeiros 0,15 s, depois expansão suave
        var esc;
        if (t < 0.15) {
          esc = 4 + (t / 0.15) * 65; // de 4 para 69
        } else {
          esc = 69 + ((t - 0.15) / 0.65) * 20; // de 69 para 89
        }
        s.flashSprite.scale.set(esc, esc, 1);

        // Desvanecimento suave de opacidade (1.0 até 0)
        var opacClarao = Math.max(0, 1.0 - Math.pow(progClarão, 1.4));
        s.flashSprite.material.opacity = opacClarao;
      } else {
        // Remove da cena após os 0,8 s
        if (s.flashSprite.parent) {
          s.flashSprite.parent.remove(s.flashSprite);
        }
        if (s.flashSprite.material) {
          s.flashSprite.material.dispose();
        }
        s.flashSprite = null;
      }
    }

    // ── 2) Atualiza a Onda de Choque (duração ~3,0 s, raio até ~220) ──────
    var currentRadius = 0;
    if (s.shockwaveMesh) {
      if (t <= 3.0) {
        var progOnda = t / 3.0; // 0 a 1

        // Expansão do raio até ~220
        currentRadius = progOnda * 220;
        s.shockwaveMesh.scale.set(currentRadius, currentRadius, 1);

        // Cor: dourado → violeta
        s.shockwaveMesh.material.color.copy(COLOR_GOLD).lerp(COLOR_VIOLET, progOnda);

        // Opacidade: alta na maior parte do percurso, fade out sutil nos últimos 25%
        var opacOnda = 0.9;
        if (progOnda > 0.75) {
          opacOnda = 0.9 * (1.0 - (progOnda - 0.75) / 0.25);
        }
        s.shockwaveMesh.material.opacity = Math.max(0, opacOnda);
      } else {
        // Remove da cena após os 3 s
        if (s.shockwaveMesh.parent) {
          s.shockwaveMesh.parent.remove(s.shockwaveMesh);
        }
        if (s.shockwaveMesh.geometry) {
          s.shockwaveMesh.geometry.dispose();
        }
        if (s.shockwaveMesh.material) {
          s.shockwaveMesh.material.dispose();
        }
        s.shockwaveMesh = null;
      }
    }

    // ── 3) Pulso de brilho nos sistemas cruzados (×1,3 por 0,5 s) ─────────
    var anyPulsing = false;
    for (var i = 0; i < s.systemsToCross.length; i++) {
      var item = s.systemsToCross[i];

      // Dispara o pulso assim que a frente da onda atinge a distância do sistema
      if (!item.triggered && currentRadius >= item.dist && t <= 3.1) {
        item.triggered = true;
        item.isPulsing = true;
        item.pulseTimer = 0;
      }

      // Animação do pulso de 0,5 s
      if (item.isPulsing) {
        item.pulseTimer += dt;
        var p = item.pulseTimer / 0.5; // 0 a 1
        if (p <= 1.0) {
          anyPulsing = true;
          // Curva senoidal: de 1.0 até 1.3 no ápice e volta a 1.0
          var mult = 1.0 + 0.3 * Math.sin(Math.PI * p);
          if (item.system.group && item.system.group.userData) {
            item.system.group.userData.supernovaPulse = mult;
          }
        } else {
          // Finaliza o pulso do sistema
          item.isPulsing = false;
          if (item.system.group && item.system.group.userData) {
            item.system.group.userData.supernovaPulse = 1.0;
          }
        }
      }
    }

    // Se o clarão acabou, a onda acabou e nenhum sistema mais está pulsando, encerra
    if (!s.flashSprite && !s.shockwaveMesh && !anyPulsing && t > 3.5) {
      cleanup();
    }
  };
})();
