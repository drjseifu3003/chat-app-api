import express from "express"
import cors from "cors"
import { createServer } from "http"
import { Server } from "socket.io"
import dotenv from "dotenv"
import authRoutes from "./routes/auth"
import userRoutes from "./routes/users"
import messageRoutes, { setSocketIO } from "./routes/messages"
import aiRoutes from "./routes/ai"
import { authenticateToken } from "./middleware/auth"
import { initializeSocketIO } from "./socket/socketHandler"

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
)
app.use(express.json())

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() })
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/users", authenticateToken, userRoutes)
app.use("/api/messages", authenticateToken, messageRoutes)
app.use("/api/ai", authenticateToken, aiRoutes)

// Initialize Socket.IO
initializeSocketIO(io)
setSocketIO(io)

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[API Error]", err)
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  })
})

const PORT = process.env.PORT || 4000

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`🔌 WebSocket server ready`)
})
