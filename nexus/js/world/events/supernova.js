/* supernova.js — evento cósmico de Supernova tipo Ia na anã branca da mãe (sistema 'mae').
   Disparado no Capítulo 2 ("A supernova").
   Efeitos:
   1) Clarão inicial: sprite aditivo que cresce e some em ~0,8 s + flash sutil de tela em CSS (~0,5 s).
   2) Onda de choque: anel fino e achatado aditivo (dourado → violeta) expandindo até raio ~220 em ~3 s.
   3) Cada sistema cruzado pela onda pulsa seu brilho de glow (×1,3 por 0,5 s, sem mexer em opacity).
   Sem bibliotecas novas. Recursos montados no boot e reutilizados pelo evento. */
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
  var prepared = null, screenFlashTimer = null;
  // Recursos permanentes, preparados no boot da Helena. Navegar não cria
  // sprites, materiais, geometrias ou elementos HTML e não os descarta.
  N.events.prepare = function () {
    if (prepared) return;
    var flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: getFlareTexture(), color: 0xffffff,
      transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    var wave = new THREE.Mesh(new THREE.RingGeometry(.97, 1.03, 96), new THREE.MeshBasicMaterial({
      color: 0xffd166, transparent: true, opacity: .9, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide, depthWrite: false }));
    wave.rotation.x = Math.PI / 2 + .16;
    flash.visible = wave.visible = false; flash.scale.set(0, 0, 0); wave.scale.set(0, 0, 0);
    N.scene.add(flash, wave);
    var screen = document.createElement('div'); screen.className = 'nexus-supernova-flash';
    screen.style.display = 'none'; document.body.appendChild(screen);
    prepared = { flash: flash, wave: wave, screen: screen };
  };

  // Oculta os efeitos e restaura pulsos sem remover ou descartar recursos.
  function cleanup() {
    clearTimeout(screenFlashTimer);
    if (prepared) {
      prepared.flash.visible = prepared.wave.visible = false;
      prepared.flash.scale.set(0, 0, 0); prepared.wave.scale.set(0, 0, 0);
      prepared.screen.style.display = 'none';
    }
    if (!activeSupernova) return;

    if (activeSupernova.flashSprite && activeSupernova.flashSprite.parent) {
      activeSupernova.flashSprite.visible = false;
    }

    if (activeSupernova.shockwaveMesh && activeSupernova.shockwaveMesh.parent) {
      activeSupernova.shockwaveMesh.visible = false;
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
    var flashDiv = prepared.screen;
    flashDiv.classList.remove('fade-out'); flashDiv.style.display = '';

    // Força reflow e inicia o fade out suave
    requestAnimationFrame(function () {
      flashDiv.classList.add('fade-out');
    });

    screenFlashTimer = setTimeout(function () { flashDiv.style.display = 'none'; }, 550);
  }

  // Cores da onda de choque: dourado (#ffd166) → violeta (#9b5de5)
  var COLOR_GOLD = new THREE.Color(0xffd166);
  var COLOR_VIOLET = new THREE.Color(0x9b5de5);

  N.events.supernova = function () {
    if (!prepared) throw new Error('Prepare a supernova no boot antes de ativá-la.');
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
    var flashSprite = prepared.flash;
    flashSprite.visible = true; flashSprite.material.opacity = 1;
    flashSprite.position.copy(origin);
    flashSprite.scale.set(4, 4, 1);

    // 5) Onda de choque: anel fino e achatado aditivo expandindo até raio ~220 em ~3 s
    var shockwaveMesh = prepared.wave;
    shockwaveMesh.visible = true; shockwaveMesh.scale.set(1, 1, 1);
    shockwaveMesh.material.opacity = .9; shockwaveMesh.material.color.copy(COLOR_GOLD);
    shockwaveMesh.position.copy(origin);
    // Inclina no plano da galáxia (rotação x de ~0.16)
    shockwaveMesh.rotation.x = Math.PI / 2 + 0.16;

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
      origin: origin,
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
        // Oculta após os 0,8 s; a próxima ativação usa o mesmo sprite.
        if (s.flashSprite.parent) {
          s.flashSprite.visible = false; s.flashSprite.scale.set(0, 0, 0);
        }
        if (s.flashSprite.material) {
          s.flashSprite.material.opacity = 0;
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
        // Oculta após os 3 s; o anel continua montado.
        if (s.shockwaveMesh.parent) {
          s.shockwaveMesh.visible = false; s.shockwaveMesh.scale.set(0, 0, 0);
        }
        if (s.shockwaveMesh.geometry) {
          // A geometria permanece preparada para outra passagem pelo evento.
        }
        if (s.shockwaveMesh.material) {
          s.shockwaveMesh.material.opacity = 0;
        }
        s.shockwaveMesh = null;
      }
    }

    // ── 3) Pulso de brilho nos sistemas cruzados (×1,3 por 0,5 s) ─────────
    var anyPulsing = false;
    var vSys = new THREE.Vector3();
    for (var i = 0; i < s.systemsToCross.length; i++) {
      var item = s.systemsToCross[i];

      var currentDist = item.dist;
      if (!item.triggered && item.system && item.system.group) {
        item.system.group.getWorldPosition(vSys);
        currentDist = s.origin.distanceTo(vSys);
      }

      // Dispara o pulso assim que a frente da onda atinge a distância do sistema
      if (!item.triggered && currentRadius >= currentDist && t <= 3.1) {
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
