const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'db.json');
const PORT = process.env.PORT || 3000;

// --- JSON DB ---
let db_data = { users: {}, sessions: {}, games: {} };

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      db_data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) { console.warn('DB load failed, starting fresh'); }
}

function saveDB() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db_data, null, 2));
}

loadDB();

// --- SERVER SETUP ---
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// In-memory maps
const socketsByUser = new Map(); // userId -> ws
const matchmakingQueues = []; // simple queue of user objects {id, elo}
const games = new Map(); // gameId -> game object

// --- Utilities ---
function now() { return Math.floor(Date.now() / 1000); }

function send(ws, type, payload) {
  const msg = JSON.stringify({ type, payload });
  try { ws.send(msg); } catch (e) { /* ignore */ }
}

function broadcastOnline() {
  const online = Array.from(socketsByUser.keys());
  for (const ws of socketsByUser.values()) send(ws, 'online_list', { online });
}

// Simple ELO update (K=32)
function updateElo(e1, e2, score1) {
  const R1 = Math.pow(10, e1/400);
  const R2 = Math.pow(10, e2/400);
  const E1 = R1/(R1+R2);
  const K = 32;
  const new1 = Math.round(e1 + K*(score1 - E1));
  const new2 = Math.round(e2 + K*((1-score1) - (1-E1)));
  return [new1, new2];
}

// Game logic: board is array of 100 values (10x10) for 5-in-a-row
function checkOutcome(board) {
  const size = 10;
  
  // Check horizontal, vertical, diagonal for 5 in a row
  for (let i = 0; i < 100; i++) {
    if (!board[i]) continue;
    const sym = board[i];
    const row = Math.floor(i / size);
    const col = i % size;
    
    // Check horizontal
    if (col + 4 < size) {
      if (board[i+1] === sym && board[i+2] === sym && board[i+3] === sym && board[i+4] === sym) {
        return { winner: sym };
      }
    }
    
    // Check vertical
    if (row + 4 < size) {
      if (board[i+size] === sym && board[i+2*size] === sym && board[i+3*size] === sym && board[i+4*size] === sym) {
        return { winner: sym };
      }
    }
    
    // Check diagonal down-right
    if (row + 4 < size && col + 4 < size) {
      if (board[i+size+1] === sym && board[i+2*(size+1)] === sym && board[i+3*(size+1)] === sym && board[i+4*(size+1)] === sym) {
        return { winner: sym };
      }
    }
    
    // Check diagonal down-left
    if (row + 4 < size && col - 4 >= 0) {
      if (board[i+size-1] === sym && board[i+2*(size-1)] === sym && board[i+3*(size-1)] === sym && board[i+4*(size-1)] === sym) {
        return { winner: sym };
      }
    }
  }
  
  if (board.every(v => v)) return { draw: true };
  return { ongoing: true };
}

// Simple AI: prefer center > corners > edges; block winning moves; seek winning moves
function aiMove(board) {
  const size = 10;
  const empty = board.map((v,i) => v === null ? i : null).filter(i => i !== null);
  if (empty.length === 0) return null;
  
  // Check if AI (O) can win on next move
  for (const idx of empty) {
    const test = [...board]; test[idx] = 'O';
    if (checkOutcome(test).winner === 'O') return idx;
  }
  
  // Block player (X) from winning
  for (const idx of empty) {
    const test = [...board]; test[idx] = 'X';
    if (checkOutcome(test).winner === 'X') return idx;
  }
  
  // Prefer center area (around position 44-55)
  const centerPrefs = [44, 45, 54, 55, 43, 46, 53, 56, 33, 34, 35, 63, 64, 65];
  for (const idx of centerPrefs) {
    if (empty.includes(idx)) return idx;
  }
  
  // Take any empty
  return empty[Math.floor(Math.random() * empty.length)];
}


// --- REST: Auth ---
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username/password required' });
  if (Object.values(db_data.users).find(u => u.username === username)) {
    return res.status(400).json({ error: 'username taken' });
  }
  const id = uuidv4();
  const hash = await bcrypt.hash(password, 10);
  db_data.users[id] = { id, username, password_hash: hash, elo: 1200, created_at: now() };
  saveDB();
  res.json({ ok: true });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username/password required' });
  const user = Object.values(db_data.users).find(u => u.username === username);
  if (!user) return res.status(400).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ error: 'invalid' });
  const token = uuidv4();
  db_data.sessions[token] = { token, user_id: user.id, created_at: now() };
  saveDB();
  res.json({ token, user: { id: user.id, username: user.username, elo: user.elo } });
});

app.get('/api/user/:id/stats', (req, res) => {
  const uid = req.params.id;
  const user = db_data.users[uid];
  if (!user) return res.status(404).json({ error: 'not found' });
  const games = Object.values(db_data.games).filter(g => g.player_x === uid || g.player_o === uid);
  res.json({ user: { id: user.id, username: user.username, elo: user.elo, created_at: user.created_at }, games: games.slice(-50) });
});

// --- WebSocket protocol ---
function authFromToken(token, cb) {
  const sess = db_data.sessions[token];
  if (!sess) return cb(null);
  const user = db_data.users[sess.user_id];
  if (!user) return cb(null);
  cb({ id: user.id, username: user.username, elo: user.elo });
}

// Simple matchmaking find: find someone within +/-150 ELO else queue
function tryMatch(user) {
  // find first in queue within window
  const idx = matchmakingQueues.findIndex(q => Math.abs(q.elo - user.elo) <= 150 && q.id !== user.id);
  if (idx >= 0) {
    const opponent = matchmakingQueues.splice(idx,1)[0];
    return opponent;
  }
  // push if none
  matchmakingQueues.push(user);
  return null;
}

wss.on('connection', function connection(ws) {
  ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);

  ws.user = null;

  ws.on('message', async function incoming(message) {
    try {
      const msg = JSON.parse(message.toString());
      const { type, payload } = msg;
      if (type === 'auth') {
        const { token } = payload || {};
        authFromToken(token, (user) => {
          if (!user) return send(ws, 'auth_result', { ok: false });
          ws.user = user;
          socketsByUser.set(user.id, ws);
          send(ws, 'auth_result', { ok: true, user });
          broadcastOnline();
        });
      } else if (type === 'request_match') {
        if (!ws.user) return send(ws, 'error', { msg: 'not authenticated' });
        const { vsAI } = payload || {};
        if (vsAI) {
          // AI mode: create game with AI opponent
          const gameId = uuidv4();
          const game = {
            id: gameId,
            board: Array(100).fill(null),
            x: ws.user.id,
            o: 'AI',
            turn: 'X',
            moves: [],
            status: 'playing',
            isAI: true
          };
          games.set(gameId, game);
          db_data.games[gameId] = { id: gameId, player_x: game.x, player_o: 'AI', moves: [], result: 'ongoing', winner: null, created_at: now() };
          saveDB();
          send(ws, 'match_found', { gameId, you: 'X', opponent: { id: 'AI', username: 'AI Player' } });
        } else {
          const opponent = tryMatch(ws.user);
          if (opponent) {
            // start game
            const gameId = uuidv4();
            const game = {
              id: gameId,
              board: Array(100).fill(null),
              x: ws.user.id,
              o: opponent.id,
              turn: 'X',
              moves: [],
              status: 'playing'
            };
            games.set(gameId, game);
            // persist
            db_data.games[gameId] = { id: gameId, player_x: game.x, player_o: game.o, moves: [], result: 'ongoing', winner: null, created_at: now() };
            saveDB();
            // notify both players
            const ows = socketsByUser.get(opponent.id);
            send(ws, 'match_found', { gameId, you: 'X', opponent: opponent });
            if (ows) send(ows, 'match_found', { gameId, you: 'O', opponent: ws.user });
          } else {
            send(ws, 'match_queued', { msg: 'queued' });
          }
        }
      } else if (type === 'make_move') {
        const { gameId, index } = payload || {};
        const game = games.get(gameId);
        if (!game) return send(ws, 'error', { msg: 'invalid game' });
        if (game.status !== 'playing') return send(ws, 'error', { msg: 'game not active' });
        const playerSymbol = (ws.user.id === game.x) ? 'X' : ((ws.user.id === game.o) ? 'O' : null);
        if (!playerSymbol) return send(ws, 'error', { msg: 'not in game' });
        if ((game.turn !== playerSymbol)) return send(ws, 'error', { msg: 'not your turn' });
        if (index < 0 || index >= 100 || game.board[index]) return send(ws, 'error', { msg: 'invalid move' });
        game.board[index] = playerSymbol;
        game.moves.push({ by: ws.user.id, index, sym: playerSymbol, at: now() });
        game.turn = (playerSymbol === 'X') ? 'O' : 'X';
        const out = checkOutcome(game.board);
        if (out.winner) {
          game.status = 'finished';
          game.result = 'win';
          game.winner = out.winner === 'X' ? game.x : game.o;
        } else if (out.draw) {
          game.status = 'finished';
          game.result = 'draw';
        }
        // persist moves
        db_data.games[gameId].moves = game.moves;
        db_data.games[gameId].result = game.result || 'ongoing';
        db_data.games[gameId].winner = game.winner || null;
        saveDB();
        // notify both
        const ws1 = socketsByUser.get(game.x);
        const ws2 = socketsByUser.get(game.o);
        if (ws1) send(ws1, 'game_update', { game });
        if (ws2) send(ws2, 'game_update', { game });

        // AI move if AI is playing and game still ongoing
        if (game.isAI && game.status === 'playing' && game.turn === 'O') {
          setTimeout(() => {
            const aiIdx = aiMove(game.board);
            if (aiIdx !== null) {
              game.board[aiIdx] = 'O';
              game.moves.push({ by: 'AI', index: aiIdx, sym: 'O', at: now() });
              game.turn = 'X';
              const out = checkOutcome(game.board);
              if (out.winner) {
                game.status = 'finished';
                game.result = 'win';
                game.winner = out.winner === 'X' ? game.x : 'AI';
              } else if (out.draw) {
                game.status = 'finished';
                game.result = 'draw';
              }
              db_data.games[game.id].moves = game.moves;
              db_data.games[game.id].result = game.result || 'ongoing';
              db_data.games[game.id].winner = game.winner || null;
              saveDB();
              if (ws1) send(ws1, 'game_update', { game });
            }
          }, 1000);
        }

        if (game.status === 'finished') {
          // update ELO
          const u1 = db_data.users[game.x];
          const u2 = db_data.users[game.o];
          if (u1 && u2) {
            let s1 = 0.5;
            if (game.result === 'draw') s1 = 0.5;
            else if (game.winner === game.x) s1 = 1.0;
            else s1 = 0.0;
            const [n1, n2] = updateElo(u1.elo, u2.elo, s1);
            u1.elo = n1; u2.elo = n2;
            saveDB();
          }
          }
        }
      else if (type === 'propose_draw' || type === 'resign' || type === 'pause') {
        const { gameId } = payload || {};
        const game = games.get(gameId);
        if (!game) return send(ws, 'error', { msg: 'invalid game' });
        const ws1 = socketsByUser.get(game.x);
        const ws2 = socketsByUser.get(game.o);
        // simple broadcast of control action
        if (ws1) send(ws1, type, { by: ws.user.id, gameId });
        if (ws2) send(ws2, type, { by: ws.user.id, gameId });
        if (type === 'resign') {
          game.status = 'finished';
          game.result = 'resign';
          game.winner = (ws.user.id === game.x) ? game.o : game.x;
          db_data.games[gameId].result = game.result;
          db_data.games[gameId].winner = game.winner;
          saveDB();
        }
      } else if (type === 'request_replay') {
        const { gameId } = payload || {};
        const g = db_data.games[gameId];
        if (!g) return send(ws, 'error', { msg: 'not found' });
        send(ws, 'replay_data', { gameId, moves: g.moves || [] });
      }
    } catch (e) {
      send(ws, 'error', { msg: 'invalid message' });
    }
  });

  ws.on('close', () => {
    if (ws.user) {
      socketsByUser.delete(ws.user.id);
      // remove from matchmaking if queued
      const idx = matchmakingQueues.findIndex(q => q.id === ws.user.id);
      if (idx >= 0) matchmakingQueues.splice(idx,1);
      broadcastOnline();
    }
  });
});

// Periodic ping
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false; ws.ping(() => {});
  });
}, 30000);

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
