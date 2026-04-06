/**
 * WHITEBOARD.TSX - UPDATED VERSION WITH WEBSOCKET
 * 
 * This shows how to update your existing Whiteboard component
 * to use real-time websocket collaboration.
 * 
 * KEY CHANGES:
 * 1. Import useWebSocket hook
 * 2. Replace local stroke state with websocket remote strokes
 * 3. Replace simulated bot users with real users from websocket
 * 4. Send strokes via websocket.createStroke() instead of local state
 * 5. Track other users' cursors in real-time
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Stroke, Point, Tool, User, CursorData, USER_COLORS } from '@/types/whiteboard';
import { recognizeShape, renderShape } from '@/lib/shapeRecognizer';
import { useWebSocket } from '@/context/WebSocketContext';
import Toolbar from './Toolbar';
import CursorOverlay from './CursorOverlay';
import UserPresence from './UserPresence';

interface WhiteboardProps {
  userName: string;
  roomId: string;
  onLeave: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 12);

const Whiteboard: React.FC<WhiteboardProps> = ({ userName, roomId, onLeave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ========== WEBSOCKET HOOK ==========
  const {
    isConnected,
    users: remoteUsers,
    strokes: remoteStrokes,
    cursors: remoteCursors,
    joinRoom,
    createStroke,
    undoStroke,
    updateCursor,
  } = useWebSocket();

  // ========== LOCAL STATE ==========
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [shapeRecognition, setShapeRecognition] = useState(true);
  const [isReplaying, setIsReplaying] = useState(false);

  const userId = useRef(generateId());
  // Local current stroke being drawn (not synced yet)
  const currentStroke = useRef<Stroke | null>(null);
  const isDrawing = useRef(false);
  const animFrameId = useRef<number>(0);

  // Removed: strokes and undoneStrokes (now use remoteStrokes from websocket)
  // Removed: simulated bot users (now use remoteUsers from websocket)
  // Removed: botsRef (no more bot simulation)

  // ========== JOIN ROOM ON MOUNT ==========
  useEffect(() => {
    if (!isConnected) return; // Wait for websocket connection

    const currentUser: User = {
      id: userId.current,
      name: userName,
      color: USER_COLORS[0],
    };

    // Join the websocket room
    joinRoom(roomId, currentUser);

    console.log(`Joined room ${roomId} as ${userName}`);
  }, [isConnected, roomId, userName, joinRoom]);

  // ========== CANVAS SETUP ==========
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redraw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ========== REDRAW FUNCTION ==========
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = 'hsl(220, 14%, 12%)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw all REMOTE strokes from websocket
    for (const stroke of remoteStrokes) {
      drawStroke(ctx, stroke);
    }

    // Draw current stroke (being drawn now)
    if (currentStroke.current) {
      drawStroke(ctx, currentStroke.current);
    }
  }, [remoteStrokes]); // Redraw when remote strokes change

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.shape) {
      renderShape(ctx, stroke.shape, stroke.color, stroke.width);
      return;
    }

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.tool === 'eraser' ? stroke.width * 3 : stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'line' && stroke.points.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      ctx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
      ctx.stroke();
    } else if (stroke.tool === 'rectangle' && stroke.points.length >= 2) {
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];
      ctx.beginPath();
      ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
      ctx.stroke();
    } else if (stroke.tool === 'circle' && stroke.points.length >= 2) {
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
        const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
      }
      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
  };

  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isReplaying || !isConnected) return;
    isDrawing.current = true;
    const point = getPoint(e);
    currentStroke.current = {
      id: generateId(),
      userId: userId.current,
      tool,
      points: [point],
      color,
      width: strokeWidth,
      timestamp: Date.now(),
    };
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !currentStroke.current || isReplaying) return;
    const point = getPoint(e);
    currentStroke.current.points.push(point);

    // Send cursor position to other users
    updateCursor({
      userId: userId.current,
      name: userName,
      color: USER_COLORS[0],
      position: point,
    });

    cancelAnimationFrame(animFrameId.current);
    animFrameId.current = requestAnimationFrame(redraw);
  };

  const stopDrawing = () => {
    if (!isDrawing.current || !currentStroke.current) return;
    isDrawing.current = false;

    const stroke = currentStroke.current;

    // AI Shape Recognition for freehand
    if (shapeRecognition && stroke.tool === 'pen' && stroke.points.length > 10) {
      const shape = recognizeShape(stroke.points);
      if (shape) {
        stroke.shape = shape;
      }
    }

    // ========== KEY CHANGE: Send stroke to websocket instead of local state ==========
    createStroke(stroke);

    currentStroke.current = null;
    redraw();
  };

  // ========== UNDO HANDLER ==========
  const handleUndo = useCallback(() => {
    if (remoteStrokes.length === 0) return;
    const lastStroke = remoteStrokes[remoteStrokes.length - 1];
    // Use websocket undo instead of local
    undoStroke(lastStroke.id);
  }, [remoteStrokes, undoStroke]);

  // ========== KEYBOARD SHORTCUTS ==========
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleUndo]);

  // ========== RENDER ==========
  return (
    <div ref={containerRef} className="flex flex-col h-screen w-full bg-slate-900 text-white">
      <div className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Live Collab Whiteboard</h1>
          {isConnected ? (
            <span className="text-green-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Connected
            </span>
          ) : (
            <span className="text-yellow-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
              Connecting...
            </span>
          )}
        </div>
        <button
          onClick={onLeave}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
        >
          Leave Room
        </button>
      </div>

      <div className="flex flex-1 gap-4 p-4">
        <div className="flex flex-col gap-4 w-48">
          <Toolbar
            tool={tool}
            setTool={setTool}
            color={color}
            setColor={setColor}
            strokeWidth={strokeWidth}
            setStrokeWidth={setStrokeWidth}
            shapeRecognition={shapeRecognition}
            setShapeRecognition={setShapeRecognition}
            onUndo={handleUndo}
          />
          <UserPresence users={remoteUsers} currentUserId={userId.current} />
        </div>

        <div className="flex-1 relative bg-slate-950 rounded border border-slate-700">
          <CursorOverlay cursors={remoteCursors} />
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      </div>

      <div className="p-2 bg-slate-800 text-xs text-slate-400 text-center">
        Room: {roomId} | Users: {remoteUsers.length} | Strokes: {remoteStrokes.length}
      </div>
    </div>
  );
};

export default Whiteboard;
