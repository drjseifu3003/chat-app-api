import type { Server, Socket } from "socket.io"
import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma"

interface AuthenticatedSocket extends Socket {
  userId?: string
}

const onlineUsers = new Map<string, string>() // userId -> socketId

export const initializeSocketIO = (io: Server) => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token

      if (!token) {
        return next(new Error("Authentication error"))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string
      }

      socket.userId = decoded.userId
      next()
    } catch (error) {
      next(new Error("Authentication error"))
    }
  })

  io.on("connection", async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!
    console.log(`[Socket] User connected: ${userId}`)

    // Store online user
    onlineUsers.set(userId, socket.id)

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (user) {
        // Update user status
        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: true, lastSeen: new Date() },
        })

        // Broadcast online status
        io.emit("user:online", { userId })

        // Send current online users
        const onlineUserIds = Array.from(onlineUsers.keys())
        socket.emit("users:online", { userIds: onlineUserIds })
      } else {
        console.error(`[Socket] User not found in database: ${userId}`)
        socket.emit("auth:error", { message: "User not found. Please login again." })
        socket.disconnect()
        return
      }
    } catch (error) {
      console.error(`[Socket] Error updating user status:`, error)
      socket.emit("auth:error", { message: "Database error. Please try again." })
      socket.disconnect()
      return
    }

    // Handle typing indicator
    socket.on("typing:start", (data: { receiverId: string }) => {
      const receiverSocketId = onlineUsers.get(data.receiverId)
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing:start", { userId })
      }
    })

    socket.on("typing:stop", (data: { receiverId: string }) => {
      const receiverSocketId = onlineUsers.get(data.receiverId)
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing:stop", { userId })
      }
    })

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`[Socket] User disconnected: ${userId}`)
      onlineUsers.delete(userId)

      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        })

        if (user) {
          await prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeen: new Date() },
          })
        }
      } catch (error) {
        console.error(`[Socket] Error updating user status on disconnect:`, error)
      }

      io.emit("user:offline", { userId })
    })
  })
}

export const broadcastMessage = (io: Server, message: any, receiverId: string) => {
  const onlineUsers = io.sockets.sockets
  for (const [socketId, socket] of onlineUsers) {
    const authSocket = socket as AuthenticatedSocket
    if (authSocket.userId === receiverId) {
      socket.emit("message:receive", message)
    }
  }
}
