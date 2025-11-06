class Game {
  constructor() {
    this.grid = Array(4).fill(null).map(() => Array(4).fill(0));
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
    this.gameWon = false;
    this.gameOver = false;
    
    this.init();
  }
  
  init() {
    this.addRandomTile();
    this.addRandomTile();
    this.render();
    this.setupEventListeners();
    this.loadUserInfo();
    this.loadLeaderboard();
    this.updateBestScore();
  }
  
  async loadUserInfo() {
    try {
      const res = await fetch('/api/user');
      const data = await res.json();
      document.getElementById('username').textContent = `Hello, ${data.username}!`;
    } catch (err) {
      console.error('Failed to load user info');
    }
  }
  
  async loadLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard');
      const scores = await res.json();
      
      const leaderboardEl = document.getElementById('leaderboard');
      if (scores.length === 0) {
        leaderboardEl.innerHTML = '<p style="text-align: center; color: #999;">No scores yet. Be the first!</p>';
        return;
      }
      
      leaderboardEl.innerHTML = scores.map((item, index) => `
        <div class="leaderboard-item">
          <span class="leaderboard-rank">#${index + 1}</span>
          <span class="leaderboard-username">${item.username}</span>
          <span class="leaderboard-score">${item.score}</span>
        </div>
      `).join('');
    } catch (err) {
      console.error('Failed to load leaderboard');
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
        this.checkGameStatus();
      }
    });
    
    document.getElementById('newGameBtn').addEventListener('click', () => {
      this.newGame();
    });
    
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      try {
        await fetch('/logout', { method: 'POST' });
        window.location.href = '/login.html';
      } catch (err) {
        console.error('Logout failed');
      }
    });
  }
  
  addRandomTile() {
    const emptyCells = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this.grid[r][c] === 0) {
          emptyCells.push({r, c});
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const {r, c} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  }
  
  move(direction) {
    const oldGrid = JSON.stringify(this.grid);
    
    if (direction === 'left') {
      this.moveLeft();
    } else if (direction === 'right') {
      this.grid = this.grid.map(row => row.reverse());
      this.moveLeft();
      this.grid = this.grid.map(row => row.reverse());
    } else if (direction === 'up') {
      this.grid = this.transpose(this.grid);
      this.moveLeft();
      this.grid = this.transpose(this.grid);
    } else if (direction === 'down') {
      this.grid = this.transpose(this.grid);
      this.grid = this.grid.map(row => row.reverse());
      this.moveLeft();
      this.grid = this.grid.map(row => row.reverse());
      this.grid = this.transpose(this.grid);
    }
    
    return oldGrid !== JSON.stringify(this.grid);
  }
  
  moveLeft() {
    for (let r = 0; r < 4; r++) {
      let row = this.grid[r].filter(val => val !== 0);
      
      for (let i = 0; i < row.length - 1; i++) {
        if (row[i] === row[i + 1]) {
          row[i] *= 2;
          this.score += row[i];
          row.splice(i + 1, 1);
        }
      }
      
      while (row.length < 4) {
        row.push(0);
      }
      
      this.grid[r] = row;
    }
  }
  
  transpose(matrix) {
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
  }
  
  checkGameStatus() {
    if (this.hasWon() && !this.gameWon) {
      this.gameWon = true;
      document.getElementById('gameStatus').textContent = 'You Win!';
      document.getElementById('gameStatus').className = 'game-status won';
      this.saveScore();
    }
    
    if (this.isGameOver()) {
      this.gameOver = true;
      document.getElementById('gameStatus').textContent = 'Game Over!';
      document.getElementById('gameStatus').className = 'game-status lost';
      this.saveScore();
    }
  }
  
  hasWon() {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this.grid[r][c] === 2048) {
          return true;
        }
      }
    }
    return false;
  }
  
  isGameOver() {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this.grid[r][c] === 0) return false;
        if (c < 3 && this.grid[r][c] === this.grid[r][c + 1]) return false;
        if (r < 3 && this.grid[r][c] === this.grid[r + 1][c]) return false;
      }
    }
    return true;
  }
  
  async saveScore() {
    try {
      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: this.score })
      });
      this.loadLeaderboard();
    } catch (err) {
      console.error('Failed to save score');
    }
    
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('bestScore', this.bestScore);
      this.updateBestScore();
    }
  }
  
  updateBestScore() {
    document.getElementById('best').textContent = this.bestScore;
  }
  
  render() {
    const board = document.getElementById('gameBoard');
    board.innerHTML = '';
    
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const tile = document.createElement('div');
        const value = this.grid[r][c];
        
        if (value === 0) {
          tile.className = 'tile';
        } else {
          tile.className = `tile tile-${value}`;
          tile.textContent = value;
        }
        
        board.appendChild(tile);
      }
    }
    
    document.getElementById('score').textContent = this.score;
  }
  
  newGame() {
    this.grid = Array(4).fill(null).map(() => Array(4).fill(0));
    this.score = 0;
    this.gameWon = false;
    this.gameOver = false;
    document.getElementById('gameStatus').textContent = '';
    document.getElementById('gameStatus').className = 'game-status';
    
    this.addRandomTile();
    this.addRandomTile();
    this.render();
  }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});