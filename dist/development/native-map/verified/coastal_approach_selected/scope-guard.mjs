// Development-only support verdict. This is not a whole-map collision classifier.
export function coastalScopeVerdict({from, to, width, height, originalSafe, newSafe}) {
  const valid = p => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger)
    && p[0] >= 0 && p[1] >= 0 && p[0] < width && p[1] < height;
  if (!valid(from) || !valid(to) || originalSafe.length !== width*height || newSafe.length !== width*height)
    throw new TypeError('Invalid native integer support contract');
  const at = p => p[1]*width+p[0];
  if (originalSafe[at(to)] > 0) return 'ALLOW_ORIGINAL_SUPPORT';
  if (newSafe[at(to)] > 0) return 'ALLOW_NEW_CANDIDATE_SUPPORT';
  if (newSafe[at(from)] > 0) return 'OUTSIDE_VERIFIED_SCOPE';
  return 'DEFER_TO_EXISTING_CONSUMER';
}
