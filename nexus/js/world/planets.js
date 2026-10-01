/* planets.js — cria os planetas A PARTIR DOS DADOS e os faz orbitar.

   A partir do P6, o formato dos planetas mudou:
   - "moons" é agora um array de objetos { id, name, size, orbit, speed, color }
     (o antigo campo "moon: true" foi removido dos dados)
   - "params" guarda os valores animáveis (size, mass, atmosphere, signals...)
   - "elements" e "rings" continuam iguais e são lidos como antes.
   Campos novos desconhecidos são simplesmente ignorados, sem erro. */
(function () {
  const N = NEXUS;

  // Cria UM planeta dentro da "caixa" do sistema (parent), com órbita, anel, luas, nome e elementos.
  function buildPlanet(d, parent) {
    // Linha da órbita (um círculo fino e discreto).
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = i / 128 * 6.283;
      pts.push(new THREE.Vector3(Math.cos(a) * d.orbit, 0, Math.sin(a) * d.orbit));
    }
    const orbit = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x8a8fe8, transparent: true, opacity: .2 })
    );
    parent.add(orbit);

    const group = new THREE.Group();

    // Corpo: cor base + manchas em cápsula, sombreamento em degraus (toon).
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(d.size, 48, 32),
      new THREE.MeshToonMaterial({
        gradientMap: N.toon,
        map: N.makeTexture(512, 256, (g, w, h) => {
          g.fillStyle = d.base;
          g.fillRect(0, 0, w, h);
          N.blobs(g, w, h, d.patch, 18);
        })
      })
    );

    // Halo: esfera um pouco maior, translúcida, vista por dentro = brilho de atmosfera.
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(d.size * 1.1, 32, 16),
      new THREE.MeshBasicMaterial({ color: d.patch[0], transparent: true, opacity: .16, side: THREE.BackSide })
    );
    group.add(body, halo);

    // Anéis: lê "rings" como antes (string de cor). Ignorado se não existir.
    if (d.rings) {
      [[1.5, 2.0, .85], [2.15, 2.3, .5]].forEach(([a, b, o]) => {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(d.size * a, d.size * b, 64),
          new THREE.MeshBasicMaterial({ color: d.rings, transparent: true, opacity: o, side: THREE.DoubleSide })
        );
        ring.rotation.set(Math.PI / 2 - .4, 0, .25);
        group.add(ring);
      });
    }

    // Luas: novo formato — array de objetos { id, name, size, orbit, speed, color }.
    // O antigo campo "moon: true" não existe mais; se o array estiver vazio (ou ausente), nenhuma lua é criada.
    const luaGrupos = [];
    const moons = d.moons || [];   // compatibilidade: se não vier, trata como lista vazia
    moons.forEach(lua => {
      const luaGrupo = new THREE.Group();
      const luaCorpo = new THREE.Mesh(
        new THREE.SphereGeometry(lua.size, 24, 16),
        new THREE.MeshToonMaterial({ color: lua.color || '#e9ecef', gradientMap: N.toon })
      );
      luaCorpo.position.x = lua.orbit;    // começa no raio da órbita; vai girar pelo luaGrupo
      luaGrupo.add(luaCorpo);
      group.add(luaGrupo);
      luaGrupos.push({ luaGrupo, lua });  // guarda para animar a cada quadro
    });

    // Elementos: igual ao formato anterior (d.elements é uma lista de { id, type, ... }).
    // N.elementBuilders[tipo] cria o visual; tipo sem builder gera aviso no console, sem erro.
    const elementos = [];
    if (d.elements) {
      d.elements.forEach(el => {
        const builder = N.elementBuilders && N.elementBuilders[el.type];
        if (builder) {
          const inst = builder(el, d);
          group.add(inst.object);
          elementos.push(inst);
        }
      });
    }

    parent.add(group);

    // Ângulo de partida: usa startAngle dos dados (fixo por planeta) ou aleatório como antes.
    // Com startAngle nos dados, o retrato de Helena será sempre igual a cada carregamento.
    const angle = typeof d.startAngle === 'number' ? d.startAngle : N.rand(0, 6.283);

    return { d, group, body, luaGrupos, orbit, label: N.createLabel(d.name), angle, elementos };
  }

  N.buildPlanets = (list, parent) => list.map(d => buildPlanet(d, parent));

  // Chamado a cada quadro: avança a órbita, gira o planeta, gira as luas, anima elementos e atualiza o nome.
  // nomes = de 0 a 1, o quanto os nomes devem aparecer agora (vem do LOD).
  N.updatePlanets = (items, dt, nomes = 1) => items.forEach(p => {
    p.angle += p.d.speed * dt;
    p.group.position.set(Math.cos(p.angle) * p.d.orbit, 0, Math.sin(p.angle) * p.d.orbit);
    p.body.rotation.y += dt * .25;

    // Gira cada lua ao redor do planeta na velocidade que seus dados indicam.
    p.luaGrupos.forEach(({ luaGrupo, lua }) => {
      luaGrupo.rotation.y += lua.speed * dt;
    });

    p.elementos.forEach(e => e.update(dt));   // piscar, orbitar, etc. — cada elemento cuida do seu
    N.updateLabel(p.label, p.group, p.d.size, nomes);
  });
})();
