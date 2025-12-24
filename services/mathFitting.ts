
import { Point, FittingResult } from '../types';

/**
 * Solves Ax = B using Gaussian elimination
 */
function solveMatrix(A: number[][], B: number[]): number[] {
  const n = B.length;
  for (let i = 0; i < n; i++) {
    let max = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[j][i]) > Math.abs(A[max][i])) max = j;
    }
    [A[i], A[max]] = [A[max], A[i]];
    [B[i], B[max]] = [B[max], B[i]];

    for (let j = i + 1; j < n; j++) {
      const factor = A[j][i] / A[i][i];
      B[j] -= factor * B[i];
      for (let k = i; k < n; k++) {
        A[j][k] -= factor * A[i][k];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += A[i][j] * x[j];
    }
    x[i] = (B[i] - sum) / A[i][i];
  }
  return x;
}

/**
 * Fits a polynomial of degree n to a set of points
 */
export const fitPolynomial = (points: Point[], degree: number, width: number, height: number): FittingResult => {
  if (points.length < degree + 1) {
    return { formula: 'Insufficient Data', points: [], coefficients: [], type: 'polynomial' };
  }

  // Normalize points for numerical stability
  const normPoints = points.map(p => ({ x: p.x / width, y: p.y / height }));
  
  const n = degree + 1;
  const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const B: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sumX = 0;
      for (const p of normPoints) {
        sumX += Math.pow(p.x, i + j);
      }
      A[i][j] = sumX;
    }
    let sumXY = 0;
    for (const p of normPoints) {
      sumXY += Math.pow(p.x, i) * p.y;
    }
    B[i] = sumXY;
  }

  const coefficients = solveMatrix(A, B);

  // Generate formula string
  const formulaParts = coefficients
    .map((c, i) => {
      const val = c.toFixed(2);
      if (i === 0) return val;
      if (i === 1) return `${val}x`;
      return `${val}x^{${i}}`;
    })
    .reverse();
  const formula = `f(x) = ${formulaParts.join(' + ')}`;

  // Generate curve points
  const curvePoints: Point[] = [];
  for (let x = 0; x <= width; x += 5) {
    const nx = x / width;
    let ny = 0;
    for (let i = 0; i < coefficients.length; i++) {
      ny += coefficients[i] * Math.pow(nx, i);
    }
    curvePoints.push({ x, y: ny * height });
  }

  return { formula, points: curvePoints, coefficients, type: 'polynomial' };
};

/**
 * Douglas-Peucker simplification
 */
export const simplifyPoints = (points: Point[], epsilon: number): Point[] => {
  if (points.length <= 2) return points;

  const findPerpendicularDistance = (p: Point, p1: Point, p2: Point) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x) / Math.sqrt(dx * dx + dy * dy);
  };

  let dmax = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = findPerpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const recursiveResults1 = simplifyPoints(points.slice(0, index + 1), epsilon);
    const recursiveResults2 = simplifyPoints(points.slice(index), epsilon);
    return [...recursiveResults1.slice(0, -1), ...recursiveResults2];
  } else {
    return [points[0], points[points.length - 1]];
  }
};
