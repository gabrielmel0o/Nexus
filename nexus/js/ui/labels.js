/* labels.js — os nomes flutuantes ao lado dos planetas e sistemas (texto HTML posicionado sobre o 3D). */
(function () {
  const N = NEXUS, v = new THREE.Vector3();

  N.createLabel = (text, id) => {
    const el = document.createElement('div');
    el.className = 'lb';
    el.textContent = text;
    if (id) el.dataset.pickId = id;
    document.body.appendChild(el);
    return el;
  };

  // obj = o grupo 3D. Converte a posição dele no universo em posição na tela e move o texto até lá.
  // alpha = de 0 a 1, vem do LOD: quanto o nome deve aparecer conforme a distância da câmera.
  N.updateLabel = (el, obj, size, alpha = 1) => {
    obj.getWorldPosition(v);
    v.project(N.cam);
    const x = (v.x * .5 + .5) * innerWidth;
    const y = (-v.y * .5 + .5) * innerHeight + 16 + size * 7;
    el.style.transform = `translate(${x}px,${y}px) translate(-50%,0)`;
    const isHighlight = el.classList.contains('highlight');
    const finalAlpha = isHighlight ? Math.max(alpha, 0.95) : alpha;
    el.style.opacity = v.z < 1 ? .9 * finalAlpha : 0;
  };
})();
