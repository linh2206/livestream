// Initialize MongoDB with default admin user
db = db.getSiblingDB('livestream');

// Create collections
db.createCollection('users');
db.createCollection('streams');
db.createCollection('chatmessages');

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.streams.createIndex({ streamKey: 1 }, { unique: true });
db.streams.createIndex({ userId: 1 });
db.streams.createIndex({ isLive: 1 });
db.chatmessages.createIndex({ streamId: 1 });
db.chatmessages.createIndex({ userId: 1 });
db.chatmessages.createIndex({ createdAt: 1 });

// Create default admin user
db.users.insertOne({
  username: 'admin',
  email: 'admin@livestream.com',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8KzK', // password: admin123
  fullName: 'Administrator',
  role: 'admin',
  provider: 'local',
  isEmailVerified: true,
  isActive: true,
  isOnline: false,
  lastSeen: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Database initialized successfully!');

