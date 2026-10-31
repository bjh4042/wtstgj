// NEW_AUTHORED development-consumer contract. No game/source state access.
// Only integer native world points, not camera/UV/subpixel coordinates.
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const validBounds = (width, height) =>
  Number.isSafeInteger(width) && width > 0 &&
  Number.isSafeInteger(height) && height > 0;

/** Return an immutable owned copy, or null. Never read index accessors. */
export function readNativePoint2(value, width, height) {
  if (!validBounds(width, height)) return null;
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== 3 || !['0', '1', 'length'].every(key => hasOwn(descriptors, key))) return null;
    for (const key of ['0', '1', 'length']) {
      if (!hasOwn(descriptors[key], 'value')) return null;
    }
    if (descriptors.length.value !== 2) return null;
    const x = descriptors['0'].value;
    const y = descriptors['1'].value;
    if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) return null;
    if (x < 0 || x >= width || y < 0 || y >= height) return null;
    return Object.freeze([x, y]);
  } catch {
    return null;
  }
}

/** Pin trusted map dimensions once, outside an asynchronous action. */
export function createNativePoint2Reader(width, height) {
  if (!validBounds(width, height)) throw new TypeError('INVALID_NATIVE_BOUNDS');
  return value => readNativePoint2(value, width, height);
}
