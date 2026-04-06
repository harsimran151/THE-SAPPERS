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

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

const Whiteboard: React.FC<WhiteboardProps> = ({ userName, roomId, onLeave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [shapeRecognition, setShapeRecognition] = useState(true);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [ownCursor, setOwnCursor] = useState<CursorData | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Array<{ socketId: string; userId: string; name: string; stream: MediaStream }>>([]);

  const userId = useRef(generateId());
  const currentStroke = useRef<Stroke | null>(null);
  const selectedStroke = useRef<Stroke | null>(null);
  const dragStartPoint = useRef<Point | null>(null);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const isDrawing = useRef(false);
  const isDragging = useRef(false);
  const localStream = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const animFrameId = useRef<number>(0);

  const {
    isConnected,
    users: remoteUsers,
    strokes: remoteStrokes,
    cursors: remoteCursors,
    joinRoom,
    createStroke,
    updateStroke,
    undoStroke,
    clearUserStrokes,
    updateCursor,
    socket,
  } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    const currentUser = {
      id: userId.current,
      name: userName,
      color: USER_COLORS[0],
    };

    joinRoom(roomId, currentUser);
  }, [isConnected, roomId, userName, joinRoom]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all remote strokes
    for (const stroke of remoteStrokes) {
      drawStroke(ctx, stroke);
    }

    // Draw current stroke
    if (currentStroke.current) {
      drawStroke(ctx, currentStroke.current);
    }

    if (selectedStrokeId) {
      const selected = remoteStrokes.find((s) => s.id === selectedStrokeId);
      if (selected) {
        drawSelectionOutline(ctx, selected);
      }
    }
  }, [remoteStrokes, selectedStrokeId]);

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
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [remoteStrokes, redraw]);

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
    } else if (stroke.tool === 'triangle' && stroke.points.length >= 2) {
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];
      const topX = (start.x + end.x) / 2;
      const topY = start.y;
      const bottomLeftX = start.x;
      const bottomLeftY = end.y;
      const bottomRightX = end.x;
      const bottomRightY = end.y;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.lineTo(bottomLeftX, bottomLeftY);
      ctx.lineTo(bottomRightX, bottomRightY);
      ctx.closePath();
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

  const drawSelectionOutline = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    const bound = getBounds(stroke.points);
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(bound.minX - 8, bound.minY - 8, bound.maxX - bound.minX + 16, bound.maxY - bound.minY + 16);
    ctx.restore();
  };

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const updateOwnCursor = (position: Point) => {
    const cursorData: CursorData = {
      userId: userId.current,
      name: userName,
      color: USER_COLORS[0],
      position,
    };
    setOwnCursor(cursorData);
    updateCursor(cursorData);
  };

  const addRemoteStream = useCallback((socketId: string, userId: string, name: string, stream: MediaStream) => {
    setRemoteStreams((prev) => {
      const existingIndex = prev.findIndex((item) => item.socketId === socketId);
      if (existingIndex !== -1) {
        const next = [...prev];
        next[existingIndex] = { socketId, userId, name, stream };
        return next;
      }
      return [...prev, { socketId, userId, name, stream }];
    });
  }, []);

  const cleanupPeerConnection = useCallback((socketId: string) => {
    const pc = peerConnections.current.get(socketId);
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
      peerConnections.current.delete(socketId);
    }
    setRemoteStreams((prev) => prev.filter((stream) => stream.socketId !== socketId));
  }, []);

  const createPeerConnection = useCallback(
    (targetSocketId: string, targetUserId: string, targetName: string) => {
      if (peerConnections.current.has(targetSocketId)) {
        return peerConnections.current.get(targetSocketId)!;
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const stream = localStream.current;
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.enabled = !micMuted;
          pc.addTrack(track, stream);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socket && roomId) {
          socket.emit('voice-candidate', roomId, {
            targetSocketId,
            candidate: event.candidate,
            fromSocketId: socket.id,
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          addRemoteStream(targetSocketId, targetUserId, targetName, event.streams[0]);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          cleanupPeerConnection(targetSocketId);
        }
      };

      peerConnections.current.set(targetSocketId, pc);
      return pc;
    },
    [socket, roomId, micMuted, addRemoteStream, cleanupPeerConnection]
  );

  const ensureLocalStream = useCallback(async () => {
    if (localStream.current) {
      console.log('✓ Local stream already exists, reusing:', {
        audioTracks: localStream.current.getAudioTracks().length,
      });
      return localStream.current;
    }
    
    console.log('Requesting microphone access...');
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia not supported in this browser');
    }
    
    try {
      // Try with audio constraints first
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        // If that fails, try with more permissive constraints
        console.warn('Standard audio constraints failed, trying with permissive constraints...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }
        });
      }
      
      console.log('✓ Microphone access granted');
      const audioTracks = stream.getAudioTracks();
      
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks available in the stream');
      }
      
      audioTracks.forEach((track) => {
        console.log('✓ Audio track enabled:', {
          kind: track.kind,
          enabled: !micMuted,
          label: track.label || '(unnamed)',
        });
        track.enabled = !micMuted;
      });
      
      localStream.current = stream;
      return stream;
    } catch (error: any) {
      const errorName = error?.name || 'UnknownError';
      const errorMessage = error?.message || String(error);
      console.error('Microphone access failed:', {
        name: errorName,
        message: errorMessage,
        // Common error diagnostics:
        // NotAllowedError = user denied permission
        // NotFoundError = no microphone found
        // NotSupportedError = browser doesn't support getUserMedia
        // AbortError = permission request was dismissed
        // SecurityError = not allowed in this context (http vs https)
      });
      throw error;
    }
  }, [micMuted]);

  const startVoiceChat = useCallback(async () => {
    if (!socket || !roomId) return;
    try {
      setVoiceError(null);
      console.log('Starting voice chat setup...');
      const stream = await ensureLocalStream();
      console.log('✓ Local stream acquired:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
      });
      setVoiceEnabled(true);
      socket.emit('voice-ready', roomId, {
        socketId: socket.id,
        userId: userId.current,
        name: userName,
      });
      console.log('✓ Voice ready signal sent');
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      const errorName = error?.name || 'UnknownError';
      console.error('Voice chat setup failed:', { errorName, errorMsg, error });
      setVoiceError(`Microphone access failed: ${errorName} - ${errorMsg}`);
      // Reset voice enabled state if it was set
      setVoiceEnabled(false);
    }
  }, [socket, roomId, ensureLocalStream, userName]);

  const stopVoiceChat = useCallback(() => {
    if (!socket || !roomId) return;
    setVoiceError(null);
    setVoiceEnabled(false);
    setMicMuted(false);
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    peerConnections.current.forEach((_, targetSocketId) => cleanupPeerConnection(targetSocketId));
    peerConnections.current.clear();
    socket.emit('voice-left', roomId, socket.id);
  }, [socket, roomId, cleanupPeerConnection]);

  const toggleVoiceChat = () => {
    if (voiceEnabled) {
      stopVoiceChat();
    } else {
      startVoiceChat();
    }
  };

  const toggleMute = () => {
    setMicMuted((prev) => {
      const next = !prev;
      if (localStream.current) {
        localStream.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  };

  const handleVoiceReady = useCallback(
    async (payload: { socketId: string; userId: string; name: string }) => {
      if (!socket || !roomId || payload.socketId === socket.id || !voiceEnabled) return;
      const pc = createPeerConnection(payload.socketId, payload.userId, payload.name);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('voice-offer', roomId, {
        targetSocketId: payload.socketId,
        offer,
        fromSocketId: socket.id,
        fromUserId: userId.current,
        fromName: userName,
      });
    },
    [socket, roomId, voiceEnabled, createPeerConnection, userName]
  );

  const handleVoiceOffer = useCallback(
    async (data: { fromSocketId: string; fromUserId: string; fromName: string; offer: RTCSessionDescriptionInit }) => {
      if (!socket || !roomId || data.fromSocketId === socket.id || !voiceEnabled) return;
      const pc = createPeerConnection(data.fromSocketId, data.fromUserId, data.fromName);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('voice-answer', roomId, {
        targetSocketId: data.fromSocketId,
        answer,
        fromSocketId: socket.id,
      });
    },
    [socket, roomId, voiceEnabled, createPeerConnection]
  );

  const handleVoiceAnswer = useCallback(
    async (data: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current.get(data.fromSocketId);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    },
    []
  );

  const handleVoiceCandidate = useCallback(
    async (data: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(data.fromSocketId);
      if (!pc || !data.candidate) return;
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    },
    []
  );

  const handleVoiceLeft = useCallback(
    (leftSocketId: string) => {
      cleanupPeerConnection(leftSocketId);
    },
    [cleanupPeerConnection]
  );

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.on('voice-ready', handleVoiceReady);
    socket.on('voice-offer', handleVoiceOffer);
    socket.on('voice-answer', handleVoiceAnswer);
    socket.on('voice-candidate', handleVoiceCandidate);
    socket.on('voice-left', handleVoiceLeft);
    socket.on('user-left', handleVoiceLeft);

    return () => {
      socket.off('voice-ready', handleVoiceReady);
      socket.off('voice-offer', handleVoiceOffer);
      socket.off('voice-answer', handleVoiceAnswer);
      socket.off('voice-candidate', handleVoiceCandidate);
      socket.off('voice-left', handleVoiceLeft);
      socket.off('user-left', handleVoiceLeft);
    };
  }, [socket, roomId, handleVoiceReady, handleVoiceOffer, handleVoiceAnswer, handleVoiceCandidate, handleVoiceLeft]);

  useEffect(() => {
    return () => {
      stopVoiceChat();
    };
  }, [stopVoiceChat]);

  const moveShape = (shape: Stroke['shape'], dx: number, dy: number) => {
    if (!shape) return shape;
    const params = { ...shape.params };
    switch (shape.type) {
      case 'circle':
        params.cx += dx;
        params.cy += dy;
        break;
      case 'rectangle':
        params.x += dx;
        params.y += dy;
        break;
      case 'line':
        params.x1 += dx;
        params.y1 += dy;
        params.x2 += dx;
        params.y2 += dy;
        break;
      case 'triangle':
        params.x1 += dx;
        params.y1 += dy;
        params.x2 += dx;
        params.y2 += dy;
        params.x3 += dx;
        params.y3 += dy;
        break;
    }
    return { ...shape, params };
  };

  const moveStroke = (stroke: Stroke, dx: number, dy: number): Stroke => {
    const movedPoints = stroke.points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
    return {
      ...stroke,
      points: movedPoints,
      shape: stroke.shape ? moveShape(stroke.shape, dx, dy) : undefined,
    };
  };

  const pointToLineDistance = (p: Point, a: Point, b: Point) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    const proj = { x: a.x + t * dx, y: a.y + t * dy };
    return Math.sqrt((p.x - proj.x) ** 2 + (p.y - proj.y) ** 2);
  };

  const isPointInTriangle = (p: Point, a: Point, b: Point, c: Point) => {
    const sign = (p1: Point, p2: Point, p3: Point) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    const d1 = sign(p, a, b);
    const d2 = sign(p, b, c);
    const d3 = sign(p, c, a);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  };

  const getBounds = (points: Point[]) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    return { minX, minY, maxX, maxY };
  };

  const isPointOnShape = (point: Point, shape: Stroke['shape'], stroke: Stroke) => {
    if (!shape) return false;
    const tolerance = Math.max(stroke.width, 10);
    switch (shape.type) {
      case 'circle': {
        const dx = point.x - shape.params.cx;
        const dy = point.y - shape.params.cy;
        return Math.abs(Math.sqrt(dx * dx + dy * dy) - shape.params.radius) < tolerance;
      }
      case 'rectangle': {
        const x = shape.params.x;
        const y = shape.params.y;
        const w = shape.params.width;
        const h = shape.params.height;
        const inside = point.x >= x - tolerance && point.x <= x + w + tolerance && point.y >= y - tolerance && point.y <= y + h + tolerance;
        return inside;
      }
      case 'line': {
        const a = { x: shape.params.x1, y: shape.params.y1 };
        const b = { x: shape.params.x2, y: shape.params.y2 };
        return pointToLineDistance(point, a, b) < tolerance;
      }
      case 'triangle': {
        const a = { x: shape.params.x1, y: shape.params.y1 };
        const b = { x: shape.params.x2, y: shape.params.y2 };
        const c = { x: shape.params.x3, y: shape.params.y3 };
        return isPointInTriangle(point, a, b, c);
      }
      default:
        return false;
    }
  };

  const isPointOnStroke = (point: Point, stroke: Stroke) => {
    const tolerance = Math.max(stroke.width, 10);
    if (stroke.shape) {
      return isPointOnShape(point, stroke.shape, stroke);
    }
    if (stroke.points.length < 2) return false;
    if (stroke.tool === 'rectangle' || stroke.tool === 'circle' || stroke.tool === 'triangle' || stroke.tool === 'line') {
      const bound = getBounds(stroke.points);
      return point.x >= bound.minX - tolerance && point.x <= bound.maxX + tolerance && point.y >= bound.minY - tolerance && point.y <= bound.maxY + tolerance;
    }

    for (let i = 1; i < stroke.points.length; i++) {
      if (pointToLineDistance(point, stroke.points[i - 1], stroke.points[i]) < tolerance) {
        return true;
      }
    }
    return false;
  };

  const selectStrokeAtPoint = (point: Point) => {
    for (let i = remoteStrokes.length - 1; i >= 0; i--) {
      const stroke = remoteStrokes[i];
      if (isPointOnStroke(point, stroke)) {
        return stroke;
      }
    }
    return null;
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getPoint(e);
    updateOwnCursor(point);
    if (tool === 'select') {
      const target = selectStrokeAtPoint(point);
      if (target) {
        setSelectedStrokeId(target.id);
        selectedStroke.current = target;
        dragStartPoint.current = point;
        isDragging.current = true;
      } else {
        setSelectedStrokeId(null);
        selectedStroke.current = null;
      }
      return;
    }

    isDrawing.current = true;
    currentStroke.current = {
      id: generateId(),
      userId: userId.current,
      tool,
      points: [point],
      color,
      width: strokeWidth,
      timestamp: Date.now(),
    };
    setRedoStack([]); // Clear redo stack on new stroke
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getPoint(e);
    updateOwnCursor(point);
    if (tool === 'select' && isDragging.current && selectedStroke.current && dragStartPoint.current) {
      const dx = point.x - dragStartPoint.current.x;
      const dy = point.y - dragStartPoint.current.y;
      selectedStroke.current = moveStroke(selectedStroke.current, dx, dy);
      updateStroke(selectedStroke.current);
      dragStartPoint.current = point;
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = requestAnimationFrame(redraw);
      return;
    }
    if (!isDrawing.current || !currentStroke.current) return;
    currentStroke.current.points.push(point);

    cancelAnimationFrame(animFrameId.current);
    animFrameId.current = requestAnimationFrame(redraw);
  };

  const stopDrawing = () => {
    if (tool === 'select' && isDragging.current) {
      isDragging.current = false;
      dragStartPoint.current = null;
      currentStroke.current = null;
      return;
    }

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

    createStroke(stroke);
    currentStroke.current = null;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    draw(e);
  };

  // Per-user undo with optimistic update
  const handleUndo = () => {
    const lastUserStroke = [...remoteStrokes].reverse().find((s) => s.userId === userId.current);
    if (!lastUserStroke) return;

    setRedoStack((prev) => [...prev, lastUserStroke]);
    undoStroke(lastUserStroke.id);
  };

  const handleRedo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const nextRedo = [...prev];
      const stroke = nextRedo.pop()!;
      createStroke(stroke);
      return nextRedo;
    });
  };

  const handleClear = () => {
    clearUserStrokes(userId.current);
    setRedoStack([]);
  };

  // Session Replay
  const canUndo = remoteStrokes.some((s) => s.userId === userId.current);
  const canRedo = redoStack.length > 0;

  return (
    <div ref={containerRef} className="relative w-full h-screen canvas-bg overflow-hidden">
      {/* Top controls container - prevent overlap */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none animate-slide-in">
        <div className="flex flex-wrap items-start justify-between px-4 pt-4 pointer-events-auto gap-4">
          <Toolbar
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            shapeRecognition={shapeRecognition}
            voiceEnabled={voiceEnabled}
            isMuted={micMuted}
            canUndo={canUndo}
            canRedo={canRedo}
            onToolChange={setTool}
            onColorChange={setColor}
            onStrokeWidthChange={setStrokeWidth}
            onToggleShapeRecognition={() => setShapeRecognition(!shapeRecognition)}
            onToggleVoice={toggleVoiceChat}
            onToggleMute={toggleMute}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClear={handleClear}
          />

          <UserPresence users={remoteUsers} currentUserId={userId.current} />
        </div>
      </div>

      <CursorOverlay cursors={remoteCursors} ownCursor={ownCursor} currentUserId={userId.current} />

      {remoteStreams.map((streamItem) => (
        <audio
          key={streamItem.socketId}
          autoPlay
          playsInline
          ref={(audio) => {
            if (audio && audio.srcObject !== streamItem.stream) {
              audio.srcObject = streamItem.stream;
            }
          }}
          style={{ display: 'none' }}
        />
      ))}

      {/* Room info */}
      <div className="absolute bottom-4 left-4 z-20 glass-toolbar rounded-xl px-3 py-2 flex items-center gap-3 animate-slide-in">
        <span className="text-xs text-muted-foreground">Room</span>
        <span className="text-sm font-mono font-bold text-primary tracking-wider">{roomId}</span>
        <div className="w-px h-4 bg-border" />
        <button
          onClick={onLeave}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          Leave
        </button>
      </div>

      {/* Shape recognition indicator */}
      {shapeRecognition && (
        <div className="absolute bottom-4 right-4 z-20 glass-toolbar rounded-xl px-3 py-2 flex items-center gap-2 animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
          <span className="text-xs text-accent font-medium">AI Shape Recognition On</span>
        </div>
      )}

      {voiceEnabled && (
        <div className="absolute bottom-20 right-4 z-20 glass-toolbar rounded-xl px-3 py-2 flex items-center gap-2 animate-fade-in">
          <div className={`w-2 h-2 rounded-full ${micMuted ? 'bg-yellow-400' : 'bg-emerald-500'} animate-pulse-glow`} />
          <span className="text-xs text-foreground font-medium">
            {micMuted ? 'Voice chat muted' : 'Voice chat active'}
          </span>
        </div>
      )}

      {voiceError && (
        <div className="absolute bottom-20 right-4 z-20 glass-toolbar rounded-xl px-3 py-2 flex items-center gap-2 animate-fade-in bg-destructive/20 border-destructive/50">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse-glow" />
          <span className="text-xs text-destructive font-medium">{voiceError}</span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onPointerDown={startDrawing}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />
    </div>
  );
};

export default Whiteboard;
