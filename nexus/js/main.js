/* main.js — o MAESTRO. Não desenha nada: só chama cada peça, na ordem, e mantém o relógio andando. */
(function () {
  // ══════════════════════════════════════════════════════════════════
  // ROTAÇÃO GALÁCTICA (Extra E4)
  // Com false, o universo volta a ficar parado como era antes.
  // ══════════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════
  const ROTACAO_GALAXIA = true;
  const VOLTA_GALAXIA_SEGUNDOS = 240;

  const N = NEXUS;
  N.ROTACAO_GALAXIA = ROTACAO_GALAXIA;
  N.VOLTA_GALAXIA_SEGUNDOS = VOLTA_GALAXIA_SEGUNDOS;
  const universe = N.getUniverse();          // 1) pega os dados

  N.buildBackground();                       // 2) monta o mundo, peça por peça
  N.buildStarfield();
  if (N.buildHalo) N.buildHalo();            // halo de matéria escura (inconsciente herdado)
  const arms = N.buildArms ? N.buildArms() : null; // braços espirais da galáxia (rotinas)
  
  // Cria um sistema para cada item dos dados
  const systems = universe.systems.map(s => N.buildSystem(s));

  // // Verificação de alinhamento vertical Y (Requisito 5)
  // (function verificarAlinhamentoY() {
  //   const tempWP = new THREE.Vector3();
  //   const carreiraWP = new THREE.Vector3();
  //   const tabelaAlinhamento = [];

  //   const idsParaVerificar = [
  //     'eu', 'criacao', 'desejo-seguranca', 'mae',
  //     'nao-escolhida', 'trauma', 'nebulosa', 'rafael'
  //   ];

  //   idsParaVerificar.forEach(id => {
  //     if (N.systemsById[id]) {
  //       N.systemsById[id].group.getWorldPosition(tempWP);
  //       tabelaAlinhamento.push({ id: id, 'Y Mundial (centro)': tempWP.y.toFixed(6) });
  //     }
  //   });

  //   console.log('=== VERIFICAÇÃO DE ALINHAMENTO VERTICAL Y (ALIGN_Y = ' + N.ALIGN_Y + ') ===');
  //   console.table(tabelaAlinhamento);

  //   // Posições relativas das luas e cometa em relação ao grupo de A Carreira
  //   if (N.planetsById['carreira']) {
  //     const pCarreira = N.planetsById['carreira'];
  //     pCarreira.group.getWorldPosition(carreiraWP);

  //     console.log('=== POSIÇÕES RELATIVAS AO CENTRO DE A CARREIRA ===');
  //     ['aprovacao', 'medo', 'proposta'].forEach(childId => {
  //       if (N.pickRegistry[childId]) {
  //         const posChild = N.pickRegistry[childId].getPos();
  //         const relPos = posChild.clone().sub(carreiraWP);
  //         console.log(`Relativo a Carreira -> ${childId}:`, {
  //           x: relPos.x.toFixed(4),
  //           y: relPos.y.toFixed(4),
  //           z: relPos.z.toFixed(4)
  //         });
  //       }
  //     });
  //   }
  // })();   

  let last = performance.now();
  function loop(now) {                       // 3) a cada quadro (~60x por segundo):
    const dt = Math.min((now - last) / 1000, .05);   // quanto tempo passou
    last = now;
    
    N.state.update(dt);                      // aproxima valores animáveis (suavização)
    N.controls.update(dt);                   // mexe a câmera
    if (N.updateForces) N.updateForces(dt);  // sentimentos como forças: marés, eclipses, gravidade
    if (arms && arms.update) arms.update(dt);// rotação dos braços e rótulos
    systems.forEach(s => N.updateSystem(s, dt));     // gira estrelas e move planetas
    if (N.updateOrbitsFX) N.updateOrbitsFX();        // atenuação por distância e rastro invertido das órbitas
    if (N.events && N.events.update) N.events.update(dt); // eventos cósmicos como supernova
    if (N.panel && N.panel.update) N.panel.update(); // atualiza painel se capítulo mudar
    
    N.renderer.render(N.scene, N.cam);       // desenha
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
