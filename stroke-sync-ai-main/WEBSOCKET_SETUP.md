# WebSocket Real-Time Collaboration Implementation Guide

## Overview
This guide walks you through implementing real-time websocket collaboration for your whiteboard application.

## Architecture
- **Backend**: Node.js/Express server with Socket.io
- **Frontend**: React context + Socket.io client
- **Communication**: Real-time stroke syncing, cursor tracking, user presence

---

## STEP 1: Install Dependencies

### Frontend Dependencies
Run this in your project root:
```bash
npm install socket.io-client
npm install -D @types/socket.io-client
```

Output should show:
```
added X packages
```

### Backend Dependencies
Create a `package.json` for the server (or add to existing):
```bash
npm install express socket.io cors dotenv
npm install -D @types/node ts-node typescript
```

---

## STEP 2: Create Environment Configuration

### Create `.env.local` file in project root:
```
VITE_SOCKET_URL=http://localhost:3001
```

The `VITE_` prefix makes it accessible in your React code via `import.meta.env.VITE_SOCKET_URL`

---

## STEP 3: Set Up the Backend Server

### Files Already Created:
- ✅ `server.ts` - Main websocket server

### To Run the Server:

1. **Add build script to package.json:**
   - Open `package.json`
   - Add this script:
   ```json
   "scripts": {
     ...
     "server": "ts-node server.ts"
   }
   ```

2. **Update tsconfig.json** (if needed):
   Make sure it includes:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "ESNext",
       "lib": ["ES2020"],
       ...
     }
   }
   ```

3. **Start the server:**
   ```bash
   npm run server
   ```
   Expected output:
   ```
   WebSocket server running on port 3001
   ```

---

## STEP 4: Set Up Frontend WebSocket Context

### Files Already Created:
- ✅ `src/context/WebSocketContext.tsx` - Provides websocket context and hooks

### Add WebSocketProvider to App.tsx:

Find your main App component or main.tsx and wrap with WebSocketProvider:

```tsx
import { WebSocketProvider } from './context/WebSocketContext';

function App() {
  return (
    <WebSocketProvider>
      {/* Your existing routes and components */}
    </WebSocketProvider>
  );
}
```

---

## STEP 5: Update Whiteboard Component

### Replace the local state management with websocket:

Here are the key changes needed in `src/components/Whiteboard.tsx`:

#### 5.1 Add import:
```tsx
import { useWebSocket } from '@/context/WebSocketContext';
```

#### 5.2 Replace useState calls with websocket context:
```tsx
const {
  isConnected,
  roomId,
  users,
  strokes: remoteStrokes,
  cursors,
  joinRoom,
  createStroke,
  undoStroke,
  leaveRoom,
  updateCursor,
} = useWebSocket();
```

#### 5.3 Replace joinRoom logic (in useEffect):
```tsx
useEffect(() => {
  const currentUser = {
    id: userId.current,
    name: userName,
    color: USER_COLORS[0],
  };
  
  // Join the websocket room
  joinRoom(roomId, currentUser);
  
  // No more simulated bots - users come from websocket
  setUsers([]); // Clear initial state
  
  return () => {
    leaveRoom(); // Leave room on component unmount
  };
}, [userName, roomId]);
```

#### 5.4 Update rendering to use remote strokes:
```tsx
const redraw = useCallback(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw grid (same as before)
  // ...

  // Draw remote strokes from websocket
  for (const stroke of remoteStrokes) {
    drawStroke(ctx, stroke);
  }

  // Draw current stroke
  if (currentStroke.current) {
    drawStroke(ctx, currentStroke.current);
  }
}, [remoteStrokes]); // Add remoteStrokes as dependency
```

#### 5.5 Update stopDrawing to sync via websocket:
```tsx
const stopDrawing = () => {
  if (!isDrawing.current || !currentStroke.current) return;
  isDrawing.current = false;

  const stroke = currentStroke.current;

  // Shape recognition (same as before)
  // ...

  // SEND to websocket instead of local state
  createStroke(stroke);
  
  currentStroke.current = null;
  redraw();
};
```

#### 5.6 Update undo to use websocket:
```tsx
const handleUndo = () => {
  if (remoteStrokes.length === 0) return;
  const lastStroke = remoteStrokes[remoteStrokes.length - 1];
  undoStroke(lastStroke.id); // Use websocket undo
};
```

#### 5.7 Send cursor updates:
```tsx
const handleMouseMove = (e: React.MouseEvent) => {
  // Your existing cursor tracking code...
  
  // Send cursor position via websocket
  updateCursor({
    userId: userId.current,
    name: userName,
    color: USER_COLORS[0],
    position: getPoint(e),
  });
};
```

---

## STEP 6: Update Other Components

### UserPresence Component:
Replace simulated users with websocket users:
```tsx
import { useWebSocket } from '@/context/WebSocketContext';

export default function UserPresence() {
  const { users } = useWebSocket();
  
  return (
    <div className="user-list">
      {users.map(user => (
        <div key={user.id} className="user-item">
          <span style={{ color: user.color }}>●</span>
          {user.name}
        </div>
      ))}
    </div>
  );
}
```

### CursorOverlay Component:
Replace simulated cursors with websocket cursors:
```tsx
import { useWebSocket } from '@/context/WebSocketContext';

export default function CursorOverlay() {
  const { cursors } = useWebSocket();
  
  return (
    <div className="cursor-overlay">
      {cursors.map(cursor => (
        <div
          key={cursor.userId}
          style={{
            position: 'absolute',
            left: `${cursor.position.x}px`,
            top: `${cursor.position.y}px`,
            color: cursor.color,
          }}
        >
          🖱️ {cursor.name}
        </div>
      ))}
    </div>
  );
}
```

---

## STEP 7: Update JoinRoom Component

Replace the local room logic with websocket:
```tsx
import { useWebSocket } from '@/context/WebSocketContext';

export default function JoinRoom() {
  const { joinRoom, isConnected, roomId } = useWebSocket();
  const [inputRoomId, setInputRoomId] = useState('');
  const [userName, setUserName] = useState('');

  const handleJoin = () => {
    if (!inputRoomId || !userName) return;
    
    joinRoom(inputRoomId, {
      id: '', // Server will set this
      name: userName,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
    });
  };

  return (
    <div>
      <input
        placeholder="Username"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
      />
      <input
        placeholder="Room ID"
        value={inputRoomId}
        onChange={(e) => setInputRoomId(e.target.value)}
      />
      <button onClick={handleJoin} disabled={!isConnected}>
        {isConnected ? 'Join Room' : 'Connecting...'}
      </button>
    </div>
  );
}
```

---

## STEP 8: Update package.json

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:with-server": "concurrently \"npm run server\" \"vite\"",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "server": "ts-node server.ts",
    "server:dev": "tsx watch server.ts"
  }
}
```

And add dev dependency:
```bash
npm install -D concurrently tsx
```

---

## STEP 9: Testing the Implementation

### Terminal 1 - Start backend server:
```bash
npm run server
# Output: WebSocket server running on port 3001
```

### Terminal 2 - Start frontend dev server:
```bash
npm run dev
# Output: VITE v5.x ready in XXX ms
#         ➜  Local:   http://localhost:5173/
```

### Testing Collaboration:
1. Open http://localhost:5173 in **Browser 1**
2. Enter username and room ID (e.g., "room-1")
3. Click "Join Room"
4. Open http://localhost:5173 in **Browser 2** (different user)
5. Draw on one canvas → see it appear on the other
6. Both cursors should be visible in real-time

---

## STEP 10: Environment Variables

Create `.env.local`:
```
VITE_SOCKET_URL=http://localhost:3001
```

For production:
```
VITE_SOCKET_URL=https://your-websocket-server.com
```

---

## Troubleshooting

### "Connection refused"
- ✅ Ensure backend server is running: `npm run server`
- ✅ Check port 3001 is not in use

### "VITE_SOCKET_URL is undefined"
- ✅ Create `.env.local` file
- ✅ Restart frontend dev server after creating env file

### Strokes not syncing
- ✅ Check browser console for connection errors
- ✅ Verify both users are in same room ID
- ✅ Check Network tab → WS connections

### Can't see other users' cursors
- ✅ Ensure `updateCursor()` is called on mouse move
- ✅ Check CursorOverlay component is rendering cursors array

---

## WebSocket Events Reference

### Client → Server Events
- `join-room` - Join a collaboration room
- `stroke-created` - New stroke added
- `undo` - Remove a stroke
- `cursor-move` - Update cursor position
- `request-sync` - Request full room state

### Server → Client Events
- `room-state` - Initial room state on join
- `user-joined` - New user joined
- `user-left` - User disconnected
- `users-updated` - Users list updated
- `stroke-added` - New stroke from another user
- `stroke-removed` - Stroke undone
- `cursor-updated` - Another user's cursor moved

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Create backend server
3. ✅ Add WebSocketProvider to App.tsx
4. ✅ Integrate websocket hooks in components
5. ✅ Test with 2+ browsers
6. ✅ Deploy backend server
7. ✅ Update VITE_SOCKET_URL for production
