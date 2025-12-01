# Tic-Tac-Toe Multiplayer (local)

This project provides a simple Tic-Tac-Toe server with matchmaking, user management (register/login), ELO ranking, game history, and a browser GUI.

Prerequisites
- Node.js (16+)
- MSYS2 / Windows only: not required for this Node app

Install & Run

1. Open a terminal in `e:/Code/tictactoe`
2. Install dependencies:

```powershell
npm install
```

3. Start server:

```powershell
npm start
```

4. Open `http://localhost:3000` in your browser.

Notes
- This is a minimal demo. For production, add HTTPS, session expiry, input validation and sanitization.
- Database is stored in `tictactoe.db` in project folder.
