import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Without globals, Testing Library never registers its own afterEach, so one
// test's DOM leaks into the next.
afterEach(cleanup);
