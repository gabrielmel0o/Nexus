/* picking.js — Raycaster para hover e clique em corpos celestes.
   Detecta planetas, luas, centros de sistemas e orbitantes via userData.pickId.

   Mantém NEXUS.pickRegistry: mapa de id → { getPos(), radius } que
   os construtores usam para registrar seus objetos após a montagem.

   - Hover: cursor pointer, realce (~1.06), nome destaque (somente sem arrastar).
   - Arrasto: ao começar a arrastar a câmera, remove o destaque e não destaca nada durante o movimento.
   - Soltar: hover volta a funcionar normalmente.
   - Clique em corpo: NEXUS.selectBody(id) → câmera voa até ele e o segue.
   - Clique no vazio ou Esc: NEXUS.deselectBody() → volta à visão geral. */
(function () {
  const N = NEXUS;
  const canvas = N.renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  N.selected = null;
  N.hoveredId = null;

  // Mapa de registro: id → { getPos(): Vector3, radius: number }
  // Preenchido pelos construtores (system.js, planets.js etc.)
  N.pickRegistry = {};

  // ── selectBody / deselectBody ─────────────────────────────────────────────
  N.selectBody = function (id) {
    if (N.selected === id) return; // clique duplo no mesmo corpo = ignora
    N.selected = id;
    console.log('Selecionado:', id);

    const entry = N.pickRegistry[id];
    if (!entry) {
      // Corpo registrado ainda não teve seu objeto montado — ignora voo
      return;
    }
    // Distância de chegada: 4× o raio do corpo, mínimo 0.005
    const arrivalR = Math.max(entry.radius * 4, 0.005);
    N.controls.flyTo(entry.getPos, arrivalR, entry.radius);
  };

  N.deselectBody = function () {
    if (!N.selected) return;
    N.selected = null;
    N.controls.flyHome();
  };

  // ── Hover & Controle de Arrasto ───────────────────────────────────────────
  let downPos = { x: 0, y: 0 };
  let isPointerDown = false;
  let isDragging = false;
  let currentHoveredId = null;
  let activeLabelEl = null;

  function findPickId(obj) {
    let curr = obj;
    while (curr) {
      if (curr.userData && curr.userData.pickId) return curr.userData.pickId;
      curr = curr.parent;
    }
    return null;
  }

  function getIntersectedId(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, N.cam);
    
    let closestId = null;
    let closestDist = Infinity;
    
    const vFov = N.cam.fov * Math.PI / 180;
    const clientHeight = rect.height;

    for (let id in N.pickRegistry) {
      const entry = N.pickRegistry[id];
      const pos = entry.getPos();
      const distToCam = N.cam.position.distanceTo(pos);
      
      const visibleHeight = 2 * Math.tan(vFov / 2) * distToCam;
      const pxSize = visibleHeight / clientHeight;
      const targetRadius = Math.max(entry.radius * 1.35, 14 * pxSize);
      
      const sphere = new THREE.Sphere(pos, targetRadius);
      // Math intersection returns the point (Vector3) or null in r128
      const intersect = raycaster.ray.intersectSphere(sphere, new THREE.Vector3());
      
      if (intersect) {
        const d = raycaster.ray.origin.distanceTo(intersect);
        if (d < closestDist) {
          closestDist = d;
          closestId = id;
        }
      }
    }
    return closestId;
  }

  function updateHover(id) {
    if (id === currentHoveredId) return;
    if (activeLabelEl) { activeLabelEl.classList.remove('highlight'); activeLabelEl = null; }
    currentHoveredId = id;
    N.hoveredId = id;
    if (id) {
      canvas.style.cursor = 'pointer';
      const lbl = document.querySelector(`.lb[data-pick-id="${id}"]`);
      if (lbl) { lbl.classList.add('highlight'); activeLabelEl = lbl; }
    } else {
      canvas.style.cursor = '';
    }
  }

  // ── Eventos ───────────────────────────────────────────────────────────────
  canvas.addEventListener('pointerdown', e => {
    isPointerDown = true;
    isDragging = false;
    downPos.x = e.clientX;
    downPos.y = e.clientY;
  });

  canvas.addEventListener('pointermove', e => {
    // Se o botão do mouse está pressionado, verifica se iniciou arrasto da câmera
    if (isPointerDown) {
      if (!isDragging) {
        const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
        if (dist > 4) {
          isDragging = true;
          updateHover(null); // Ao começar a arrastar, remove qualquer destaque ativo
        }
      }
      // Durante o arrasto da câmera, não processa hover
      if (isDragging) return;
    }

    updateHover(getIntersectedId(e));
  });

  const cancelPointer = () => {
    isPointerDown = false;
    isDragging = false;
    updateHover(null);
  };

  canvas.addEventListener('pointerleave', cancelPointer);
  canvas.addEventListener('pointercancel', cancelPointer);

  canvas.addEventListener('pointerup', e => {
    const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    const wasDragging = isDragging || dist > 5;

    isPointerDown = false;
    isDragging = false;

    if (wasDragging) {
      // Soltou o botão após arrastar: o hover pode voltar a funcionar normalmente
      updateHover(getIntersectedId(e));
      return;
    }

    // Clique genuíno (sem arrasto significativo)
    const id = getIntersectedId(e);
    if (id) {
      N.selectBody(id);
    } else {
      N.deselectBody(); // clique no espaço vazio = volta para casa
    }

    // Mantém ou atualiza o hover na posição do clique
    updateHover(id);
  });

  // Esc já está tratado em controls.js (chama flyHome),
  // mas também limpa N.selected aqui para manter consistência
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (N.panel && N.panel.isOpen()) {
        N.panel.close();
        return;
      }
      N.deselectBody();
    }
  });

  N.picking = { update() {} };
})();
