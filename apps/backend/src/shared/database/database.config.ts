import { MongooseModuleOptions } from '@nestjs/mongoose';

export const databaseConfig: MongooseModuleOptions = {
  // Connection pooling
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2, // Minimum number of connections in the pool
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  serverSelectionTimeoutMS: 5000, // How long to try selecting a server
  socketTimeoutMS: 45000, // How long to wait for a response

  // Performance optimizations
  retryWrites: true,
  retryReads: true,

  // Compression
  compressors: ['zlib'],

  // Read preferences
  readPreference: 'secondaryPreferred',

  // Write concerns
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 10000,
  },
};
