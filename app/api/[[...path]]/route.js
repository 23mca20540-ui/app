import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// MongoDB connection
let client = null;
let db = null;

async function connectDB() {
  if (db) return db;
  
  try {
    client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    db = client.db(process.env.DB_NAME || 'passguard');
    
    // Create indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('vaultItems').createIndex({ userId: 1 });
    
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Middleware to verify JWT token
function verifyToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

// Main router
export async function GET(request) {
  const { pathname, searchParams } = new URL(request.url);
  const path = pathname.replace('/api', '');

  try {
    const db = await connectDB();

    // Get vault items
    if (path === '/vault') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const search = searchParams.get('search') || '';
      const query = { userId: user.userId };
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { url: { $regex: search, $options: 'i' } },
        ];
      }

      const items = await db.collection('vaultItems')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      return NextResponse.json({ items });
    }

    // Health check
    if (path === '/health') {
      return NextResponse.json({ status: 'ok' });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '');

  try {
    const db = await connectDB();
    const body = await request.json();

    // Sign up
    if (path === '/auth/signup') {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
      }

      // Check if user exists
      const existingUser = await db.collection('users').findOne({ email });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const userId = uuidv4();
      await db.collection('users').insertOne({
        userId,
        email,
        password: hashedPassword,
        createdAt: new Date(),
      });

      // Generate JWT
      const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });

      return NextResponse.json({ token, userId, email });
    }

    // Login
    if (path === '/auth/login') {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
      }

      // Find user
      const user = await db.collection('users').findOne({ email });
      if (!user) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      // Generate JWT
      const token = jwt.sign({ userId: user.userId, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      return NextResponse.json({ token, userId: user.userId, email: user.email });
    }

    // Create vault item
    if (path === '/vault') {
      const user = verifyToken(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { title, username, password, url, notes, encryptedData } = body;

      const itemId = uuidv4();
      const item = {
        itemId,
        userId: user.userId,
        title, // Store title unencrypted for search
        username, // Store username unencrypted for search
        url, // Store URL unencrypted for search
        encryptedData, // Encrypted blob containing all sensitive data
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection('vaultItems').insertOne(item);

      return NextResponse.json({ item });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '');

  try {
    const db = await connectDB();
    const user = verifyToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update vault item
    if (path.startsWith('/vault/')) {
      const itemId = path.split('/')[2];
      const body = await request.json();

      const { title, username, url, encryptedData } = body;

      const result = await db.collection('vaultItems').updateOne(
        { itemId, userId: user.userId },
        {
          $set: {
            title,
            username,
            url,
            encryptedData,
            updatedAt: new Date(),
          }
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '');

  try {
    const db = await connectDB();
    const user = verifyToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete vault item
    if (path.startsWith('/vault/')) {
      const itemId = path.split('/')[2];

      const result = await db.collection('vaultItems').deleteOne({
        itemId,
        userId: user.userId,
      });

      if (result.deletedCount === 0) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}