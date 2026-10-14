/* forces.js — Sentimentos não são corpos; são forças que movem os corpos existentes.
   Implementa NEXUS.updateForces(dt), chamada a cada quadro no loop principal.
   Lê data.forces e aplica os efeitos físicos e visuais conforme state.get(id, 'strength'):

   - 'tide' (mare-aprovacao: Lua da aprovação → Carreira):
     O planeta "respira" (escala oscila até ±4% · strength em ritmo ligado ao ângulo da lua, e o halo pulsa).
   - 'eclipse' (eclipse-medo: Lua do medo → Carreira, com a luz de criacao):
     Quando a lua fica entre a estrela da criação e o planeta, o planeta escurece (multiplicação de cor, NUNCA opacity)
     e o glow da estrela cai, proporcional a strength × alinhamento, com suavização.
   - 'gravity' (amor-rafael: Rafael → Carreira e exoplaneta):
     Inclina levemente as órbitas dos planetas alvo em direção à fonte (máx. ~0,2 rad · strength).
     Se o corpo-fonte ainda não existir, ignora sem erro. */
(function () {
  const N = NEXUS;

  // Vetores auxiliares reutilizados para evitar alocação de memória no loop
  const vPlanet = new THREE.Vector3();
  const vMoon = new THREE.Vector3();
  const vStar = new THREE.Vector3();
  const vSource = new THREE.Vector3();
  const dirToStar = new THREE.Vector3();
  const dirToMoon = new THREE.Vector3();
  const dirToSource = new THREE.Vector3();

  // Estado interno para suavização do eclipse
  let eclipseFactor = 0;
  var historyEclipses = Object.create(null);
  N.prepareHistoryForces = function (universe) {
    historyEclipses = Object.create(null);
    (universe.historyFrames || []).forEach(f => f.forces.forEach(force => {
      if (force.kind === 'eclipse') force.targets.forEach(id => { historyEclipses[force.id + ':' + id] = 0; });
    }));
  };
  N.resetHistoryForces = function (previous) {
    if (!previous) { Object.keys(historyEclipses).forEach(k => { historyEclipses[k] = 0; }); return; }
    const current = N.state.frame;
    previous.forces.concat(current.forces).forEach(f => {
      if (f.kind !== 'eclipse') return;
      const before = previous.forces.find(v => v.id === f.id), after = current.forces.find(v => v.id === f.id);
      const same = before && after && before.source === after.source && before.star === after.star;
      f.targets.forEach(id => {
        if (!same || !before.targets.includes(id) || !after.targets.includes(id)
          || !N.presence.isPresentIn(f.source, previous) || !N.presence.isPresent(f.source)
          || !N.presence.isPresentIn(id, previous) || !N.presence.isPresent(id)) historyEclipses[f.id + ':' + id] = 0;
      });
    });
  };
  function updateHistory(dt) {
    // Começa sempre nos valores neutros: uma força removida não deixa resíduos.
    Object.values(N.planetsById || {}).forEach(p => {
      p.scaleModifier = p.haloModifier = p.haloColorFactor = 1;
      p.colorModifier.setRGB(1, 1, 1); p.orbitGroup.rotation.x = p.orbitGroup.rotation.z = 0;
    });
    Object.values(N.systemsById || {}).forEach(s => {
      s.centerObj.object.userData.glowModifier = 1;
      if (s.pointLight) {
        var body = N.presence.body(s.data.id);
        s.pointLight.intensity = body && N.presence.isPresent(s.data.id) && body.system.planets.length
          ? 1.7 * (N.state.current[s.data.id].brightness === undefined ? 1 : N.state.get(s.data.id, 'brightness')) : 0;
      }
    });
    N.state.frame.forces.forEach(force => {
      const strength = N.state.get(force.id, 'strength');
      if (!strength || !N.presence.isPresent(force.source) || (force.star && !N.presence.isPresent(force.star))) return;
      force.targets.forEach(id => {
        if (!N.presence.isPresent(id)) return;
        const p = N.planetsById[id]; if (!p) return;
        if (force.kind === 'tide') {
          const wave = Math.sin(p.moonsById[force.source].angle * 2) * strength;
          p.scaleModifier = Math.max(.96, Math.min(1.04, p.scaleModifier + wave * .04));
          p.haloModifier = Math.max(.9, Math.min(1.1, p.haloModifier + wave * .1));
          p.haloColorFactor = Math.max(.85, Math.min(1.15, p.haloColorFactor + wave * .15));
        } else if (force.kind === 'gravity') {
          p.group.getWorldPosition(vPlanet);
          dirToSource.subVectors(N.pickRegistry[force.source].getPos(), vPlanet).normalize();
          p.orbitGroup.rotation.x = Math.max(-.2, Math.min(.2, p.orbitGroup.rotation.x + dirToSource.z * .2 * strength));
          p.orbitGroup.rotation.z = Math.max(-.2, Math.min(.2, p.orbitGroup.rotation.z - dirToSource.x * .2 * strength));
        } else if (force.kind === 'eclipse') {
          const star = N.systemsById[force.star];
          p.group.getWorldPosition(vPlanet); p.moonsById[force.source].moonMesh.getWorldPosition(vMoon); star.group.getWorldPosition(vStar);
          dirToStar.subVectors(vStar, vPlanet).normalize(); dirToMoon.subVectors(vMoon, vPlanet).normalize();
          const dot = dirToStar.dot(dirToMoon), target = dot > .86 ? Math.sin(Math.min(1, (dot - .86) / .14) * Math.PI / 2) * strength : 0;
          const key = force.id + ':' + id;
          historyEclipses[key] += (target - historyEclipses[key]) * Math.min(1, dt * 5);
          const factor = historyEclipses[key];
          p.colorModifier.multiplyScalar(Math.max(.2, 1 - factor * .75));
          star.centerObj.object.userData.glowModifier *= 1 - factor * .55;
          if (star.pointLight) star.pointLight.intensity *= 1 - factor * .45;
        }
      });
    });
  }

  N.updateForces = function (dt) {
    const universe = N.currentUniverse || N.getUniverse();
    if (!universe || !universe.forces) return;
    if (N.state.frame) { updateHistory(dt); return; }

    universe.forces.forEach(force => {
      // Lê a intensidade dinâmica da força via state (com fallback para params)
      let strength = 0;
      const temIntensidade = N.state && N.state.current && N.state.current[force.id]
        && N.state.current[force.id].strength !== undefined;
      if (temIntensidade && typeof N.state.get === 'function') {
        strength = N.state.get(force.id, 'strength');
      } else if (force.params && force.params.strength !== undefined) {
        // Zero no estado é uma força desligada, não ausência de parâmetro.
        strength = force.params.strength;
      }

      // ──────────────────────────────────────────────────────────────────────────
      // 1. MARÉ ('tide') — mare-aprovacao: Lua da aprovação → Carreira
      // ──────────────────────────────────────────────────────────────────────────
      if (force.kind === 'tide') {
        const targetIds = force.targets || [];
        targetIds.forEach(targetId => {
          const planet = N.planetsById && N.planetsById[targetId];
          if (!planet) return;

          const moon = planet.moonsById && planet.moonsById[force.source];
          if (moon) {
            // A maré oscila em sintonia com a órbita da lua (duas cristas por revolução)
            const tideWave = Math.sin(moon.angle * 2);

            // Escala oscila até ±4% · strength
            planet.scaleModifier = 1.0 + (tideWave * 0.04 * strength);

            // Halo pulsa em ritmo de respiração
            planet.haloModifier = 1.0 + (tideWave * 0.1 * strength);
            planet.haloColorFactor = 1.0 + (tideWave * 0.15 * strength);
          } else {
            planet.scaleModifier = 1.0;
            planet.haloModifier = 1.0;
            planet.haloColorFactor = 1.0;
          }
        });
      }

      // ──────────────────────────────────────────────────────────────────────────
      // 2. ECLIPSE ('eclipse') — eclipse-medo: Lua do medo → Carreira, luz de criacao
      // ──────────────────────────────────────────────────────────────────────────
      else if (force.kind === 'eclipse') {
        const targetId = (force.targets && force.targets[0]) || 'carreira';
        const planet = N.planetsById && N.planetsById[targetId];
        const moon = planet && planet.moonsById && planet.moonsById[force.source];
        const starSys = N.systemsById && N.systemsById[force.star || 'criacao'];

        if (planet && moon && starSys) {
          // Obtém posições no mundo
          planet.group.getWorldPosition(vPlanet);
          moon.moonMesh.getWorldPosition(vMoon);
          starSys.group.getWorldPosition(vStar);

          // Direções a partir do planeta
          dirToStar.subVectors(vStar, vPlanet).normalize();
          dirToMoon.subVectors(vMoon, vPlanet).normalize();

          // Produto escalar: 1 = lua perfeitamente alinhada entre planeta e estrela
          const dot = dirToMoon.dot(dirToStar);

          // Alinhamento ocorre quando a lua passa na frente da estrela (cone ~25 graus)
          let alignment = 0;
          if (dot > 0.86) {
            const rawAlign = (dot - 0.86) / 0.14; // normalizado de 0 a 1
            alignment = Math.sin(Math.max(0, Math.min(1, rawAlign)) * Math.PI * 0.5);
          }

          // Alvo da intensidade do eclipse
          const targetFactor = alignment * strength;

          // Suavização temporal (lerp suave ao entrar e sair da sombra)
          eclipseFactor += (targetFactor - eclipseFactor) * Math.min(1, dt * 5.0);

          // 1) O planeta escurece: multiplica a cor do material (NUNCA opacity)
          const darkness = Math.max(0.2, 1.0 - (eclipseFactor * 0.75));
          if (planet.colorModifier) {
            planet.colorModifier.setRGB(darkness, darkness, darkness);
          }

          // 2) O glow da estrela cai com alinhamento e suavização
          const glowReduction = 1.0 - (eclipseFactor * 0.55);
          if (starSys.centerObj && starSys.centerObj.object) {
            starSys.centerObj.object.userData.glowModifier = glowReduction;
          }
          if (starSys.pointLight) {
            starSys.pointLight.intensity = 1.7 * (1.0 - (eclipseFactor * 0.45));
          }
        }
      }

      // ──────────────────────────────────────────────────────────────────────────
      // 3. GRAVIDADE ('gravity') — amor-rafael: Rafael → Carreira e exoplaneta
      // ──────────────────────────────────────────────────────────────────────────
      else if (force.kind === 'gravity') {
        // Se o corpo-fonte ainda não existir, ignora sem erro
        const sourceSys = N.systemsById && N.systemsById[force.source];
        if (!sourceSys || !sourceSys.group) {
          // Corpo-fonte ainda não existe na cena
          return;
        }

        sourceSys.group.getWorldPosition(vSource);

        const targetIds = force.targets || [];
        targetIds.forEach(targetId => {
          const planet = N.planetsById && N.planetsById[targetId];
          if (!planet || !planet.orbitGroup) return;

          // Posição mundial da órbita do planeta
          planet.orbitGroup.getWorldPosition(vPlanet);

          // Direção da órbita do planeta até a fonte (Rafael)
          dirToSource.subVectors(vSource, vPlanet).normalize();

          // Inclinação máxima proporcional a ~0.2 rad * strength
          const maxTilt = 0.2 * strength;
          const targetTiltX = dirToSource.z * maxTilt;
          const targetTiltZ = -dirToSource.x * maxTilt;

          // Inclina suavemente a órbita inteira (linha e planeta juntos)
          const kTilt = Math.min(1, dt * 2.5);
          planet.orbitGroup.rotation.x += (targetTiltX - planet.orbitGroup.rotation.x) * kTilt;
          planet.orbitGroup.rotation.z += (targetTiltZ - planet.orbitGroup.rotation.z) * kTilt;
        });
      }
    });
  };
})();
