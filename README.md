# Stroke Sync AI - Collaborative Whiteboard

A real-time collaborative whiteboard application with AI-powered features, voice chat, and stroke synchronization. Built with React, TypeScript, Vite, and Socket.io.

## ✨ Features

- **Real-time Collaboration**: Synchronized drawing across multiple users
- **Voice Chat**: Integrated WebRTC voice communication
- **AI-Powered Stroke Recognition**: Intelligent shape detection and enhancement
- **Cursor Tracking**: See other users' cursors in real-time
- **User Presence**: Live user list and activity indicators
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or bun

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd stroke-sync-ai-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` with your configuration:
   ```
   VITE_SOCKET_URL=http://localhost:3001
   ```

4. **Start the development server**
   ```bash
   npm run dev:with-server
   ```

   This will start both the frontend (Vite) and backend (Socket.io server) simultaneously.

## 📁 Project Structure

```
├── server.ts                 # Socket.io backend server
├── src/
│   ├── components/           # React components
│   │   ├── Whiteboard.tsx    # Main drawing canvas
│   │   ├── CursorOverlay.tsx # Real-time cursor display
│   │   ├── UserPresence.tsx  # User list and presence
│   │   └── Toolbar.tsx       # Drawing tools
│   ├── context/
│   │   └── WebSocketContext.tsx # WebSocket state management
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities and helpers
│   │   └── shapeRecognizer.ts # AI shape recognition
│   ├── pages/                # Route components
│   └── types/                # TypeScript type definitions
├── public/                   # Static assets
└── test/                     # Test files
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start frontend development server
- `npm run dev:with-server` - Start both frontend and backend
- `npm run server` - Start backend server only
- `npm run server:dev` - Start backend in watch mode
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

### Key Technologies

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Node.js, Express, Socket.io
- **Styling**: Tailwind CSS, shadcn/ui
- **Testing**: Vitest, Playwright
- **Voice Chat**: WebRTC
- **Real-time**: Socket.io

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SOCKET_URL` | WebSocket server URL | `http://localhost:3001` |

### Server Configuration

The Socket.io server runs on port 3001 by default. Configure rooms, user limits, and other settings in `server.ts`.

## 🎨 Features in Detail

### Real-time Collaboration
- Stroke synchronization across all connected users
- Room-based collaboration
- Automatic conflict resolution

### Voice Chat
- WebRTC-based peer-to-peer audio
- Mute/unmute controls
- Automatic audio track management

### AI Features
- Shape recognition and auto-completion
- Stroke smoothing and optimization
- Intelligent tool suggestions

### User Interface
- Intuitive drawing tools (pen, eraser, shapes)
- Color picker and brush size controls
- Responsive design for all screen sizes

## 🧪 Testing

Run the test suite:
```bash
npm run test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## 📚 Documentation

- [WebSocket Setup Guide](WEBSOCKET_SETUP.md)
- [Voice Chat Diagnostics](VOICE_CHAT_DIAGNOSTIC.md)
- [Quick Start Guide](QUICK_START.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide React](https://lucide.dev/)
- Real-time communication powered by [Socket.io](https://socket.io/)
