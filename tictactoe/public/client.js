(() => {
  const api = {
    register: (u,p) => fetch('/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:u,password:p})}).then(r=>r.json()),
    login: (u,p) => fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:u,password:p})}).then(r=>r.json()),
    stats: (id) => fetch(`/api/user/${id}/stats`).then(r=>r.json())
  };

  let token = localStorage.getItem('ttt_token');
  let me = null;
  let ws = null;
  let currentGame = null;

  const $ = id => document.getElementById(id);

  function show(id) { document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden')); $(id).classList.remove('hidden'); }

  async function init() {
    $('btnRegister').onclick = async () => {
      const u = $('username').value.trim(); const p = $('password').value;
      const r = await api.register(u,p);
      alert(r.error || 'Registered. You can login.');
    };
    $('btnLogin').onclick = async () => {
      const u = $('username').value.trim(); const p = $('password').value;
      const r = await api.login(u,p);
      if (r.error) return alert(r.error);
      token = r.token; localStorage.setItem('ttt_token', token); me = r.user; onLogin();
    };
    $('btnFindMatch').onclick = () => send({ type: 'request_match', payload: { vsAI: false } });
    $('btnPlayAI').onclick = () => send({ type: 'request_match', payload: { vsAI: true } });
    $('btnResign').onclick = () => { if (currentGame) send({ type: 'resign', payload: { gameId: currentGame.id } }); };
    $('btnProposeDraw').onclick = () => { if (currentGame) send({ type: 'propose_draw', payload: { gameId: currentGame.id } }); };
    $('btnReplay').onclick = () => { if (currentGame) send({ type: 'request_replay', payload: { gameId: currentGame.id } }); };

    if (token) {
      // try open ws and auth
      onLogin();
    }
  }

  function connectWS() {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onopen = () => send({ type: 'auth', payload: { token } });
    ws.onmessage = (ev) => {
      try {
        const { type, payload } = JSON.parse(ev.data);
        handleMsg(type, payload);
      } catch (e) { console.error('bad msg', e); }
    };
    ws.onclose = () => { console.log('ws closed'); setTimeout(connectWS,1000); };
  }

  function send(obj) { if (!ws || ws.readyState !== WebSocket.OPEN) return alert('Not connected'); ws.send(JSON.stringify(obj)); }

  function handleMsg(type,p) {
    if (type === 'auth_result') {
      if (p.ok) {
        me = p.user; $('me').innerText = me.username; $('myelo').innerText = me.elo; show('lobby');
      } else { alert('Auth failed'); localStorage.removeItem('ttt_token'); show('auth'); }
    } else if (type === 'online_list') {
      const list = p.online || [];
      const ul = $('onlineList'); ul.innerHTML = '';
      list.forEach(id => { const li = document.createElement('li'); li.innerText = id; ul.appendChild(li); });
    } else if (type === 'match_queued') {
      alert('Queued for match');
    } else if (type === 'match_found') {
      // start game UI
      currentGame = { id: p.gameId, you: p.you, opponent: p.opponent, board: Array(100).fill(null) };
      $('oppName').innerText = p.opponent.username || p.opponent.id;
      show('game'); renderBoard(); log('Match started');
    } else if (type === 'game_update') {
      currentGame = p.game;
      renderBoard(); if (currentGame.status === 'finished') {
        if (currentGame.result === 'draw') alert('Draw'); else alert('Winner: ' + (currentGame.winner === me.id ? 'You' : 'Opponent'));
        show('lobby');
      }
    } else if (type === 'replay_data') {
      playReplay(p.moves || []);
    } else if (type === 'error') { alert(p.msg || 'Error'); }
  }

  function renderBoard() {
    const bd = currentGame.board || Array(100).fill(null);
    const el = $('board'); el.innerHTML = '';
    bd.forEach((v,i) => {
      const c = document.createElement('div'); c.className = 'cell'; if (v) c.innerText = v; else c.onclick = () => onCellClick(i);
      el.appendChild(c);
    });
    $('gameLog').innerText = JSON.stringify(currentGame.moves || [], null, 2);
  }

  function onCellClick(i) {
    if (!currentGame) return;
    send({ type: 'make_move', payload: { gameId: currentGame.id, index: i } });
  }

  function log(msg) { const p = $('gameLog'); p.innerText = (new Date()).toLocaleTimeString() + ' ' + msg + '\n' + p.innerText; }

  function playReplay(moves) {
    // simple replay animation
    let b = Array(9).fill(null);
    const steps = moves.slice();
    show('game');
    let i = 0;
    const interval = setInterval(() => {
      if (i >= steps.length) { clearInterval(interval); return; }
      const s = steps[i++]; b[s.index] = s.sym; currentGame = { board: b, moves: steps.slice(0,i) }; renderBoard();
    }, 600);
  }

  function onLogin() {
    connectWS();
  }

  window.addEventListener('load', init);
})();
