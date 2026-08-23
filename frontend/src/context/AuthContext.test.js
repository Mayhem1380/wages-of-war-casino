import { resolveAuthStateFromError } from "../lib/authState";

describe("resolveAuthStateFromError", () => {
  it("treats unauthorized responses as logged-out users", () => {
    expect(resolveAuthStateFromError({ response: { status: 401 } })).toBe(false);
  });

  it("keeps the session state loading for transient backend failures", () => {
    expect(resolveAuthStateFromError({ code: "ERR_NETWORK" })).toBe(null);
  });
});
