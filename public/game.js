class Game2048 {
  constructor() {
    this.board = [];
    this.score = 0;
    this.best = localStorage.getItem('best') || 0;
    this.gameOver = false;
    this.init();
    this.setupEventListeners();
    this.loadUser();
    this.loadLeaderboard();
  }

  init() {
    this.board = Array(4).fill(null).map(() => Array(4).fill(0));
    this.score = 0;
    this.gameOver = false;
    this.addRandomTile();
    this.addRandomTile();
    this.render();
    document.getElementById('gameOver').classList.add('hidden');
  }

  async loadUser() {
    try {
      const res = await fetch('/api/user');
      const data = await res.json();
      document.getElementById('username').textContent = data.username;
    } catch (err) {
      console.error('Error loading user:', err);
    }
  }

  async loadLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard');
      const scores = await res.json();
      const leaderboardEl = document.getElementById('leaderboard');
      
      if (scores.length === 0) {
        leaderboardEl.innerHTML = '<p style="text-align: center; color: #999;">No scores yet</p>';
        return;
      }
      
      leaderboardEl.innerHTML = scores.map((s, i) => `
        <div class="leaderboard-item">
          <span class="leaderboard-rank">#${i + 1}</span>
          <span class="leaderboard-name">${s.username}</span>
          <span class="leaderboard-score">${s.score}</span>
        </div>
      `).join('');
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    }
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (this.gameOver) return;
      
      let moved = false;
      switch(e.key) {
        case 'ArrowUp':
          e.preventDefault();
          moved = this.move('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          moved = this.move('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          moved = this.move('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          moved = this.move('right');
          break;
      }
      
      if (moved) {
        this.addRandomTile();
        this.render();
        
        if (this.isGameOver()) {
          this.gameOver = true;
          this.showGameOver();
        }
      }
    });

    document.getElementById('newGameBtn').addEventListener('click', () => {
      this.init();
    });

    document.getElementById('tryAgainBtn').addEventListener('click', () => {
      this.init();
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
      try {
        await fetch('/logout', { method: 'POST' });
        window.location.href = '/login.html';
      } catch (err) {
        console.error('Error logging out:', err);
      }
    });
  }

  addRandomTile() {
    const emptyCells = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (this.board[i][j] === 0) {
          emptyCells.push({i, j});
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const {i, j} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.board[i][j] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  move(direction) {
    const oldBoard = JSON.stringify(this.board);
    
    if (direction === 'left') {
      for (let i = 0; i < 4; i++) {
        this.board[i] = this.mergeLine(this.board[i]);
      }
    } else if (direction === 'right') {
      for (let i = 0; i < 4; i++) {
        this.board[i] = this.mergeLine(this.board[i].reverse()).reverse();
      }
    } else if (direction === 'up') {
      for (let j = 0; j < 4; j++) {
        const column = [this.board[0][j], this.board[1][j], this.board[2][j], this.board[3][j]];
        const merged = this.mergeLine(column);
        for (let i = 0; i < 4; i++) {
          this.board[i][j] = merged[i];
        }
      }
    } else if (direction === 'down') {
      for (let j = 0; j < 4; j++) {
        const column = [this.board[0][j], this.board[1][j], this.board[2][j], this.board[3][j]];
        const merged = this.mergeLine(column.reverse()).reverse();
        for (let i = 0; i < 4; i++) {
          this.board[i][j] = merged[i];
        }
      }
    }
    
    return oldBoard !== JSON.stringify(this.board);
  }

  mergeLine(line) {
    let newLine = line.filter(val => val !== 0);
    
    for (let i = 0; i < newLine.length - 1; i++) {
      if (newLine[i] === newLine[i + 1]) {
        newLine[i] *= 2;
        this.score += newLine[i];
        newLine.splice(i + 1, 1);
      }
    }
    
    while (newLine.length < 4) {
      newLine.push(0);
    }
    
    return newLine;
  }

  isGameOver() {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (this.board[i][j] === 0) return false;
        if (j < 3 && this.board[i][j] === this.board[i][j + 1]) return false;
        if (i < 3 && this.board[i][j] === this.board[i + 1][j]) return false;
      }
    }
    return true;
  }

  async showGameOver() {
    document.getElementById('finalScore').textContent = this.score;
    document.getElementById('gameOver').classList.remove('hidden');
    
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem('best', this.best);
      document.getElementById('best').textContent = this.best;
    }
    
    try {
      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: this.score })
      });
      this.loadLeaderboard();
    } catch (err) {
      console.error('Error saving score:', err);
    }
  }

  render() {
    const boardEl = document.getElementById('gameBoard');
    boardEl.innerHTML = '';
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        
        if (this.board[i][j] !== 0) {
          tile.textContent = this.board[i][j];
          tile.setAttribute('data-value', this.board[i][j]);
        }
        
        boardEl.appendChild(tile);
      }
    }
    
    document.getElementById('score').textContent = this.score;
    document.getElementById('best').textContent = this.best;
  }
}

const game = new Game2048();