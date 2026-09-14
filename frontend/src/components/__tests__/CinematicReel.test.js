import React, { act } from "react";
import ReactDOM from "react-dom/client";
import { CinematicReel } from "../CinematicReel";

jest.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => jest.fn(),
  }),
  { virtual: true },
);

jest.mock("@/lib/cinematicScore", () => ({
  useCinematicScore: () => ({
    on: false,
    toggle: jest.fn(),
  }),
}));

describe("CinematicReel", () => {
  let container;
  let root;
  let originalMatchMedia;

  beforeEach(() => {
    jest.useFakeTimers();
    global.IS_REACT_ACT_ENVIRONMENT = true;
    originalMatchMedia = window.matchMedia;
    container = document.createElement("div");
    document.body.appendChild(container);
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    if (container) {
      document.body.removeChild(container);
    }
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    global.IS_REACT_ACT_ENVIRONMENT = false;
    window.matchMedia = originalMatchMedia;
  });

  it("opens with the carrier launch and cycles through Black Hawk and Apache scenes first", () => {
    act(() => {
      root = ReactDOM.createRoot(container);
      root.render(<CinematicReel />);
    });

    expect(container.textContent).toContain("STRIKE GROUP LAUNCH");
    expect(container.textContent).toContain("WAGES OF WAR");
    expect(container.textContent).toContain(
      "Apaches and Black Hawks launch into a night mission from the carrier deck",
    );

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(container.textContent).toContain("BLACK HAWKS AIRBORNE");
    expect(container.textContent).toContain("NIGHT OPS DEPLOYED");

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(container.textContent).toContain("APACHES ON TARGET");
    expect(container.textContent).toContain("FULL MISSION OPEN");
  });
});
