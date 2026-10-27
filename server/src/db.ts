import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryInstance: MongoMemoryServer | null = null;

export async function connectDB(forceMemory = false): Promise<typeof mongoose> {
  const isTest = process.env.NODE_ENV === 'test';
  const uri = process.env.MONGODB_URI;

  if (!forceMemory && !isTest && uri) {
    try {
      console.log(`Connecting to MongoDB...`);
      return await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    } catch (err: any) {
      console.warn(`Failed to connect to ${uri}: ${err.message}. Starting embedded MongoDB...`);
    }
  }

  // Embedded MongoMemoryServer for testing and zero-config local dev
  if (!mongoMemoryInstance) {
    mongoMemoryInstance = await MongoMemoryServer.create({
      binary: { version: '6.0.18' },
    });
  }

  const memoryUri = mongoMemoryInstance.getUri();
  return await mongoose.connect(memoryUri);
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoMemoryInstance) {
    await mongoMemoryInstance.stop();
    mongoMemoryInstance = null;
  }
}

export default mongoose;
