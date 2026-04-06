import React from 'react';
import { CursorData } from '@/types/whiteboard';

interface CursorOverlayProps {
  cursors: CursorData[];
  ownCursor: CursorData | null;
  currentUserId: string;
}

const CursorOverlay: React.FC<CursorOverlayProps> = ({ cursors, ownCursor, currentUserId }) => {
  const cursorMap = new Map<string, CursorData>();
  for (const cursor of cursors) {
    cursorMap.set(cursor.userId, cursor);
  }
  if (ownCursor) {
    cursorMap.set(ownCursor.userId, ownCursor);
  }
  const allCursors = Array.from(cursorMap.values());

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {allCursors.map((cursor) => (
          <div
            key={cursor.userId}
            className="absolute"
            style={{
              left: cursor.position.x,
              top: cursor.position.y,
              transform: 'translate(-10px, -10px)',
              transition: 'transform 0.08s ease-out, opacity 0.08s ease-out',
              willChange: 'transform, opacity',
            }}
          >
            {/* Cursor arrow */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.5))` }}
            >
              <path
                d="M3 3L10 17L12.5 10.5L19 8L3 3Z"
                fill={cursor.color}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="0.5"
              />
            </svg>
            {/* Name tag */}
            <div
              className="absolute left-4 top-4 px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap"
              style={{
                backgroundColor: cursor.color,
                color: '#000',
              }}
            >
              {cursor.name}
            </div>
          </div>
        ))}
    </div>
  );
};

export default CursorOverlay;
