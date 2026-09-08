import { describe, expect, it } from "vitest";
import { loadImageWithFallback } from "../../../src/web/card-image.js";

describe("card image fallback", () => {
  it("replaces a missing local image with the remote card image", () => {
    const image = {
      src: "",
      onerror: null as null | (() => void),
    };
    const localImage = "/data/cards/images/fr/cards/force-of-will.jpg";
    const remoteImage = "https://cards.scryfall.io/normal/front/example.jpg";

    loadImageWithFallback(image, localImage, remoteImage);

    expect(image.src).toBe(localImage);
    expect(image.onerror).toBeTypeOf("function");

    image.onerror?.();

    expect(image.src).toBe(remoteImage);
    expect(image.onerror).toBeNull();
  });

  it("does not retry forever when the fallback image also fails", () => {
    const image = {
      src: "",
      onerror: null as null | (() => void),
    };

    loadImageWithFallback(image, "/missing-local.jpg", "https://example.test/missing-remote.jpg");
    image.onerror?.();
    const fallbackHandler = image.onerror;

    expect(fallbackHandler).toBeNull();
  });
});
