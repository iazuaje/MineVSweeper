(() => {
  const PRESETS = {
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    expert: { rows: 16, cols: 30, mines: 99 },
  };

  const vscode = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;

  const boardEl = document.getElementById("board");
  const boardWrapEl = document.querySelector(".board-wrap");
  const minesEl = document.getElementById("mines");
  const timerEl = document.getElementById("timer");
  const resetEl = document.getElementById("reset");
  const difficultyEl = document.getElementById("difficulty");

  const MIN_CELL = 14;
  const MAX_CELL = 36;

  function updateLayout() {
    if (!boardWrapEl || cols < 1 || rows < 1) {
      return;
    }
    const rect = boardWrapEl.getBoundingClientRect();
    const styles = getComputedStyle(boardWrapEl);
    const padX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const padY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const innerW = rect.width - padX;
    const innerH = rect.height - padY;
    if (innerW <= 0 || innerH <= 0) {
      return;
    }
    const rootStyles = getComputedStyle(document.documentElement);
    const gap =
      parseFloat(rootStyles.getPropertyValue("--cell-gap").trim()) ||
      3;
    const totalGapX = gap * Math.max(0, cols - 1);
    const totalGapY = gap * Math.max(0, rows - 1);
    const byW = (innerW - totalGapX) / cols;
    const byH = (innerH - totalGapY) / rows;
    const size = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(Math.min(byW, byH) * 10) / 10));
    document.documentElement.style.setProperty("--cell-size", `${size}px`);
    document.documentElement.style.setProperty(
      "--cell-font",
      `${Math.max(10, Math.min(17, Math.round(size * 0.52)))}px`
    );
  }

  if (typeof ResizeObserver !== "undefined" && boardWrapEl) {
    const ro = new ResizeObserver(() => updateLayout());
    ro.observe(boardWrapEl);
  }
  window.addEventListener("resize", updateLayout);

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
      if (cell.revealAnim) {
        btn.classList.add("reveal-animate");
        cell.revealAnim = false;
      }
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
    cell.revealAnim = true;
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
      revealAnim: false,
    }));
    boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
    boardEl.style.gridTemplateRows = `repeat(${rows}, var(--cell-size))`;
    boardEl.replaceChildren();
    for (let i = 0; i < cells.length; i += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell";
      btn.setAttribute("role", "gridcell");
      btn.addEventListener("click", () => {
        const cell = cells[i];
        if (cell.revealed && cell.adjacent > 0 && !cell.mine) {
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
      btn.addEventListener("mousedown", (event) => {
        if (event.button !== 0 || over) {
          return;
        }
        const cell = cells[i];
        // Pressed en ocultas y en números revelados (feedback del acordeón)
        if (!cell.revealed || (cell.adjacent > 0 && !cell.mine)) {
          btn.classList.add("pressed");
        }
        setFace("😮");
      });
      const releasePress = () => btn.classList.remove("pressed");
      btn.addEventListener("mouseup", () => {
        releasePress();
        if (!over) {
          setFace("🙂");
        }
      });
      btn.addEventListener("mouseleave", releasePress);
      boardEl.appendChild(btn);
    }
    renderAll();
    requestAnimationFrame(updateLayout);
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
