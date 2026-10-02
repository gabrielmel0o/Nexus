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

  N.updateForces = function (dt) {
    const universe = N.getUniverse();
    if (!universe || !universe.forces) return;

    universe.forces.forEach(force => {
      // Lê a intensidade dinâmica da força via state (com fallback para params)
      let strength = 0;
      if (N.state && typeof N.state.get === 'function') {
        strength = N.state.get(force.id, 'strength');
      }
      if ((strength === undefined || strength === 0) && force.params && force.params.strength !== undefined) {
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
