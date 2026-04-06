import { Point, RecognizedShape } from '@/types/whiteboard';

// Analyze a set of points to detect if they form a recognizable shape
export function recognizeShape(points: Point[]): RecognizedShape | null {
  if (points.length < 5) return null;

  const lineScore = getLineScore(points);
  if (lineScore > 0.95) {
    return {
      type: 'line',
      params: {
        x1: points[0].x,
        y1: points[0].y,
        x2: points[points.length - 1].x,
        y2: points[points.length - 1].y,
      },
    };
  }

  const closedScore = getClosedScore(points);
  if (closedScore < 0.15) {
    const circleScore = getCircleScore(points);
    if (circleScore > 0.85) {
      const center = getCenter(points);
      const radius = getAverageRadius(points, center);
      return {
        type: 'circle',
        params: { cx: center.x, cy: center.y, radius },
      };
    }

    const rectScore = getRectangleScore(points);
    if (rectScore > 0.75) {
      const bounds = getBounds(points);
      return {
        type: 'rectangle',
        params: {
          x: bounds.minX,
          y: bounds.minY,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY,
        },
      };
    }

    const triScore = getTriangleScore(points);
    if (triScore > 0.7) {
      const vertices = getTriangleVertices(points);
      return {
        type: 'triangle',
        params: {
          x1: vertices[0].x,
          y1: vertices[0].y,
          x2: vertices[1].x,
          y2: vertices[1].y,
          x3: vertices[2].x,
          y3: vertices[2].y,
        },
      };
    }
  }

  return null;
}

function getLineScore(points: Point[]): number {
  const first = points[0];
  const last = points[points.length - 1];
  const totalDist = distance(first, last);
  if (totalDist < 20) return 0;
  
  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    pathLength += distance(points[i - 1], points[i]);
  }
  
  return totalDist / pathLength;
}

function getClosedScore(points: Point[]): number {
  const first = points[0];
  const last = points[points.length - 1];
  const bounds = getBounds(points);
  const diag = Math.sqrt(
    Math.pow(bounds.maxX - bounds.minX, 2) + Math.pow(bounds.maxY - bounds.minY, 2)
  );
  if (diag === 0) return 1;
  return distance(first, last) / diag;
}

function getCircleScore(points: Point[]): number {
  const center = getCenter(points);
  const avgRadius = getAverageRadius(points, center);
  if (avgRadius < 10) return 0;

  let variance = 0;
  for (const p of points) {
    const d = distance(p, center);
    variance += Math.pow(d - avgRadius, 2);
  }
  variance /= points.length;
  const stdDev = Math.sqrt(variance);
  return Math.max(0, 1 - stdDev / avgRadius);
}

function getRectangleScore(points: Point[]): number {
  const bounds = getBounds(points);
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  if (w < 15 || h < 15) return 0;

  // Check how many points are near the edges
  const threshold = Math.max(w, h) * 0.15;
  let nearEdge = 0;
  for (const p of points) {
    const dLeft = Math.abs(p.x - bounds.minX);
    const dRight = Math.abs(p.x - bounds.maxX);
    const dTop = Math.abs(p.y - bounds.minY);
    const dBottom = Math.abs(p.y - bounds.maxY);
    if (Math.min(dLeft, dRight, dTop, dBottom) < threshold) {
      nearEdge++;
    }
  }
  return nearEdge / points.length;
}

function getTriangleScore(points: Point[]): number {
  const bounds = getBounds(points);
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  if (w < 15 || h < 15) return 0;

  // Try to fit to a triangle by finding 3 main corners
  const corners = findCorners(points);
  if (corners.length < 3) return 0;

  // Check if points are mostly near the triangle edges
  const threshold = Math.max(w, h) * 0.2;
  let nearEdge = 0;
  for (const p of points) {
    let minDist = Infinity;
    // Check distance to each edge
    for (let i = 0; i < 3; i++) {
      const c1 = corners[i];
      const c2 = corners[(i + 1) % 3];
      const d = pointToLineDistance(p, c1, c2);
      minDist = Math.min(minDist, d);
    }
    if (minDist < threshold) nearEdge++;
  }
  return nearEdge / points.length;
}

function findCorners(points: Point[]): Point[] {
  // Find the 3 points that are furthest apart (rough convex hull)
  let topPoint: Point | null = null;
  let bottomLeftPoint: Point | null = null;
  let bottomRightPoint: Point | null = null;

  for (const p of points) {
    if (topPoint === null || p.y < topPoint.y) {
      topPoint = p;
    }
  }

  for (const p of points) {
    if (p === topPoint) continue;
    if (bottomLeftPoint === null || (p.x < bottomLeftPoint.x || (p.x === bottomLeftPoint.x && p.y > bottomLeftPoint.y))) {
      bottomLeftPoint = p;
    }
  }

  for (const p of points) {
    if (p === topPoint || p === bottomLeftPoint) continue;
    if (bottomRightPoint === null || p.x > bottomRightPoint.x) {
      bottomRightPoint = p;
    }
  }

  return [topPoint, bottomLeftPoint || topPoint, bottomRightPoint || topPoint].filter(p => p !== null);
}

function pointToLineDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (len * len)));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

function getTriangleVertices(points: Point[]): Point[] {
  return findCorners(points).slice(0, 3);
}

function getCenter(points: Point[]): Point {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function getAverageRadius(points: Point[], center: Point): number {
  const totalDist = points.reduce((sum, p) => sum + distance(p, center), 0);
  return totalDist / points.length;
}

function getBounds(points: Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

function distance(a: Point, b: Point): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

// Render a recognized shape onto a canvas context
export function renderShape(
  ctx: CanvasRenderingContext2D,
  shape: RecognizedShape,
  color: string,
  width: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (shape.type) {
    case 'circle': {
      const { cx, cy, radius } = shape.params;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'rectangle': {
      const { x, y, width: w, height: h } = shape.params;
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.stroke();
      break;
    }
    case 'line': {
      const { x1, y1, x2, y2 } = shape.params;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      break;
    }
    case 'triangle': {
      const { x1, y1, x2, y2, x3, y3 } = shape.params;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.stroke();
      break;
    }
  }
}
