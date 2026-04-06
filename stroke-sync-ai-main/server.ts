import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';

// Types
interface Room {
  id: string;
  users: Map<string, User>;
  strokes: Stroke[];
}

interface User {
  id: string;
  name: string;
  color: string;
  socketId?: string;
  cursor?: { x: number; y: number };
}

interface Stroke {
  id: string;
  userId: string;
  tool: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  timestamp: number;
  shape?: any;
}

interface CursorData {
  userId: string;
  name: string;
  color: string;
  position: { x: number; y: number };
}

const PORT = process.env.PORT || 3001;
const rooms = new Map<string, Room>();

const httpServer = createServer();

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow all localhost origins during development
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Utility functions
const getOrCreateRoom = (roomId: string): Room => {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      users: new Map(),
      strokes: [],
    });
  }
  return rooms.get(roomId)!;
};

const getRoomUsers = (room: Room): User[] => {
  return Array.from(room.users.values());
};

// Socket.io event handlers
io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join room
  socket.on('join-room', (roomId: string, user: User) => {
    socket.join(roomId);
    const room = getOrCreateRoom(roomId);
    
    const userWithSocketId = { ...user, socketId: socket.id };
    room.users.set(socket.id, userWithSocketId);

    console.log(`User ${user.name} joined room ${roomId}`);

    // Send room state to joining user
    socket.emit('room-state', {
      users: getRoomUsers(room),
      strokes: room.strokes,
    });

    // Notify others of new user
    socket.to(roomId).emit('user-joined', user);
    io.to(roomId).emit('users-updated', getRoomUsers(room));
  });

  // Handle new stroke
  socket.on('stroke-created', (roomId: string, stroke: Stroke) => {
    const room = getOrCreateRoom(roomId);
    const user = room.users.get(socket.id);
    if (user) {
      stroke.userId = user.id;
    } else {
      stroke.userId = stroke.userId || socket.id;
    }
    room.strokes.push(stroke);

    // Broadcast stroke to all users in room
    io.to(roomId).emit('stroke-added', stroke);
  });

  // Handle stroke update (move/edit)
  socket.on('stroke-updated', (roomId: string, updatedStroke: Stroke) => {
    const room = getOrCreateRoom(roomId);
    room.strokes = room.strokes.map((stroke) =>
      stroke.id === updatedStroke.id ? updatedStroke : stroke
    );
    io.to(roomId).emit('stroke-updated', updatedStroke);
  });

  // Handle clear request for current user's strokes
  socket.on('clear-user-strokes', (roomId: string, userId: string) => {
    const room = getOrCreateRoom(roomId);
    const removedStrokes = room.strokes.filter((s) => s.userId === userId);
    room.strokes = room.strokes.filter((s) => s.userId !== userId);
    removedStrokes.forEach((stroke) => io.to(roomId).emit('stroke-removed', stroke.id));
  });

  // Handle voice session join
  socket.on('voice-ready', (roomId: string, payload: any) => {
    socket.to(roomId).emit('voice-ready', payload);
  });

  // Handle voice offer
  socket.on('voice-offer', (roomId: string, data: any) => {
    io.to(data.targetSocketId).emit('voice-offer', {
      fromSocketId: data.fromSocketId,
      fromUserId: data.fromUserId,
      fromName: data.fromName,
      offer: data.offer,
    });
  });

  // Handle voice answer
  socket.on('voice-answer', (roomId: string, data: any) => {
    io.to(data.targetSocketId).emit('voice-answer', {
      fromSocketId: data.fromSocketId,
      answer: data.answer,
    });
  });

  // Handle ICE candidate exchange for voice
  socket.on('voice-candidate', (roomId: string, data: any) => {
    io.to(data.targetSocketId).emit('voice-candidate', {
      fromSocketId: data.fromSocketId,
      candidate: data.candidate,
    });
  });

  socket.on('voice-left', (roomId: string, fromSocketId: string) => {
    socket.to(roomId).emit('voice-left', fromSocketId);
  });

  // Handle undo
  socket.on('undo', (roomId: string, strokeId: string) => {
    const room = getOrCreateRoom(roomId);
    room.strokes = room.strokes.filter(s => s.id !== strokeId);
    io.to(roomId).emit('stroke-removed', strokeId);
  });

  // Handle cursor movement
  socket.on('cursor-move', (roomId: string, cursorData: CursorData) => {
    socket.to(roomId).emit('cursor-updated', cursorData);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove user from all rooms
    for (const [roomId, room] of rooms.entries()) {
      const user = room.users.get(socket.id);
      if (user) {
        room.users.delete(socket.id);
        io.to(roomId).emit('user-left', socket.id);
        io.to(roomId).emit('users-updated', getRoomUsers(room));
        
        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(roomId);
        }
      }
    }
  });

  // Handle room sync request
  socket.on('request-sync', (roomId: string) => {
    const room = getOrCreateRoom(roomId);
    socket.emit('room-state', {
      users: getRoomUsers(room),
      strokes: room.strokes,
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
