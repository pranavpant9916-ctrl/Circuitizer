/**
 * Circuitizer Perspective Homography Engine
 * Computes 3x3 Projective Transformation matrices to rectify tilted desk photos of
 * 830-tie solderless breadboards into millimeter-accurate orthographic top-down projections.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface BreadboardCorners {
  a1: Point2D;   // Top-Left (Row 1, Top Rail / Hole A1)
  a63: Point2D;  // Top-Right (Row 63, Top Rail / Hole A63)
  j63: Point2D;  // Bottom-Right (Row 63, Bottom Rail / Hole J63)
  j1: Point2D;   // Bottom-Left (Row 1, Bottom Rail / Hole J1)
}

export class HomographyEngine {
  /**
   * Solves the 8-DOF Projective Transformation Matrix H mapping from source to destination
   * using Gaussian elimination with partial pivoting.
   */
  public static getPerspectiveTransform(src: Point2D[], dst: Point2D[]): number[] {
    const a: number[][] = [];
    const b: number[] = [];

    for (let i = 0; i < 4; i++) {
      const sx = src[i].x;
      const sy = src[i].y;
      const dx = dst[i].x;
      const dy = dst[i].y;

      a.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
      b.push(dx);

      a.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
      b.push(dy);
    }

    const h = this.solveGaussian(a, b);
    return [...h, 1]; // [h00, h01, h02, h10, h11, h12, h20, h21, h22=1]
  }

  /**
   * Solve 8x8 linear system A * x = B via Gaussian elimination with partial pivoting
   */
  private static solveGaussian(A: number[][], B: number[]): number[] {
    const n = B.length;
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      const tmpRow = A[i];
      A[i] = A[maxRow];
      A[maxRow] = tmpRow;

      const tmpB = B[i];
      B[i] = B[maxRow];
      B[maxRow] = tmpB;

      // Pivot normalization
      const pivot = A[i][i];
      if (Math.abs(pivot) < 1e-10) continue;

      for (let j = i; j < n; j++) {
        A[i][j] /= pivot;
      }
      B[i] /= pivot;

      // Eliminate lower/upper rows
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = A[k][i];
          for (let j = i; j < n; j++) {
            A[k][j] -= factor * A[i][j];
          }
          B[k] -= factor * B[i];
        }
      }
    }
    return B;
  }

  /**
   * Perspective-rectifies an input image/canvas using 4 corner points (a1, a63, j63, j1)
   * into a flat orthographic 830-tie breadboard image.
   *
   * @param sourceCanvas Source canvas with the captured frame
   * @param corners 4 detected or user-adjusted corner points in source pixel coordinates
   * @param targetWidth Output rectified width (default: 1260px)
   * @param targetHeight Output rectified height (default: 400px)
   */
  public static rectifyBreadboard(
    sourceCanvas: HTMLCanvasElement,
    corners: BreadboardCorners,
    targetWidth: number = 1260,
    targetHeight: number = 400
  ): HTMLCanvasElement {
    const srcCtx = sourceCanvas.getContext('2d');
    if (!srcCtx) return sourceCanvas;

    const srcWidth = sourceCanvas.width;
    const srcHeight = sourceCanvas.height;
    const srcImageData = srcCtx.getImageData(0, 0, srcWidth, srcHeight);
    const srcData = new Uint32Array(srcImageData.data.buffer);

    // Destination orthographic rectangle corners
    const dstPoints: Point2D[] = [
      { x: 0, y: 0 },
      { x: targetWidth, y: 0 },
      { x: targetWidth, y: targetHeight },
      { x: 0, y: targetHeight },
    ];

    // Source quadrilateral corners
    const srcPoints: Point2D[] = [
      corners.a1,
      corners.a63,
      corners.j63,
      corners.j1,
    ];

    // Inverse Homography: map each destination pixel (u, v) -> source pixel (x, y)
    const H_inv = this.getPerspectiveTransform(dstPoints, srcPoints);

    // Create destination canvas
    const destCanvas = document.createElement('canvas');
    destCanvas.width = targetWidth;
    destCanvas.height = targetHeight;
    const destCtx = destCanvas.getContext('2d');
    if (!destCtx) return sourceCanvas;

    const destImageData = destCtx.createImageData(targetWidth, targetHeight);
    const destData = new Uint32Array(destImageData.data.buffer);

    const h0 = H_inv[0], h1 = H_inv[1], h2 = H_inv[2];
    const h3 = H_inv[3], h4 = H_inv[4], h5 = H_inv[5];
    const h6 = H_inv[6], h7 = H_inv[7];

    // Warp destination pixels
    for (let dy = 0; dy < targetHeight; dy++) {
      const rowOffset = dy * targetWidth;
      for (let dx = 0; dx < targetWidth; dx++) {
        const denom = h6 * dx + h7 * dy + 1;
        if (Math.abs(denom) < 1e-7) continue;

        const sx = (h0 * dx + h1 * dy + h2) / denom;
        const sy = (h3 * dx + h4 * dy + h5) / denom;

        const ix = Math.floor(sx);
        const iy = Math.floor(sy);

        if (ix >= 0 && ix < srcWidth && iy >= 0 && iy < srcHeight) {
          destData[rowOffset + dx] = srcData[iy * srcWidth + ix];
        } else {
          // Dark Navy background (#131d27) for out-of-bounds pixels
          destData[rowOffset + dx] = 0xff271d13;
        }
      }
    }

    destCtx.putImageData(destImageData, 0, 0);
    return destCanvas;
  }
}
