
import { Point } from '../types';

export const getEdges = (canvas: HTMLCanvasElement, threshold: number): Point[] => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const w = canvas.width;
  const h = canvas.height;

  // Grayscale and Sobel-like simple edge detection
  const edges: Point[] = [];
  const gray = new Float32Array(w * h);

  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = (data[i] + data[i + 1] + data[i + 2]) / 3;
  }

  // Simple Gradient Magnitude
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx = gray[idx + 1] - gray[idx - 1];
      const gy = gray[idx + w] - gray[idx - w];
      const mag = Math.sqrt(gx * gx + gy * gy);

      if (mag > threshold) {
        edges.push({ x, y });
      }
    }
  }

  return edges;
};

/**
 * Segments points into continuous paths for fitting
 */
export const segmentEdges = (points: Point[], maxGap: number = 10): Point[][] => {
  if (points.length === 0) return [];

  // Sort by X coordinate for polynomial fitting convenience
  const sorted = [...points].sort((a, b) => a.x - b.x);
  
  const paths: Point[][] = [];
  let currentPath: Point[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = currentPath[currentPath.length - 1];
    const curr = sorted[i];
    const dist = Math.sqrt(Math.pow(curr.x - last.x, 2) + Math.pow(curr.y - last.y, 2));

    if (dist < maxGap) {
      currentPath.push(curr);
    } else {
      if (currentPath.length > 20) paths.push(currentPath);
      currentPath = [curr];
    }
  }
  if (currentPath.length > 20) paths.push(currentPath);

  return paths;
};
