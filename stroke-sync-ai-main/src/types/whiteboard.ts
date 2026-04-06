export type Tool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'triangle' | 'select';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  id: string;
  userId: string;
  tool: Tool;
  points: Point[];
  color: string;
  width: number;
  timestamp: number;
  // For recognized shapes
  shape?: RecognizedShape;
}

export interface RecognizedShape {
  type: 'circle' | 'rectangle' | 'line' | 'triangle';
  params: Record<string, number>;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursor?: Point;
  socketId?: string;
}

export interface Room {
  id: string;
  users: User[];
  strokes: Stroke[];
}

export interface DrawingState {
  strokes: Stroke[];
  undoStack: Map<string, Stroke[]>; // userId -> undone strokes
  currentStroke: Stroke | null;
}

export interface CursorData {
  userId: string;
  name: string;
  color: string;
  position: Point;
}

export const USER_COLORS = [
  '#38bdf8', // sky
  '#a78bfa', // violet
  '#fb923c', // orange
  '#34d399', // emerald
  '#f472b6', // pink
  '#facc15', // yellow
  '#2dd4bf', // teal
  '#e879f9', // fuchsia
];

export const DRAWING_COLORS = [
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#64748b',
];

export const STROKE_WIDTHS = [2, 4, 6, 10, 16];
