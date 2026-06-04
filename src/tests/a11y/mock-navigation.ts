import { mock } from "bun:test";

let mockPathname = "/";
let mockSearchParams = new URLSearchParams();

const router = {
  push: mock(() => {}),
  replace: mock(() => {}),
  back: mock(() => {}),
  forward: mock(() => {}),
  refresh: mock(() => {}),
  prefetch: mock(async () => {}),
};

mock.module("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => router,
  useSearchParams: () => mockSearchParams,
  notFound: () => {
    throw new Error("notFound()");
  },
}));

export function setMockPathname(pathname: string): void {
  mockPathname = pathname;
}

export function setMockSearchParams(params: URLSearchParams): void {
  mockSearchParams = params;
}

export function resetMockNavigation(): void {
  mockPathname = "/";
  mockSearchParams = new URLSearchParams();
}
