import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

window.scrollTo = () => {};

if (!window.matchMedia) {
  window.matchMedia = () =>
    ({
      matches: false,
      media: "",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

if (!window.IntersectionObserver) {
  class IntersectionObserverMock implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = "0px";
    readonly thresholds: ReadonlyArray<number> = [0];
    private readonly cb: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
      this.cb = callback;
    }

    disconnect() {}

    observe(target: Element) {
      this.cb([{ isIntersecting: true, target } as IntersectionObserverEntry], this);
    }

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }

    unobserve() {}
  }

  window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
}
