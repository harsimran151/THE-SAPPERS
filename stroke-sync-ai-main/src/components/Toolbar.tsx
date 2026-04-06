import React from 'react';
import { Tool, DRAWING_COLORS } from '@/types/whiteboard';
import { Slider } from '@/components/ui/slider';
import {
  Pen, Eraser, Square, Circle, Minus, Triangle, Move, Undo2, Redo2, Trash2, Sparkles, Mic2, MicOff, Headphones
} from 'lucide-react';

interface ToolbarProps {
  tool: Tool;
  color: string;
  strokeWidth: number;
  shapeRecognition: boolean;
  voiceEnabled: boolean;
  isMuted: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (w: number) => void;
  onToggleShapeRecognition: () => void;
  onToggleVoice: () => void;
  onToggleMute: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

const toolItems: { tool: Tool; icon: React.ReactNode; label: string }[] = [
  { tool: 'pen', icon: <Pen size={18} />, label: 'Pen' },
  { tool: 'eraser', icon: <Eraser size={18} />, label: 'Eraser' },
  { tool: 'select', icon: <Move size={18} />, label: 'Select' },
  { tool: 'line', icon: <Minus size={18} />, label: 'Line' },
  { tool: 'rectangle', icon: <Square size={18} />, label: 'Rectangle' },
  { tool: 'circle', icon: <Circle size={18} />, label: 'Circle' },
  { tool: 'triangle', icon: <Triangle size={18} />, label: 'Triangle' },
];

const Toolbar: React.FC<ToolbarProps> = ({
  tool, color, strokeWidth, shapeRecognition, voiceEnabled, isMuted,
  canUndo, canRedo,
  onToolChange, onColorChange, onStrokeWidthChange,
  onToggleShapeRecognition, onToggleVoice, onToggleMute, onUndo, onRedo, onClear,
}) => {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Tools */}
      <div className="glass-toolbar rounded-xl px-2 py-2 flex items-center gap-1 h-14">
        {toolItems.map(({ tool: t, icon, label }) => (
          <button
            key={t}
            onClick={() => onToolChange(t)}
            className={`p-2 rounded-lg transition-all ${
              tool === t
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title={label}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Colors */}
      <div className="glass-toolbar rounded-xl px-3 py-2 flex items-center gap-2 h-14">
        {DRAWING_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className={`w-6 h-6 rounded-full transition-all border-2 flex-shrink-0 ${
              color === c ? 'border-primary scale-110' : 'border-transparent hover:scale-105'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <div className="w-px h-6 bg-border" />
        <div className="relative w-6 h-6 rounded-full overflow-hidden border-2 border-border hover:border-primary transition-all flex-shrink-0 cursor-pointer" style={{ backgroundColor: color }}>
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
            title="Custom color picker"
          />
        </div>
      </div>

      {/* Brush / Eraser Size */}
      <div className="glass-toolbar rounded-xl px-4 py-2 flex items-center gap-3 h-14 min-w-[260px]">
        <label className="flex flex-col gap-0 min-w-fit">
          <span className="text-xs text-muted-foreground">Size</span>
          <span className="text-sm font-medium">{strokeWidth}px</span>
        </label>
        <div className="flex-1 h-8 flex items-center">
          <Slider
            value={[strokeWidth]}
            min={1}
            max={40}
            step={1}
            onValueChange={(value) => onStrokeWidthChange(value[0])}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="glass-toolbar rounded-xl px-2 py-2 flex items-center gap-1 h-14">
        <button
          onClick={onToggleShapeRecognition}
          className={`p-2 rounded-lg transition-all ${
            shapeRecognition
              ? 'bg-accent/20 text-accent'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          title="AI Shape Recognition"
        >
          <Sparkles size={18} />
        </button>
        <button
          onClick={onToggleVoice}
          className={`p-2 rounded-lg transition-all ${
            voiceEnabled
              ? 'bg-emerald-200 text-emerald-700'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          title={voiceEnabled ? 'Leave voice chat' : 'Join voice chat'}
        >
          <Headphones size={18} />
        </button>
        <button
          onClick={onToggleMute}
          disabled={!voiceEnabled}
          className={`p-2 rounded-lg transition-all ${
            voiceEnabled
              ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
              : 'opacity-30 cursor-not-allowed'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff size={18} /> : <Mic2 size={18} />}
        </button>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30 cursor-pointer"
          title="Undo"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30 cursor-pointer"
          title="Redo"
        >
          <Redo2 size={18} />
        </button>
        <button
          onClick={onClear}
          className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
          title="Clear Canvas"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
