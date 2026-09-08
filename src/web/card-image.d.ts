export interface ImageTarget {
  src: string;
  onerror: null | (() => void);
}

export function loadImageWithFallback(
  image: ImageTarget,
  primarySrc: string,
  fallbackSrc: string,
): void;
