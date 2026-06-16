import { mock } from "bun:test";

let mockPathname = "/";
let mockParams: Record<string, string | string[]> = {};
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
  useParams: () => mockParams,
  useRouter: () => router,
  useSearchParams: () => mockSearchParams,
  notFound: () => {
    throw new Error("notFound()");
  },
}));

export function setMockPathname(pathname: string): void {
  mockPathname = pathname;
}

export function setMockParams(params: Record<string, string | string[]>): void {
  mockParams = params;
}

export function setMockSearchParams(params: URLSearchParams): void {
  mockSearchParams = params;
}

export function resetMockNavigation(): void {
  mockPathname = "/";
  mockParams = {};
  mockSearchParams = new URLSearchParams();
}
