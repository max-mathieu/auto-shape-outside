import PointList from './PointList';
import { intersectLines, squareDistance, squareDistanceToLine } from './MathUtils';

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
    result.push(polygon.x[0], polygon.x[0]);
    // TODO: loop
    // TODO: look at previously added point and not previous in polygon
    for (let i = 1; i < polygon.length; i++) {
      const d2 = squareDistance(polygon.x[i], polygon.y[i], polygon.x[i - 1], polygon.y[i - 1]);
      if (d2 >= epsilon2) result.push(polygon.x[i], polygon.x[i]);
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
    // TODO: internalize to compute some of the values once and for all?
    const squareDistanceFunc = (x, y) => {
      const d2 = squareDistanceToLine(this.x[0], this.y[0], this.x[maxI], this.y[maxI], x, y);
      return d2;
    };
    for (let i = 1; i < maxI; i++) {
      const d2 = squareDistanceFunc(this.x[i], this.y[i]);
      if (d2 > maxDistance2) {
        maxDistance2 = d2;
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
