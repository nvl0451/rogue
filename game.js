var Game = function () {
  const mapWidth = 40;
  const mapHeight = 24;

  const fieldBox = document.querySelector(".field-box");
  const containerWidth = fieldBox.clientWidth;
  const containerHeight = fieldBox.clientHeight;
  const tileSize = Math.floor(
    Math.min(containerWidth / mapWidth, containerHeight / mapHeight)
  );

  var map = [];
  var player = { x: 0, y: 0, hp: 100, attack: 10 };
  var enemies = [];
  var potions = [];
  var swords = [];

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function generateEmptyMap() {
    map = [];
    for (let y = 0; y < mapHeight; y++) {
      let row = [];
      for (let x = 0; x < mapWidth; x++) row.push("W");
      map.push(row);
    }
  }

  function placeRooms() {
    let count = rand(5, 10);
    for (let i = 0; i < count; i++) {
      let rw = rand(4, 8),
        rh = rand(4, 6);
      let rx = rand(1, mapWidth - rw - 2);
      let ry = rand(1, mapHeight - rh - 2);
      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) map[y][x] = ".";
      }
    }
  }

  function placeCorridors() {
    for (let i = 0; i < rand(3, 5); i++) {
      let y = rand(1, mapHeight - 2);
      for (let x = 1; x < mapWidth - 1; x++) map[y][x] = ".";
    }
    for (let i = 0; i < rand(3, 5); i++) {
      let x = rand(1, mapWidth - 2);
      for (let y = 1; y < mapHeight - 1; y++) map[y][x] = ".";
    }
  }

  function findComponents() {
    let components = [];
    let visited = new Set();

    function key(x, y) {
      return `${x},${y}`;
    }

    function floodFill(startX, startY) {
      let component = new Set();
      let queue = [{ x: startX, y: startY }];
      while (queue.length > 0) {
        let { x, y } = queue.shift();
        let k = key(x, y);
        if (!component.has(k) && map[y][x] === ".") {
          component.add(k);
          if (x + 1 < mapWidth) queue.push({ x: x + 1, y });
          if (x - 1 >= 0) queue.push({ x: x - 1, y });
          if (y + 1 < mapHeight) queue.push({ x, y: y + 1 });
          if (y - 1 >= 0) queue.push({ x, y: y - 1 });
        }
      }
      return component;
    }

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        let k = key(x, y);
        if (map[y][x] === "." && !visited.has(k)) {
          let component = floodFill(x, y);
          components.push(component);
          component.forEach((tile) => visited.add(tile));
        }
      }
    }
    return components;
  }

  function ensureConnectivity() {
    let components = findComponents();
    while (components.length > 1) {
      let comp1 = components[0];
      let comp2 = components[1];
      let tiles1 = Array.from(comp1).map((k) => {
        let [x, y] = k.split(",").map(Number);
        return { x, y };
      });
      let tiles2 = Array.from(comp2).map((k) => {
        let [x, y] = k.split(",").map(Number);
        return { x, y };
      });
      let minDist = Infinity;
      let closestPair = null;
      for (let t1 of tiles1) {
        for (let t2 of tiles2) {
          let dist = Math.abs(t1.x - t2.x) + Math.abs(t1.y - t2.y);
          if (dist < minDist) {
            minDist = dist;
            closestPair = { t1, t2 };
          }
        }
      }
      let { t1, t2 } = closestPair;
      let x = t1.x;
      let y = t1.y;
      while (x !== t2.x) {
        if (map[y][x] === "W") map[y][x] = ".";
        x += t2.x > x ? 1 : -1;
      }
      while (y !== t2.y) {
        if (map[y][x] === "W") map[y][x] = ".";
        y += t2.y > y ? 1 : -1;
      }
      components = findComponents();
    }
  }

  function isFree(x, y) {
    if (map[y][x] !== ".") return false;
    if (player.x === x && player.y === y) return false;
    if (enemies.some((e) => e.x === x && e.y === y)) return false;
    return true;
  }

  function placeEntities() {
    let spot;
    do {
      spot = { x: rand(0, mapWidth - 1), y: rand(0, mapHeight - 1) };
    } while (!isFree(spot.x, spot.y));
    player.x = spot.x;
    player.y = spot.y;
    for (let i = 0; i < 10; i++) {
      do {
        spot = { x: rand(0, mapWidth - 1), y: rand(0, mapHeight - 1) };
      } while (!isFree(spot.x, spot.y));
      enemies.push({ x: spot.x, y: spot.y, hp: 30, path: [] });
    }
    for (let i = 0; i < 10; i++) {
      do {
        spot = { x: rand(0, mapWidth - 1), y: rand(0, mapHeight - 1) };
      } while (!isFree(spot.x, spot.y));
      potions.push(spot);
    }
    for (let i = 0; i < 2; i++) {
      do {
        spot = { x: rand(0, mapWidth - 1), y: rand(0, mapHeight - 1) };
      } while (!isFree(spot.x, spot.y));
      swords.push(spot);
    }
  }

  function renderMap() {
    var $field = $(".field");
    $field.empty();
    document.documentElement.style.setProperty("--tile-size", tileSize + "px");
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        let tileChar = map[y][x];
        let tileClass = tileChar === "." ? "tile" : `tile tile${tileChar}`;
        var $tile = $(`<div class="${tileClass}"></div>`);
        $tile.css({ left: x * tileSize, top: y * tileSize });
        $field.append($tile);
      }
    }
    function drawEntity(cls, x, y, hp) {
      var $tile = $(`<div class="tile ${cls}"></div>`);
      if (hp !== undefined) {
        $tile.append(`<div class="health" style="width:${hp}%"></div>`);
      }
      $tile.css({ left: x * tileSize, top: y * tileSize });
      $field.append($tile);
    }
    potions.forEach((p) => drawEntity("tileHP", p.x, p.y));
    swords.forEach((s) => drawEntity("tileSW", s.x, s.y));
    enemies.forEach((e) => drawEntity("tileE", e.x, e.y, e.hp));
    drawEntity("tileP", player.x, player.y, player.hp);
  }

  function movePlayer(dx, dy) {
    let nx = player.x + dx;
    let ny = player.y + dy;
    if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight) return;
    if (!isFree(nx, ny)) return;
    player.x = nx;
    player.y = ny;
    potions = potions.filter((p) => {
      if (p.x === nx && p.y === ny) {
        player.hp = Math.min(player.hp + 30, 100);
        return false;
      }
      return true;
    });
    swords = swords.filter((s) => {
      if (s.x === nx && s.y === ny) {
        player.attack += 10;
        return false;
      }
      return true;
    });
    enemyTurn();
    if (player.hp <= 0) {
      location.reload();
    }
    renderMap();
  }

  function attack() {
    for (let i = enemies.length - 1; i >= 0; i--) {
      let dx = Math.abs(enemies[i].x - player.x);
      let dy = Math.abs(enemies[i].y - player.y);
      if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
        enemies[i].hp -= player.attack;
        if (enemies[i].hp <= 0) enemies.splice(i, 1);
      }
    }
    enemyTurn();
    if (player.hp <= 0) {
      location.reload();
    }
    renderMap();
  }

  // A* Pathfinding Implementation
  class Node {
    constructor(x, y, g = 0, h = 0, parent = null) {
      this.x = x;
      this.y = y;
      this.g = g; // Cost from start
      this.h = h; // Heuristic to goal
      this.f = g + h; // Total cost
      this.parent = parent;
    }
  }

  function aStar(startX, startY, goalX, goalY) {
    let openSet = [];
    let closedSet = new Set();
    let startNode = new Node(
      startX,
      startY,
      0,
      Math.abs(goalX - startX) + Math.abs(goalY - startY)
    );
    openSet.push(startNode);

    while (openSet.length > 0) {
      // Find node with lowest f cost
      let current = openSet.reduce((a, b) => (a.f < b.f ? a : b));
      if (current.x === goalX && current.y === goalY) {
        // Reconstruct path
        let path = [];
        let temp = current;
        while (temp.parent) {
          path.push({ x: temp.x, y: temp.y });
          temp = temp.parent;
        }
        path.reverse();
        return path;
      }
      // Remove current from openSet
      openSet = openSet.filter((node) => node !== current);
      closedSet.add(`${current.x},${current.y}`);

      // Check neighbors
      let neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ];
      for (let neighbor of neighbors) {
        let nx = neighbor.x;
        let ny = neighbor.y;
        if (
          nx < 0 ||
          ny < 0 ||
          nx >= mapWidth ||
          ny >= mapHeight ||
          map[ny][nx] !== "." ||
          closedSet.has(`${nx},${ny}`)
        )
          continue;

        let g = current.g + 1;
        let h = Math.abs(goalX - nx) + Math.abs(goalY - ny);
        let neighborNode = openSet.find((n) => n.x === nx && n.y === ny);
        if (!neighborNode) {
          neighborNode = new Node(nx, ny, g, h, current);
          openSet.push(neighborNode);
        } else if (g < neighborNode.g) {
          neighborNode.g = g;
          neighborNode.f = g + neighborNode.h;
          neighborNode.parent = current;
        }
      }
    }
    return []; // No path found
  }

  function enemyTurn() {
    enemies.forEach((e) => {
      let dx = player.x - e.x;
      let dy = player.y - e.y;
      if (Math.abs(dx) + Math.abs(dy) === 1) {
        player.hp -= 5; // Restore health decrease on adjacency
      }
      if (
        e.path.length === 0 ||
        e.path[e.path.length - 1].x !== player.x ||
        e.path[e.path.length - 1].y !== player.y
      ) {
        e.path = aStar(e.x, e.y, player.x, player.y);
      }
      if (e.path.length > 0) {
        let next = e.path.shift();
        if (isFree(next.x, next.y)) {
          e.x = next.x;
          e.y = next.y;
        }
      }
    });
  }

  this.init = function () {
    generateEmptyMap();
    placeRooms();
    placeCorridors();
    ensureConnectivity();
    placeEntities();
    renderMap();
    $(document).on("keydown", function (e) {
      switch (e.keyCode) {
        case 87: // W
          movePlayer(0, -1);
          break;
        case 65: // A
          movePlayer(-1, 0);
          break;
        case 83: // S
          movePlayer(0, 1);
          break;
        case 68: // D
          movePlayer(1, 0);
          break;
        case 32: // Space
          attack();
          break;
      }
    });
  };
};
