const WebSocket = require('ws');
const redis = require('redis');
require('dotenv').config();

const wss = new WebSocket.Server({ port: 3001 });
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

console.log('WebSocket server running on port 3001');

wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            switch(data.type) {
                case 'join':
                    ws.room = data.room;
                    ws.username = data.username;
                    console.log(`${data.username} joined room ${data.room}`);
                    break;
                    
                case 'chat_message':
                    // Broadcast to all clients in the same room
                    wss.clients.forEach(client => {
                        if (client !== ws && client.room === data.room && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'chat_message',
                                username: data.username,
                                message: data.message,
                                timestamp: new Date().toISOString()
                            }));
                        }
                    });
                    break;
                    
                case 'like':
                    // Update like count in Redis
                    const key = `stream:${data.room}:likes`;
                    if (data.liked) {
                        await redisClient.incr(key);
                    } else {
                        await redisClient.decr(key);
                    }
                    
                    const count = await redisClient.get(key);
                    
                    // Broadcast to all clients in the room
                    wss.clients.forEach(client => {
                        if (client.room === data.room && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'like',
                                count: parseInt(count) || 0
                            }));
                        }
                    });
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});
