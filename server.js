const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs'); // npm i bcryptjs
const path = require('path');

const app = express();
const PORT = 3000;

// In-memory storage (demo only)
const users = [];
const gameScores = [];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Always use absolute path for static files
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,      // true only behind HTTPS
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Auth guard
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) return next();
  return res.redirect('/login.html');
};

// Routes

// Redirect root to login or game
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/game.html');
  }
  return res.redirect('/login.html');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (users.find(u => u.username === username)) return res.status(400).json({ error: 'Username already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: Date.now().toString(), username, password: hashedPassword };
  users.push(user);
  res.json({ message: 'Registration successful' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ message: 'Login successful' });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

app.get('/api/user', isAuthenticated, (req, res) => {
  res.json({ username: req.session.username });
});

app.post('/api/score', isAuthenticated, (req, res) => {
  const { score } = req.body;
  gameScores.push({
    userId: req.session.userId,
    username: req.session.username,
    score,
    date: new Date()
  });
  res.json({ message: 'Score saved' });
});

app.get('/api/leaderboard', (req, res) => {
  const topScores = [...gameScores]  // copy to avoid mutating original
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  res.json(topScores);
});

// Protected game route (optional)
app.get('/game', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
