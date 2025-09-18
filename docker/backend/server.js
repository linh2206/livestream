const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Database connections
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://livestream:password@postgres:5432/livestream'
});

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// User routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hashedPassword]
        );
        
        const token = jwt.sign({ userId: result.rows[0].id }, process.env.JWT_SECRET || 'secret');
        res.json({ token, user: result.rows[0] });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret');
        res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stream routes
app.get('/api/streams', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM streams WHERE is_live = true ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/streams/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM streams WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Stream not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Chat routes
app.get('/api/chat/:streamId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT c.*, u.username FROM chat_messages c JOIN users u ON c.user_id = u.id WHERE c.stream_id = $1 ORDER BY c.created_at DESC LIMIT 100',
            [req.params.streamId]
        );
        res.json(result.rows.reverse());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WebSocket handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('join', (data) => {
        socket.join(data.room);
        socket.username = data.username;
        console.log(`${data.username} joined room ${data.room}`);
        
        // Update online count
        io.to(data.room).emit('online_count', { count: io.sockets.adapter.rooms.get(data.room)?.size || 0 });
    });
    
    socket.on('chat_message', async (data) => {
        try {
            // Save message to database
            const result = await pool.query(
                'INSERT INTO chat_messages (stream_id, user_id, message) VALUES ($1, $2, $3) RETURNING *',
                [data.streamId, data.userId, data.message]
            );
            
            // Broadcast to room
            io.to(data.room).emit('chat_message', {
                id: result.rows[0].id,
                username: data.username,
                message: data.message,
                timestamp: result.rows[0].created_at
            });
        } catch (error) {
            console.error('Error saving chat message:', error);
        }
    });
    
    socket.on('like', async (data) => {
        try {
            // Update like count in Redis
            const key = `stream:${data.streamId}:likes`;
            if (data.liked) {
                await redisClient.incr(key);
            } else {
                await redisClient.decr(key);
            }
            
            const count = await redisClient.get(key);
            
            // Broadcast to room
            io.to(data.room).emit('like', { count: parseInt(count) || 0 });
        } catch (error) {
            console.error('Error updating like count:', error);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
