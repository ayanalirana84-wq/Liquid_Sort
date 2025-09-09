document.addEventListener('DOMContentLoaded', () => {
  const gameState = {
    level: 1,
    moves: 0,
    selectedContainer: null,
    containers: [],
    moveHistory: [],
    colors: ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#a55eea', '#ff6b81', '#00d2d3']
  };

  const gameBoard = document.getElementById('game-board');
  const levelElement = document.getElementById('level');
  const movesElement = document.getElementById('moves');
  const messageElement = document.getElementById('message');
  const undoButton = document.getElementById('undo');
  const restartButton = document.getElementById('restart');
  const hintButton = document.getElementById('hint');
  const muteButton = document.getElementById('mute');
  const streamPath = document.getElementById("streamPath");
  const splashContainer = document.getElementById("splash-container");

  // === Sounds ===
  const sounds = {
    pour: document.getElementById("pour-sound"),
    splash: document.getElementById("splash-sound"),
    win: document.getElementById("win-sound"),
    click: document.getElementById("click-sound"),
    error: document.getElementById("error-sound")
  };

  let muted = false;

  function playSound(sound) {
    if (!muted && sound) {
      sound.currentTime = 0;
      sound.play();
    }
  }

  muteButton.addEventListener('click', () => {
    muted = !muted;
    muteButton.textContent = muted ? "🔊 Unmute" : "🔇 Mute";
  });

  undoButton.addEventListener('click', undoMove);
  restartButton.addEventListener('click', restartLevel);
  hintButton.addEventListener('click', showHint);

  initGame();

  function initGame() {
    gameState.moves = 0;
    gameState.selectedContainer = null;
    gameState.moveHistory = [];
    gameState.containers = [];
    updateUI();
    generateLevel();
    renderContainers();
  }

  function getLevelConfig(level) {
    if (level <= 5) return { colors: gameState.colors.slice(0, 3), layersPerColor: 4, filledContainers: 3, totalContainers: 5 };
    if (level <= 10) return { colors: gameState.colors.slice(0, 4), layersPerColor: 4, filledContainers: 4, totalContainers: 6 };
    return { colors: gameState.colors.slice(0, 5), layersPerColor: 4, filledContainers: 5, totalContainers: 7 };
  }

  function generateLevel() {
    gameBoard.innerHTML = '';
    gameState.containers = [];
    const config = getLevelConfig(gameState.level);

    for (let i = 0; i < config.totalContainers; i++) {
      gameState.containers.push({ liquids: [], element: null });
    }

    const colors = [];
    config.colors.forEach(c => { for (let i = 0; i < config.layersPerColor; i++) colors.push(c); });
    shuffleArray(colors);

    let idx = 0;
    colors.forEach(c => {
      gameState.containers[idx].liquids.push(c);
      idx = (idx + 1) % config.filledContainers;
    });

    renderContainers();
  }

  function renderContainers() {
    gameBoard.innerHTML = '';
    gameState.containers.forEach((container, i) => {
      const el = document.createElement('div');
      el.className = 'container';
      el.dataset.index = i;

      container.liquids.forEach((c, j) => {
        const layer = document.createElement('div');
        layer.className = 'liquid-layer';
        layer.style.background = c;
        layer.style.height = `${100 / 4}%`;
        layer.style.bottom = `${(j * 100) / 4}%`;
        el.appendChild(layer);
      });

      el.addEventListener('click', () => handleClick(i));
      gameBoard.appendChild(el);
      container.element = el;
    });
  }

  function handleClick(i) {
    const container = gameState.containers[i];
    if (gameState.selectedContainer === null) {
      if (!container.liquids.length) {
        playSound(sounds.error); // empty tube clicked
        return;
      }
      gameState.selectedContainer = i;
      container.element.classList.add('selected');
      playSound(sounds.click); // tube selected
    } else if (gameState.selectedContainer === i) {
      container.element.classList.remove('selected');
      gameState.selectedContainer = null;
      playSound(sounds.click); // deselect
    } else {
      const source = gameState.containers[gameState.selectedContainer];
      if (isValidPour(source, container)) {
        performPour(gameState.selectedContainer, i);
      } else {
        playSound(sounds.error); // invalid pour
      }
      source.element.classList.remove('selected');
      gameState.selectedContainer = null;
    }
  }

  function isValidPour(source, target) {
    if (!source.liquids.length) return false;
    if (!target.liquids.length) return true;
    return source.liquids.at(-1) === target.liquids.at(-1);
  }

  function performPour(fromIndex, toIndex) {
    const source = gameState.containers[fromIndex];
    const target = gameState.containers[toIndex];

    gameState.moveHistory.push({ from: fromIndex, to: toIndex, color: source.liquids.at(-1) });
    const color = source.liquids.pop();
    target.liquids.push(color);

    gameState.moves++;
    updateUI();

    // Stream animation
    const src = source.element.getBoundingClientRect();
    const tgt = target.element.getBoundingClientRect();
    const x1 = src.left + src.width / 2;
    const y1 = src.top + 30;
    const x2 = tgt.left + tgt.width / 2;
    const y2 = tgt.top + 40;
    const cx = (x1 + x2) / 2;
    const cy = Math.min(y1, y2) - 60;

    streamPath.setAttribute("d", `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`);
    streamPath.setAttribute("stroke", color);
    streamPath.classList.add("active");

    playSound(sounds.pour);

    setTimeout(() => {
      streamPath.classList.remove("active");
      renderContainers();

      const lastLayer = target.element.querySelector('.liquid-layer:last-child');
      if (lastLayer) {
        lastLayer.classList.add('pouring');
        setTimeout(() => lastLayer.classList.remove('pouring'), 2000);
      }

      createSplash(x2, y2, color);
      playSound(sounds.splash);

      if (checkWin()) showLevelComplete();
    }, 600);
  }

  function createSplash(x, y, color) {
    for (let i = 0; i < 5; i++) {
      const p = document.createElement("div");
      p.className = "splash";
      p.style.left = `${x + (Math.random() * 20 - 10)}px`;
      p.style.top = `${y + (Math.random() * 10 - 5)}px`;
      p.style.background = color;
      splashContainer.appendChild(p);
      setTimeout(() => p.remove(), 600);
    }
  }

  function checkWin() {
    return gameState.containers.every(c => !c.liquids.length || (c.liquids.length === 4 && c.liquids.every(l => l === c.liquids[0])));
  }

  function showLevelComplete() {
    messageElement.textContent = `🎉 Level Complete in ${gameState.moves} moves!`;
    messageElement.className = 'level-complete';
    playSound(sounds.win);
    setTimeout(() => { gameState.level++; initGame(); }, 2500);
  }

  function undoMove() {
    if (!gameState.moveHistory.length) {
      playSound(sounds.error); // nothing to undo
      return;
    }
    const last = gameState.moveHistory.pop();
    const src = gameState.containers[last.from];
    const tgt = gameState.containers[last.to];
    tgt.liquids.pop();
    src.liquids.push(last.color);
    gameState.moves--;
    updateUI();
    renderContainers();
    playSound(sounds.click); // undo success
  }

  function restartLevel() { initGame(); }

  function showHint() {
    for (let i = 0; i < gameState.containers.length; i++) {
      const src = gameState.containers[i];
      if (!src.liquids.length) continue;
      for (let j = 0; j < gameState.containers.length; j++) {
        if (i === j) continue;
        const tgt = gameState.containers[j];
        if (isValidPour(src, tgt)) {
          src.element.classList.add('selected');
          tgt.element.style.boxShadow = '0 0 15px #00ff00';
          setTimeout(() => {
            src.element.classList.remove('selected');
            tgt.element.style.boxShadow = '';
          }, 2000);
          return;
        }
      }
    }
  }

  function updateUI() {
    levelElement.textContent = gameState.level;
    movesElement.textContent = gameState.moves;
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
});