import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Stroke, User, CursorData } from '@/types/whiteboard';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  roomId: string | null;
  users: User[];
  strokes: Stroke[];
  cursors: CursorData[];
  joinRoom: (roomId: string, user: User) => void;
  leaveRoom: () => void;
  createStroke: (stroke: Stroke) => void;
  updateStroke: (stroke: Stroke) => void;
  undoStroke: (strokeId: string) => void;
  clearUserStrokes: (userId: string) => void;
  updateCursor: (cursorData: CursorData) => void;
  requestSync: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [cursors, setCursors] = useState<CursorData[]>([]);

  // Initialize socket connection
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
    const newSocket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    // Room state received
    newSocket.on('room-state', (data: { users: User[]; strokes: Stroke[] }) => {
      console.log('Received room state:', data);
      // Deduplicate users by id
      const uniqueUsers = Array.from(new Map(data.users.map((u) => [u.id, u])).values());
      setUsers(uniqueUsers);
      setStrokes(data.strokes);
      setCursors([]);
    });

    // User joined
    newSocket.on('user-joined', (user: User) => {
      console.log('User joined:', user.name);
      setUsers((prev) => {
        // Avoid duplicate users
        if (prev.some((u) => u.id === user.id)) {
          return prev;
        }
        return [...prev, user];
      });
    });

    // User left
    newSocket.on('user-left', (userId: string) => {
      console.log('User left:', userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId && u.socketId !== userId));
      setCursors((prev) => prev.filter((c) => c.userId !== userId));
    });

    // Users updated
    newSocket.on('users-updated', (updatedUsers: User[]) => {
      // Deduplicate users by id
      const uniqueUsers = Array.from(new Map(updatedUsers.map((u) => [u.id, u])).values());
      setUsers(uniqueUsers);
    });

    // Stroke added
    newSocket.on('stroke-added', (stroke: Stroke) => {
      console.log('Stroke added to room:', stroke.id, 'userId:', stroke.userId);
      setStrokes((prev) => {
        // Avoid adding duplicate strokes
        if (prev.some((item) => item.id === stroke.id)) {
          return prev;
        }
        return [...prev, stroke];
      });
    });

    // Stroke updated
    newSocket.on('stroke-updated', (updatedStroke: Stroke) => {
      console.log('Stroke updated:', updatedStroke.id);
      setStrokes((prev) => prev.map((stroke) => (stroke.id === updatedStroke.id ? updatedStroke : stroke)));
    });

    // Stroke removed
    newSocket.on('stroke-removed', (strokeId: string) => {
      console.log('Stroke removed:', strokeId);
      setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
    });

    // Cursor updated
    newSocket.on('cursor-updated', (cursorData: CursorData) => {
      setCursors((prev) => {
        const existing = prev.findIndex((c) => c.userId === cursorData.userId);
        if (existing !== -1) {
          const updated = [...prev];
          updated[existing] = cursorData;
          return updated;
        }
        return [...prev, cursorData];
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinRoom = useCallback(
    (newRoomId: string, user: User) => {
      if (socket) {
        socket.emit('join-room', newRoomId, user);
        setRoomId(newRoomId);
      }
    },
    [socket]
  );

  const leaveRoom = useCallback(() => {
    if (socket && roomId) {
      socket.emit('leave-room', roomId);
      setRoomId(null);
      setUsers([]);
      setStrokes([]);
      setCursors([]);
    }
  }, [socket, roomId]);

  const createStroke = useCallback(
    (stroke: Stroke) => {
      if (socket && roomId) {
        socket.emit('stroke-created', roomId, stroke);
      }
      setStrokes((prev) => (prev.some((item) => item.id === stroke.id) ? prev : [...prev, stroke]));
    },
    [socket, roomId]
  );

  const updateStroke = useCallback(
    (stroke: Stroke) => {
      if (socket && roomId) {
        socket.emit('stroke-updated', roomId, stroke);
      }
      setStrokes((prev) => prev.map((item) => (item.id === stroke.id ? stroke : item)));
    },
    [socket, roomId]
  );

  const undoStroke = useCallback(
    (strokeId: string) => {
      // Optimistic update - remove stroke immediately
      setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
      
      if (socket && roomId) {
        socket.emit('undo', roomId, strokeId);
      }
    },
    [socket, roomId]
  );

  const clearUserStrokes = useCallback(
    (userId: string) => {
      // Optimistic update - remove all user strokes immediately
      setStrokes((prev) => prev.filter((stroke) => stroke.userId !== userId));
      
      if (socket && roomId) {
        socket.emit('clear-user-strokes', roomId, userId);
      }
    },
    [socket, roomId]
  );

  const updateCursor = useCallback(
    (cursorData: CursorData) => {
      if (socket && roomId) {
        socket.emit('cursor-move', roomId, cursorData);
      }
    },
    [socket, roomId]
  );

  const requestSync = useCallback(() => {
    if (socket && roomId) {
      socket.emit('request-sync', roomId);
    }
  }, [socket, roomId]);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    roomId,
    users,
    strokes,
    cursors,
    joinRoom,
    leaveRoom,
    createStroke,
    updateStroke,
    undoStroke,
    clearUserStrokes,
    updateCursor,
    requestSync,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};
