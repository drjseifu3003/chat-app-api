# Chat App API

Node.js backend API for the Shipper Chat Application with Express, Socket.IO, Prisma, and PostgreSQL.

## Features

- Google OAuth & JWT Authentication
- Real-time WebSocket communication (Socket.IO)
- PostgreSQL database with Prisma ORM
- REST API endpoints for users, messages, and AI chat
- OpenAI integration for AI chat feature
- Session management with JWT tokens
- Password hashing with bcrypt
- Input validation

## Setup

### 1. Install Dependencies

\`\`\`bash
cd api
npm install
\`\`\`

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

\`\`\`bash
cp .env.example .env
\`\`\`

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `OPENAI_API_KEY`: OpenAI API key

### 3. Setup Database

\`\`\`bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Optional: Open Prisma Studio
npm run prisma:studio
\`\`\`

### 4. Start Server

\`\`\`bash
# Development (with auto-reload)
npm run dev

# Production
npm run build
npm start
\`\`\`

Server will run on `http://localhost:4000`

## API Endpoints

### Authentication

- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/register` - JWT register
- `POST /api/auth/login` - JWT login
- `POST /api/auth/logout` - Logout

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/me/profile` - Get current user profile

### Messages

- `GET /api/messages/:userId` - Get messages with specific user
- `POST /api/messages` - Send message
- `GET /api/messages/unread/count` - Get unread message count

### AI

- `POST /api/ai/chat` - Chat with AI

## WebSocket Events

### Client → Server

- `message:send` - Send a message
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator

### Server → Client

- `message:receive` - Receive a message
- `message:sent` - Confirmation of sent message
- `message:error` - Message error
- `user:online` - User came online
- `user:offline` - User went offline
- `users:online` - List of online users
- `typing:start` - User started typing
- `typing:stop` - User stopped typing

## Database Schema

### User
- id, email, name, picture, googleId, password
- isOnline, lastSeen
- Relations: messages, sessions

### Message
- id, content, senderId, receiverId, read
- createdAt, updatedAt

### Session
- id, userId, token, expiresAt
