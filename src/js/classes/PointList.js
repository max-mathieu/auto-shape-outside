export default class PointList {
  constructor(expectedLength) {
    this.x = new Uint16Array(expectedLength || 64);
    this.y = new Uint16Array(expectedLength || 64);
    this.length = 0;
  }

  _extendStorage(newStorageLength) {
    const newX = new Uint16Array(newStorageLength);
    const newY = new Uint16Array(newStorageLength);
    newX.set(this.x, 0);
    newY.set(this.y, 0);
    this.x = newX;
    this.y = newY;
  }

  push(x, y) {
    if (this.length === this.x.length) {
      const addlLength = this.length < 65536 ? this.length : 65536;
      this._extendStorage(this.length + addlLength);
    }
    this.x[this.length] = x;
    this.y[this.length] = y;
    this.length++;
  }

  concat(other) {
    const newLength = this.length + other.length;
    if (this.x.length <= newLength) {
      this._extendStorage(newLength);
    }
    this.x.set(other.x.slice(0, other.length), this.length);
    this.y.set(other.y.slice(0, other.length), this.length);
    this.length = newLength;
    return this;
  }

  translate(dx, dy) {
    for (let i = 0; i < this.length; i++) {
      this.x[i] += dx;
      this.y[i] += dy;
    }
    return this;
  }

  forEach(callback, begin, end) {
    begin = begin || 0;
    end = end || this.length;
    for (let i = begin; i < end; i++) {
      const shouldStop = callback(this.x[i], this.y[i], i);
      if (shouldStop) return;
    }
  }

  slice(begin, end) {
    const length = end - begin;
    const slice = new PointList(length);
    slice.x.set(this.x.slice(begin, end));
    slice.y.set(this.y.slice(begin, end));
    slice.length = length;
    return slice;
  }
}
