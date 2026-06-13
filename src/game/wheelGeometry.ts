// Geometry for laying tiles on the wheel ring and hit-testing pointer positions.

// Ring radius as a fraction of hub width, from center. Tiles are 26% of the hub wide
// (radius 0.13), so the rim inset is 0.5 - (RING + 0.13) = 4% of the hub (~10px at the
// 250px hub cap) — breathing room between the tiles and the wheel edge.
const RING = 0.33

export interface RingPoint {
  x: number // 0..1 fraction of hub width
  y: number // 0..1 fraction of hub height
}

/** Positions for `n` tiles, first at top, clockwise. */
export function ringPositions(n: number): RingPoint[] {
  const pts: RingPoint[] = []
  for (let i = 0; i < n; i++) {
    const theta = (-90 + i * (360 / n)) * (Math.PI / 180)
    pts.push({ x: 0.5 + RING * Math.cos(theta), y: 0.5 + RING * Math.sin(theta) })
  }
  return pts
}

/**
 * Return the index of the tile under (clientX, clientY), or -1.
 * `hubRect` is the bounding rect of the wheel hub element.
 */
export function hitTestTile(clientX: number, clientY: number, hubRect: DOMRect, n: number): number {
  const pts = ringPositions(n)
  // hit radius slightly beyond the visual tile rim (tiles are 26% of hub -> radius 0.13);
  // 0.145 adds near-miss forgiveness while staying under the 6-letter ambiguity bound
  // (half tile pitch = RING/2 = 0.165)
  const hitR = hubRect.width * 0.145
  let best = -1
  let bestDist = hitR * hitR
  for (let i = 0; i < n; i++) {
    const cx = hubRect.left + pts[i].x * hubRect.width
    const cy = hubRect.top + pts[i].y * hubRect.height
    const dx = clientX - cx
    const dy = clientY - cy
    const d2 = dx * dx + dy * dy
    if (d2 <= bestDist) {
      bestDist = d2
      best = i
    }
  }
  return best
}
