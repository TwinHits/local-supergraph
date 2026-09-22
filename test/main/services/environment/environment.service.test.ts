import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_FILE = "/nonexistent/local-supergraph-test.env";

vi.mock(
  "@/main/services/environment/environment.constants",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/main/services/environment/environment.constants")
      >();
    return { ...actual, ENV_FILE };
  }
);

const ENV_KEYS = ["APOLLO_KEY", "APOLLO_GRAPH_REF", "AWS_REGION"] as const;

let savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string>> = {};

beforeEach(function isolate() {
  vi.resetModules();
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(function restore() {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});

async function freshEnvironment() {
  return import("@/main/services/environment/environment.service");
}

describe("reading a variable with no default blanks instead of throwing when it's unset", () => {
  it("resolves an unset variable to the empty string", async () => {
    const { environment } = await freshEnvironment();

    expect(environment.apolloKey()).toBe("");
  });

  it("resolves a variable that is set", async () => {
    process.env.APOLLO_KEY = "service:test:abc";
    const { environment } = await freshEnvironment();

    expect(environment.apolloKey()).toBe("service:test:abc");
  });
});

describe("the AWS region falls back to us-east-1, the value the reference script hardcoded", () => {
  it("falls back to us-east-1 when AWS_REGION is not set", async () => {
    const { environment } = await freshEnvironment();

    expect(environment.awsRegion()).toBe("us-east-1");
  });

  it("uses AWS_REGION when it is set", async () => {
    process.env.AWS_REGION = "us-west-2";
    const { environment } = await freshEnvironment();

    expect(environment.awsRegion()).toBe("us-west-2");
  });
});

describe("the graph name is the part of APOLLO_GRAPH_REF before the @", () => {
  it("splits the name from the variant", async () => {
    process.env.APOLLO_GRAPH_REF = "my-graph@develop";
    const { environment } = await freshEnvironment();

    expect(environment.graphName()).toBe("my-graph");
  });

  it("is empty when APOLLO_GRAPH_REF is not set", async () => {
    const { environment } = await freshEnvironment();

    expect(environment.graphName()).toBe("");
  });
});
