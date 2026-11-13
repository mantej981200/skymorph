const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const WORLD_WIDTH = 2400;
const GROUND_Y = 550;
const XP_LIMITS =;
let players = {};
let foods = [];

for (let i = 0; i < 45; i++) {
  foods.push({
    id: i,
    x: Math.random() * WORLD_WIDTH,
    y: 60 + Math.random() * (GROUND_Y - 100)
  });
}

io.on('connection', (socket) => {
  players[socket.id] = {
    id: socket.id,
    x: 200 + Math.random() * 600,
    y: 250,
    stage: 0,
    xp: 0,
    score: 0
  };

  socket.emit('init', { id: socket.id, players, foods });
  socket.broadcast.emit('playerJoined', players[socket.id]);

  socket.on('move', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
    }
  });

  socket.on('eatFood', (foodId) => {
    const p = players[socket.id];
    const food = foods.find(f => f.id === foodId);
    if (p && food) {
      food.x = Math.random() * WORLD_WIDTH;
      food.y = 60 + Math.random() * (GROUND_Y - 100);
      p.xp += 15;
      p.score += 10;

      if (p.xp >= XP_LIMITS[p.stage] && p.stage < 3) {
        p.stage++;
        p.xp = 0;
      }
      io.emit('foodUpdated', food);
    }
  });

  socket.on('eatPlayer', (targetId) => {
    const hunter = players[socket.id];
    const prey = players[targetId];
    if (hunter && prey && hunter.stage > prey.stage) {
      hunter.xp += 40;
      hunter.score += 50;
      if (hunter.xp >= XP_LIMITS[hunter.stage] && hunter.stage < 3) {
        hunter.stage++;
        hunter.xp = 0;
      }
      io.to(targetId).emit('eaten');
      delete players[targetId];
      io.emit('playerLeft', targetId);
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

setInterval(() => {
  io.emit('state', players);
}, 1000 / 30);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
