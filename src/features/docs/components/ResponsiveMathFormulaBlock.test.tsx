import { afterEach, describe, expect, test } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ResponsiveMathFormulaBlock } from "@/features/docs/components/ResponsiveMathFormulaBlock";

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      matches,
      media: "(max-width: 639px)",
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe("ResponsiveMathFormulaBlock", () => {
  afterEach(() => {
    cleanup();
  });

  test("collapses variable definitions by default on mobile and toggles them from the equation", async () => {
    mockMatchMedia(true);

    render(
      <ResponsiveMathFormulaBlock
        formula={<div>Attention equation</div>}
        formulaId="gqa"
      >
        <div>Variable definitions</div>
      </ResponsiveMathFormulaBlock>,
    );

    await waitFor(() => {
      expect(screen.queryByText("Variable definitions")).toBeNull();
    });

    const toggle = screen.getByRole("button", {
      name: /attention equation/i,
    });

    fireEvent.click(toggle);

    expect(screen.getByText("Variable definitions")).toBeTruthy();
    expect(screen.getByRole("button", { name: /attention equation/i }));
  });

  test("keeps variable definitions visible on desktop", async () => {
    mockMatchMedia(false);

    render(
      <ResponsiveMathFormulaBlock
        formula={<div>Attention equation</div>}
        formulaId="mha"
      >
        <div>Variable definitions</div>
      </ResponsiveMathFormulaBlock>,
    );

    expect(screen.getByText("Variable definitions")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
