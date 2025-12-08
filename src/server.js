require('dotenv').config();
const http = require('http');
const connectDB = require('./config/db');
const { Server } = require('socket.io');
const socketHandler = require('./sockets');
const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for HTTP requests
app.use(cors({ origin: '*' }));

app.use(express.json());
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/chats', require('./routes/chatRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'API OK' });
});



// Connect to database
connectDB();

const server = http.createServer(app);

// Enable CORS for WebSockets
const io = new Server(server, {
  cors: {
    origin: 'https://reatime-chat.vercel.app', 
    //origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

socketHandler(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

