export function squareDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return (dx * dx) + (dy * dy);
}
export function squareDistanceToLine(x1, y1, x2, y2, x, y) {
  // https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
  const dx = x2 - x1;
  const dy = y2 - y1;
  const numerator = ((dy * x) - (dx * y)) + ((x2 * y1) - (x1 * y2));
  const denominator = (dx * dx) + (dy * dy);
  return (numerator * numerator) / denominator;
}

export function intersectLines(x1, y1, x2, y2, x3, y3, x4, y4) {
  // https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection#Given_two_points_on_each_line
  const dx12 = x1 - x2;
  const dy12 = y1 - y2;
  const dx34 = x3 - x4;
  const dy34 = y3 - y4;
  const cross12 = (x1 * y2) - (x2 * y1);
  const cross34 = (x3 * y4) - (x4 * y3);
  const xNumerator = (cross12 * dx34) - (cross34 * dx12);
  const yNumerator = (cross12 * dy34) - (cross34 * dy12);
  const denominator = (dx12 * dy34) - (dx34 * dy12);
  const ix = Math.round(xNumerator / denominator);
  const iy = Math.round(yNumerator / denominator);
  return [ix, iy];
}
