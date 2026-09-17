(() => {
  const PRESETS = {
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    expert: { rows: 16, cols: 30, mines: 99 },
  };

  const vscode = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;

  const boardEl = document.getElementById("board");
  const minesEl = document.getElementById("mines");
  const timerEl = document.getElementById("timer");
  const resetEl = document.getElementById("reset");
  const difficultyEl = document.getElementById("difficulty");

  let rows = 9;
  let cols = 9;
  let mineCount = 10;
  let cells = [];
  let started = false;
  let over = false;
  let flags = 0;
  let revealedCount = 0;
  let seconds = 0;
  let timerId = null;

  function pad(n) {
    return String(Math.max(0, Math.min(999, n))).padStart(3, "0");
  }

  function index(r, c) {
    return r * cols + c;
  }

  function neighbors(r, c) {
    const list = [];
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) {
          continue;
        }
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          list.push(index(nr, nc));
        }
      }
    }
    return list;
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    timerId = setInterval(() => {
      seconds += 1;
      timerEl.textContent = pad(seconds);
    }, 1000);
  }

  function setFace(emoji) {
    resetEl.textContent = emoji;
  }

  function applyPreset(name) {
    const preset = PRESETS[name] || PRESETS.beginner;
    rows = preset.rows;
    cols = preset.cols;
    mineCount = preset.mines;
    difficultyEl.value = PRESETS[name] ? name : "beginner";
  }

  function plantMines(safeIndex) {
    const forbidden = new Set([safeIndex, ...neighbors(Math.floor(safeIndex / cols), safeIndex % cols)]);
    const spots = [];
    for (let i = 0; i < cells.length; i += 1) {
      if (!forbidden.has(i)) {
        spots.push(i);
      }
    }
    for (let i = spots.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = spots[i];
      spots[i] = spots[j];
      spots[j] = tmp;
    }
    const placed = spots.slice(0, mineCount);
    for (const i of placed) {
      cells[i].mine = true;
    }
    for (let i = 0; i < cells.length; i += 1) {
      if (cells[i].mine) {
        continue;
      }
      const r = Math.floor(i / cols);
      const c = i % cols;
      cells[i].adjacent = neighbors(r, c).reduce((sum, ni) => sum + (cells[ni].mine ? 1 : 0), 0);
    }
  }

  function renderCell(i) {
    const cell = cells[i];
    const btn = boardEl.children[i];
    btn.className = "cell";
    btn.textContent = "";
    btn.disabled = over && !cell.mine && !cell.revealed;

    if (cell.revealed) {
      btn.classList.add("revealed");
      if (cell.mine) {
        btn.classList.add("mine");
        if (cell.exploded) {
          btn.classList.add("exploded");
          btn.textContent = "✸";
        } else {
          btn.textContent = "●";
        }
      } else if (cell.adjacent > 0) {
        btn.classList.add(`n${cell.adjacent}`);
        btn.textContent = String(cell.adjacent);
      }
      return;
    }

    if (over && cell.mine) {
      btn.classList.add("revealed", "mine");
      btn.textContent = cell.flagged ? "⚑" : "●";
      return;
    }

    if (over && cell.flagged && !cell.mine) {
      btn.classList.add("wrong");
      return;
    }

    if (cell.flagged) {
      btn.classList.add("flagged");
    }
  }

  function renderAll() {
    minesEl.textContent = pad(mineCount - flags);
    timerEl.textContent = pad(seconds);
    for (let i = 0; i < cells.length; i += 1) {
      renderCell(i);
    }
  }

  function reveal(i) {
    const cell = cells[i];
    if (over || cell.revealed || cell.flagged) {
      return;
    }
    if (!started) {
      started = true;
      plantMines(i);
      startTimer();
    }
    cell.revealed = true;
    if (cell.mine) {
      cell.exploded = true;
      lose();
      return;
    }
    revealedCount += 1;
    if (cell.adjacent === 0) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      for (const ni of neighbors(r, c)) {
        reveal(ni);
      }
    }
    checkWin();
  }

  function toggleFlag(i) {
    const cell = cells[i];
    if (over || cell.revealed) {
      return;
    }
    cell.flagged = !cell.flagged;
    flags += cell.flagged ? 1 : -1;
    renderAll();
  }

  function chord(i) {
    const cell = cells[i];
    if (over || !cell.revealed || cell.adjacent === 0) {
      return;
    }
    const r = Math.floor(i / cols);
    const c = i % cols;
    const around = neighbors(r, c);
    const flaggedAround = around.filter((ni) => cells[ni].flagged).length;
    if (flaggedAround !== cell.adjacent) {
      return;
    }
    for (const ni of around) {
      if (!cells[ni].flagged && !cells[ni].revealed) {
        reveal(ni);
      }
    }
    renderAll();
  }

  function lose() {
    over = true;
    stopTimer();
    document.body.classList.add("lost");
    setFace("💥");
    renderAll();
  }

  function checkWin() {
    if (revealedCount === rows * cols - mineCount) {
      over = true;
      stopTimer();
      document.body.classList.add("won");
      setFace("😎");
      flags = mineCount;
      cells.forEach((cell) => {
        if (cell.mine) {
          cell.flagged = true;
        }
      });
      renderAll();
    }
  }

  function newGame() {
    stopTimer();
    started = false;
    over = false;
    flags = 0;
    revealedCount = 0;
    seconds = 0;
    document.body.classList.remove("lost", "won");
    setFace("🙂");
    cells = Array.from({ length: rows * cols }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      exploded: false,
      adjacent: 0,
    }));
    boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell))`;
    boardEl.replaceChildren();
    for (let i = 0; i < cells.length; i += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell";
      btn.setAttribute("role", "gridcell");
      btn.addEventListener("click", (event) => {
        if (event.detail === 2) {
          chord(i);
        } else {
          reveal(i);
        }
        renderAll();
      });
      btn.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        toggleFlag(i);
      });
      btn.addEventListener("auxclick", (event) => {
        if (event.button === 1) {
          event.preventDefault();
          chord(i);
          renderAll();
        }
      });
      btn.addEventListener("mousedown", () => {
        if (!over) {
          setFace("😮");
        }
      });
      btn.addEventListener("mouseup", () => {
        if (!over) {
          setFace("🙂");
        }
      });
      boardEl.appendChild(btn);
    }
    renderAll();
  }

  resetEl.addEventListener("click", () => newGame());

  difficultyEl.addEventListener("change", () => {
    applyPreset(difficultyEl.value);
    if (vscode) {
      vscode.postMessage({ type: "setDifficulty", difficulty: difficultyEl.value });
    }
    newGame();
  });

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message && message.type === "init") {
      applyPreset(message.difficulty);
      newGame();
    }
  });

  applyPreset("beginner");
  newGame();
  if (vscode) {
    vscode.postMessage({ type: "ready" });
  }
})();
