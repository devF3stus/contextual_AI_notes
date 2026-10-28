// @vitest-environment jsdom
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import Login from "./components/Login";
import {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  authHeaders,
} from "./services/api";

// Mock ThemeContext
vi.mock("./context/ThemeContext", () => ({
  useTheme: () => ({
    theme: "light",
    toggleTheme: vi.fn(),
  }),
}));

// Mock api login
const mockApiLogin = vi.fn();
vi.mock("./services/api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    login: (...args) => mockApiLogin(...args),
  };
});

function typeIntoInput(input, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  nativeSetter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("Authentication Unit Tests", () => {
  let container;
  let root;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe("Token Storage Helpers", () => {
    it("stores, retrieves, and removes JWT token in localStorage", () => {
      expect(getStoredToken()).toBeNull();

      setStoredToken("test-jwt-token-xyz");
      expect(getStoredToken()).toBe("test-jwt-token-xyz");

      const headers = authHeaders({ "Content-Type": "application/json" });
      expect(headers["Authorization"]).toBe("Bearer test-jwt-token-xyz");
      expect(headers["Content-Type"]).toBe("application/json");

      removeStoredToken();
      expect(getStoredToken()).toBeNull();

      const headersAfter = authHeaders();
      expect(headersAfter["Authorization"]).toBeUndefined();
    });
  });

  describe("Login Component", () => {
    it("renders username and password inputs and sign-in button", () => {
      act(() => {
        root.render(<Login onLoginSuccess={vi.fn()} />);
      });

      const userInput = container.querySelector("#username");
      const passInput = container.querySelector("#password");
      const submitBtn = container.querySelector("button[type='submit']");

      expect(userInput).not.toBeNull();
      expect(passInput).not.toBeNull();
      expect(submitBtn).not.toBeNull();
      expect(submitBtn.textContent).toContain("Sign In");
    });

    it("displays error message if credentials fail", async () => {
      mockApiLogin.mockRejectedValueOnce(new Error("Invalid username or password"));

      act(() => {
        root.render(<Login onLoginSuccess={vi.fn()} />);
      });

      const userInput = container.querySelector("#username");
      const passInput = container.querySelector("#password");
      const form = container.querySelector("form");

      act(() => {
        typeIntoInput(userInput, "Festudev");
        typeIntoInput(passInput, "wrongpassword");
      });

      await act(async () => {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });

      expect(container.textContent).toContain("Invalid username or password");
    });

    it("successfully logs in with valid credentials and invokes onLoginSuccess", async () => {
      const onLoginSuccess = vi.fn();
      mockApiLogin.mockResolvedValueOnce({
        token: "jwt-token-festudev",
        user: { username: "Festudev" },
      });

      act(() => {
        root.render(<Login onLoginSuccess={onLoginSuccess} />);
      });

      const userInput = container.querySelector("#username");
      const passInput = container.querySelector("#password");
      const form = container.querySelector("form");

      act(() => {
        typeIntoInput(userInput, "Festudev");
        typeIntoInput(passInput, "11974");
      });

      await act(async () => {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });

      expect(mockApiLogin).toHaveBeenCalledWith("Festudev", "11974");
      expect(onLoginSuccess).toHaveBeenCalledWith({ username: "Festudev" });
    });
  });
});
