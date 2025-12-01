# Tic-Tac-Toe Online Game

A multiplayer Tic-Tac-Toe game with user authentication, ELO rating system, and AI opponent. Play on a 10x10 board where you need to get 5 in a row (horizontal, vertical, or diagonal) to win!

## 🎮 Features

- **User Authentication**: Register and login with secure password hashing
- **10x10 Game Board**: Get 5-in-a-row to win (horizontal, vertical, or diagonal)
- **AI Opponent**: Smart AI that tries to win and blocks your winning moves
- **Multiplayer Mode**: Find and play against other online players
- **ELO Rating System**: Track your skill level and compete in ranked matches
- **Game History**: View your past games and replay moves
- **Real-time Updates**: WebSocket-based live game synchronization
- **Persistent Storage**: All game data saved locally

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

## 🚀 Installation & Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/NDTrung20215249/Tic-tac-toe.git
cd Tic-tac-toe/tictactoe
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install the required packages:
- `express` - Web server framework
- `ws` - WebSocket library for real-time communication
- `bcrypt` - Password hashing
- `uuid` - Unique ID generation

### Step 3: Start the Server
```bash
node server.js
```

You should see:
```
Server running on http://localhost:3000
```

### Step 4: Open in Browser
Visit `http://localhost:3000` in your web browser

## 💻 Usage

### First Time
1. Click **Register** and create an account with username and password
2. Click **Login** with your credentials

### Playing the Game

#### Play vs AI
- Click **"Play vs AI"** button in the lobby
- You play as **X** (you go first)
- AI plays as **O**
- Click cells on the 10x10 grid to make your move
- First to get 5 in a row wins!

#### Play vs Other Players
- Click **"Find Multiplayer Match"** button
- Wait for another player to join the matchmaking queue
- Game starts when a match is found
- You play as **X**, opponent plays as **O**
- ELO rating is updated after each match

### Game Controls
- **Click a cell** on the board to place your mark
- **Resign** - Give up and lose the game
- **Propose Draw** - Suggest ending the game in a tie
- **Request Replay** - View the moves from your last game

## 📁 Project Structure

```
tictactoe/
├── server.js              # Main server file (Express + WebSocket)
├── package.json           # Project dependencies
├── db.json                # Game data storage (auto-created)
├── public/
│   ├── index.html         # Main UI
│   ├── client.js          # Client-side game logic
│   └── styles.css         # Styling
└── README.md              # This file
```

## 🔧 How It Works

### Architecture
- **Backend**: Node.js with Express.js web server and WebSocket server
- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **Database**: JSON file (`db.json`) for persistence
- **Authentication**: bcrypt for password hashing + JWT-style tokens

### Game Logic
- **Board**: 100 cells (10x10 grid), indexed 0-99
- **Winning Condition**: 5 consecutive marks (X or O) in any direction
- **AI Strategy**: 
  - Tries to complete 5-in-a-row
  - Blocks opponent's winning moves
  - Prefers center positions
  - Random selection for other moves

### ELO Rating System
- **Starting Rating**: 1200 for new players
- **Calculation**: K-factor of 32 based on opponent strength
- **Updates**: Only for completed multiplayer games (not AI matches)

## 🚢 Deployment

### Running on Different Port
```bash
PORT=8080 node server.js
```

### Running on Different Machine (Network Access)

To allow other computers on your network to connect:

1. Open `server.js`
2. Find the line: `server.listen(PORT, () => console.log(...)`
3. Change it to: `server.listen(PORT, '0.0.0.0', () => console.log(...)`
4. Save and restart the server
5. On other machines, visit: `http://<your-machine-ip>:3000`

**Get your machine IP:**
- Windows: Open Command Prompt and type `ipconfig` (look for IPv4 Address)
- Mac/Linux: Open Terminal and type `ifconfig` (look for inet)

**Example**: If your IP is `192.168.1.100`, visit `http://192.168.1.100:3000`

## 📝 API Endpoints

### REST API
- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `GET /api/user/:id/stats` - Get user statistics

### WebSocket Messages
- `auth` - Authenticate connection
- `request_match` - Request a game (AI or multiplayer)
- `make_move` - Place a mark on the board
- `propose_draw` - Suggest a draw
- `resign` - Forfeit the game
- `request_replay` - Get past game moves

## 🐛 Troubleshooting

### "Address already in use" error
Another process is using port 3000. Either:
- Kill the process using port 3000
- Use a different port: `PORT=8080 node server.js`

**On Windows (PowerShell):**
```powershell
Get-Process | Where-Object {$_.Name -eq 'node'} | Stop-Process -Force
```

### Node.js not found
Ensure Node.js is installed: `node --version`

If not installed, download from [nodejs.org](https://nodejs.org/)

### Dependencies not installing
Try clearing npm cache:
```bash
npm cache clean --force
npm install
```

### Game not loading
- Clear browser cache (Ctrl+Shift+Delete)
- Check browser console for errors (F12 → Console tab)
- Ensure server is running on port 3000
- Try accessing `http://localhost:3000`

### Multiplayer not working
- Check that both players are on the same network (if on different machines)
- Ensure firewall allows port 3000
- Both players must be logged in
- Wait for the matchmaking to find an opponent

## 🎯 Tips & Tricks

- **Board Strategy**: The 10x10 board is larger than classic 3x3, so positioning matters more
- **Center Control**: Controlling center positions gives more winning opportunities
- **AI Difficulty**: AI is moderately challenging but beatable with good strategy
- **ELO Ranking**: Your ranking only changes in multiplayer matches, not against AI
- **Replay Learning**: Use the replay feature to analyze your losses

## 🎯 Future Improvements

- [ ] Database migration to MongoDB/PostgreSQL
- [ ] HTTPS/SSL support
- [ ] Mobile app version
- [ ] Larger board sizes (15x15, 20x20)
- [ ] Time-based matches
- [ ] Spectator mode
- [ ] Chat between players
- [ ] Advanced AI difficulty levels

## 📜 License

This project is open source and available for personal and educational use.

## 👨‍💻 Author

Created by **Trung** (NDTrung20215249)

Feel free to fork, modify, and improve the project!

## 💬 Support

For issues or questions, please open an issue on GitHub:
[https://github.com/NDTrung20215249/Tic-tac-toe/issues](https://github.com/NDTrung20215249/Tic-tac-toe/issues)
