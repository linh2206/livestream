// MongoDB initialization script for LiveStream App
db = db.getSiblingDB('livestream');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['username', 'email', 'password'],
      properties: {
        username: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 30,
          pattern: '^[a-zA-Z0-9_]+$'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        password: {
          bsonType: 'string',
          minLength: 6
        },
        avatar: {
          bsonType: 'string'
        },
        isActive: {
          bsonType: 'bool'
        },
        createdAt: {
          bsonType: 'date'
        },
        updatedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

db.createCollection('streams', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title', 'userId', 'status'],
      properties: {
        title: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 100
        },
        description: {
          bsonType: 'string',
          maxLength: 500
        },
        userId: {
          bsonType: 'objectId'
        },
        status: {
          bsonType: 'string',
          enum: ['active', 'inactive', 'ended']
        },
        viewerCount: {
          bsonType: 'int',
          minimum: 0
        },
        likeCount: {
          bsonType: 'int',
          minimum: 0
        },
        streamKey: {
          bsonType: 'string'
        },
        hlsUrl: {
          bsonType: 'string'
        },
        thumbnail: {
          bsonType: 'string'
        },
        tags: {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          }
        },
        createdAt: {
          bsonType: 'date'
        },
        updatedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

db.createCollection('messages', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['content', 'userId', 'streamId'],
      properties: {
        content: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 500
        },
        userId: {
          bsonType: 'objectId'
        },
        streamId: {
          bsonType: 'objectId'
        },
        username: {
          bsonType: 'string'
        },
        avatar: {
          bsonType: 'string'
        },
        isDeleted: {
          bsonType: 'bool'
        },
        createdAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });

db.streams.createIndex({ userId: 1 });
db.streams.createIndex({ status: 1 });
db.streams.createIndex({ createdAt: -1 });
db.streams.createIndex({ viewerCount: -1 });
db.streams.createIndex({ likeCount: -1 });

db.messages.createIndex({ streamId: 1, createdAt: -1 });
db.messages.createIndex({ userId: 1 });
db.messages.createIndex({ createdAt: -1 });

// Create a default admin user
db.users.insertOne({
  username: 'admin',
  email: 'admin@livestream.com',
  password: '$2b$10$rQZ8kL9vXJ8kL9vXJ8kL9uXJ8kL9vXJ8kL9vXJ8kL9vXJ8kL9vXJ8kL9', // password: admin123
  avatar: '',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('MongoDB initialization completed successfully!');
