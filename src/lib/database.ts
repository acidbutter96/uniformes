import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error('Missing MONGODB_URI env variable.');
}

const MONGODB_URI = uri;

declare global {
    // eslint-disable-next-line no-var
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
    if (cache.conn) {
        return cache.conn;
    }

    if (mongoose.connections.length > 0) {
        cache.conn = mongoose;
        return cache.conn;
    }

    if (!cache.promise) {
        cache.promise = mongoose.connect(MONGODB_URI, {
            bufferCommands: false,
        });
    }

    cache.conn = await cache.promise;
    return cache.conn;
}

export default dbConnect;
