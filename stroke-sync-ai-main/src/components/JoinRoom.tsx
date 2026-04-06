import React, { useState } from 'react';
import { USER_COLORS } from '@/types/whiteboard';

interface JoinRoomProps {
  onJoin: (name: string, roomId: string) => void;
}

const JoinRoom: React.FC<JoinRoomProps> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(id);
    setIsCreating(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && roomId.trim()) {
      onJoin(name.trim(), roomId.trim().toUpperCase());
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center glow-primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Live<span className="text-primary">Collab</span> <span className="text-accent">AI</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Real-time collaborative whiteboard with AI
          </p>
        </div>

        {/* Join Form */}
        <form onSubmit={handleSubmit} className="glass rounded-xl p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              maxLength={20}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Room ID</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="Enter room ID"
              className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono tracking-widest"
              maxLength={20}
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={generateRoomId}
              className="flex-1 px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors text-sm"
            >
              Create Room
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all glow-primary text-sm"
            >
              {isCreating ? 'Start Session' : 'Join Room'}
            </button>
          </div>
        </form>

        {/* User color preview */}
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {USER_COLORS.map((color, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full animate-pulse-glow"
              style={{ backgroundColor: color, animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Each user gets a unique cursor color
        </p>
      </div>
    </div>
  );
};

export default JoinRoom;
