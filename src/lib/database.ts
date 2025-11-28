import mongoose from 'mongoose';

const RAW_MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

function resolveMongoUri(): { uri: string; options: Parameters<typeof mongoose.connect>[1] } {
  // If a full URI is provided, prefer it.
  // If it doesn't include a database path and DB_NAME exists, pass dbName via options.
  if (RAW_MONGODB_URI) {
    const hasDbInPath = /mongodb(?:\+srv)?:\/\/[^/]+\/[A-Za-z0-9_.-]+/.test(RAW_MONGODB_URI);
    const options: Parameters<typeof mongoose.connect>[1] = {
      bufferCommands: false,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      w: 'majority',
    };
    if (!hasDbInPath && DB_NAME) {
      // Let mongoose select the DB via option when URI lacks path.
      (options as Record<string, unknown>).dbName = DB_NAME;
    }
    return { uri: RAW_MONGODB_URI, options };
  }

  // Fallback: build a local URI using DB_NAME (required for this path)
  if (DB_NAME) {
    return {
      uri: `mongodb://127.0.0.1:27017/${DB_NAME}`,
      options: {
        bufferCommands: false,
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        retryWrites: true,
        w: 'majority',
      },
    };
  }

  throw new Error('Missing Mongo configuration. Provide MONGODB_URI or DB_NAME in .env');
}

declare global {
  var mongooseCache:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const globalWithMongoose = globalThis as typeof globalThis & {
  mongooseCache?: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
};

const cache = globalWithMongoose.mongooseCache || {
  conn: null,
  promise: null,
};

globalWithMongoose.mongooseCache = cache;

export async function dbConnect() {
  const { uri, options } = resolveMongoUri();

  // If a connection is already established, reuse it.
  if (cache.conn) {
    return cache.conn;
  }

  // If mongoose is already connected (readyState 1), reuse it.
  if (mongoose.connection.readyState === 1) {
    cache.conn = mongoose;
    return cache.conn;
  }

  // Initiate a new connection with sensible options and a shorter server selection timeout
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, options);
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Reset the promise on failure to allow retries
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}

export default dbConnect;
