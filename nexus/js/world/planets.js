/* planets.js — cria os planetas A PARTIR DOS DADOS e os faz orbitar. */
(function () {
  const N = NEXUS;

  // Cria UM planeta dentro da "caixa" do sistema (parent), com órbita, anel, lua, nome e elementos.
  function buildPlanet(d, parent) {
    // Linha da órbita (um círculo fino e discreto).
    const pts = [];
    for (let i = 0; i <= 128; i++) { const a = i / 128 * 6.283; pts.push(new THREE.Vector3(Math.cos(a) * d.orbit, 0, Math.sin(a) * d.orbit)); }
    const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),   // guardada para o LOD poder apagá-la
      new THREE.LineBasicMaterial({ color: 0x8a8fe8, transparent: true, opacity: .2 }));
    parent.add(orbit);

    const group = new THREE.Group();
    // Corpo: cor base + manchas, com sombreamento em degraus (toon).
    const body = new THREE.Mesh(new THREE.SphereGeometry(d.size, 48, 32), new THREE.MeshToonMaterial({
      gradientMap: N.toon,
      map: N.makeTexture(512, 256, (g, w, h) => { g.fillStyle = d.base; g.fillRect(0, 0, w, h); N.blobs(g, w, h, d.patch, 18); })
    }));
    // Halo: esfera um pouco maior, translúcida, vista por dentro = brilho de atmosfera.
    const halo = new THREE.Mesh(new THREE.SphereGeometry(d.size * 1.1, 32, 16),
      new THREE.MeshBasicMaterial({ color: d.patch[0], transparent: true, opacity: .16, side: THREE.BackSide }));
    group.add(body, halo);

    if (d.rings) {                                               // anéis (se o dado tiver "rings")
      [[1.5, 2.0, .85], [2.15, 2.3, .5]].forEach(([a, b, o]) => {
        const ring = new THREE.Mesh(new THREE.RingGeometry(d.size * a, d.size * b, 64),
          new THREE.MeshBasicMaterial({ color: d.rings, transparent: true, opacity: o, side: THREE.DoubleSide }));
        ring.rotation.set(Math.PI / 2 - .4, 0, .25);
        group.add(ring);
      });
    }
    let moon = null;
    if (d.moon) {                                                // lua (se o dado tiver "moon")
      moon = new THREE.Group();
      const m = new THREE.Mesh(new THREE.SphereGeometry(.35, 24, 16), new THREE.MeshToonMaterial({ color: 0xe9ecef, gradientMap: N.toon }));
      m.position.x = d.size * 2;
      moon.add(m); group.add(moon);
    }

    // Elementos: percorre d.elements e usa o mapa N.elementBuilders para criar cada um.
    // Cada builder devolve { object, update(dt) }. O objeto entra no grupo do planeta.
    // Para adicionar um novo tipo (satélite, asteroide...) basta criar um novo arquivo em
    // js/world/elements/ que se registre em N.elementBuilders['tipo']. Sem mexer aqui.
    const elementos = [];
    if (d.elements) {
      d.elements.forEach(el => {
        const builder = N.elementBuilders && N.elementBuilders[el.type];
        if (builder) {
          const inst = builder(el, d);   // cria o visual do elemento
          group.add(inst.object);        // adiciona ao grupo do planeta (acompanha o movimento)
          elementos.push(inst);          // guarda para animar a cada quadro
        }
      });
    }

    parent.add(group);
    return { d, group, body, moon, orbit, label: N.createLabel(d.name), angle: N.rand(0, 6.283), elementos };
  }

  N.buildPlanets = (list, parent) => list.map(d => buildPlanet(d, parent));

  // Chamado a cada quadro: avança a órbita, gira o planeta, anima elementos e atualiza o nome.
  // nomes = de 0 a 1, o quanto os nomes devem aparecer agora (vem do LOD).
  N.updatePlanets = (items, dt, nomes = 1) => items.forEach(p => {
    p.angle += p.d.speed * dt;
    p.group.position.set(Math.cos(p.angle) * p.d.orbit, 0, Math.sin(p.angle) * p.d.orbit);
    p.body.rotation.y += dt * .25;
    if (p.moon) p.moon.rotation.y += dt * .9;
    p.elementos.forEach(e => e.update(dt));   // piscar, orbitar, etc. — cada elemento cuida do seu
    N.updateLabel(p.label, p.group, p.d.size, nomes);
  });
})();
