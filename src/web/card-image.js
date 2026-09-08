/**
 * Starts an image load with a single remote fallback.
 *
 * The error handler is installed before assigning src so fast local failures
 * (such as an asset omitted from a production build) cannot be missed.
 */
export function loadImageWithFallback(image, primarySrc, fallbackSrc) {
  image.onerror = () => {
    image.onerror = null;
    if (fallbackSrc && image.src !== fallbackSrc) {
      image.src = fallbackSrc;
    }
  };
  image.src = primarySrc;
}
