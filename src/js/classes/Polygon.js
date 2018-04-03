import { PointList } from './PointList';

export default class Polygon extends PointList {
  clip(x1, y1, x2, y2, isInFunc) {
    const result = new Polygon();
    const maxI = this.length - 1;
    let lastX = this.x[maxI];
    let lastY = this.y[maxI];
    let lastIsIn = isInFunc(lastX, lastY);
    for (let i = 0; i <= maxI; i++) {
      const x = this.x[i];
      const y = this.y[i];
      const isIn = isInFunc(x, y);
      if (isIn ^ lastIsIn) {
      // TODO curry function
        const intersect = intersectLines(x1, y1, x2, y2, lastX, lastY, x, y);
        result.push(intersect[0], intersect[1]);
      }
      if (isIn) { result.push(x, y); }
      lastX = x;
      lastY = y;
      lastIsIn = isIn;
    }
    return result;
  }

  simplify(epsilon) {
    const epsilon2 = epsilon * epsilon;
    const polygon = this._douglasPeucker(epsilon2);

    // remove very short lines left by douglasPeucker for some reason
    const result = new Polygon();
    result.push(polygon.x[0], polygon.y[0]);
    for (let i = 1; i < polygon.length; i++) {
      if (squareDistance(polygon.x[i], polygon.y[i], polygon.x[i - 1], polygon.y[i - 1]) >= epsilon2) {
        result.push(polygon.x[i], polygon.y[i]);
      }
    }
    return result;
  }

  _douglasPeucker(epsilon2) {
    // https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
    if (this.length <= 3) return this;

    // Find the point with the maximum distance
    const maxI = this.length - 1;
    let maxDistance2 = 0;
    let maxDistanceIndex = 0;
    for (let i = 1; i < maxI; i++) {
    // TODO curry function to take x
      const distance2 = squareDistanceToLine(this.x[i], this.y[i], this.x[0], this.y[0], this.x[maxI], this.y[maxI]);
      if (distance2 > maxDistance2) {
        maxDistance2 = distance2;
        maxDistanceIndex = i;
      }
    }

    // If max distance is greater than epsilon, recursively simplify
    if (maxDistance2 <= epsilon2) {
      const result = new Polygon(2);
      result.push(this.x[0], this.y[0]);
      result.push(this.x[maxI], this.y[maxI]);
      return result;
    }

    const result = new Polygon();
    result.concat(this.slice(0, maxDistanceIndex)._douglasPeucker(epsilon2));
    result.concat(this.slice(maxDistanceIndex, this.length)._douglasPeucker(epsilon2));
    return result;
  }
}

function squareDistanceToLine(x, y, x1, y1, x2, y2) {
  // https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
  let dx = x2 - x1,
    dy = y2 - y1;
  const numerator = dy * x - dx * y + x2 * y1 - x1 * y2;
  const denominator = dx * dx + dy * dy;
  return numerator * numerator / denominator;
}

function squareDistance(x1, y1, x2, y2) {
  let dx = x2 - x1,
    dy = y2 - y1;
  return dx * dx + dy * dy;
}

function intersectLines(x1, y1, x2, y2, x3, y3, x4, y4) {
  // https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection#Given_two_points_on_each_line
  const dx12 = x1 - x2;
  const dy12 = y1 - y2;
  const dx34 = x3 - x4;
  const dy34 = y3 - y4;
  const cross12 = x1 * y2 - x2 * y1;
  const cross34 = x3 * y4 - x4 * y3;
  const denominator = dx12 * dy34 - dx34 * dy12;
  const ix = Math.round((cross12 * dx34 - cross34 * dx12) / denominator);
  const iy = Math.round((cross12 * dy34 - cross34 * dy12) / denominator);
  return [ix, iy];
}
