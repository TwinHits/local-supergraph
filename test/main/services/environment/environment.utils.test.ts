import { describe, expect, it } from "vitest";

import { EnvironmentVariable } from "@/main/services/environment/environment.constants";
import { mergeEnvContents } from "@/main/services/environment/environment.utils";

const TEMPLATE = [
  "# Personal API key from studio.apollographql.com.",
  "APOLLO_KEY=",
  "",
  "# The graph and variant to run, as name@variant.",
  "APOLLO_GRAPH_REF=",
  "",
  "AWS_REGION=us-west-2",
  "",
].join("\n");

describe("saving credentials keeps every other line of an existing .env", () => {
  it("fills in the variables it sets and leaves comments, blanks and other variables alone", () => {
    const expected = [
      "# Personal API key from studio.apollographql.com.",
      "APOLLO_KEY=user:abc",
      "",
      "# The graph and variant to run, as name@variant.",
      "APOLLO_GRAPH_REF=my-graph@current",
      "",
      "AWS_REGION=us-west-2",
      "",
    ].join("\n");

    const actual = mergeEnvContents(TEMPLATE, {
      [EnvironmentVariable.ApolloKey]: "user:abc",
      [EnvironmentVariable.ApolloGraphRef]: "my-graph@current",
    });

    expect(actual).toBe(expected);
  });

  it("replaces a value that was already set", () => {
    const actual = mergeEnvContents("APOLLO_KEY=user:old\n", {
      [EnvironmentVariable.ApolloKey]: "user:new",
    });

    expect(actual).toBe("APOLLO_KEY=user:new\n");
  });

  it("appends a variable the file doesn't have yet", () => {
    const actual = mergeEnvContents("AWS_REGION=us-west-2\n", {
      [EnvironmentVariable.ApolloKey]: "user:abc",
    });

    expect(actual).toBe("AWS_REGION=us-west-2\nAPOLLO_KEY=user:abc\n");
  });

  it("writes only the variables it sets when there is no file yet", () => {
    const actual = mergeEnvContents("", {
      [EnvironmentVariable.ApolloKey]: "user:abc",
      [EnvironmentVariable.ApolloGraphRef]: "my-graph@current",
    });

    expect(actual).toBe(
      "APOLLO_KEY=user:abc\nAPOLLO_GRAPH_REF=my-graph@current\n"
    );
  });

  it("leaves a commented-out assignment alone", () => {
    const actual = mergeEnvContents("# APOLLO_KEY=user:example\n", {
      [EnvironmentVariable.ApolloKey]: "user:abc",
    });

    expect(actual).toBe("# APOLLO_KEY=user:example\nAPOLLO_KEY=user:abc\n");
  });

  it("recognizes an assignment written with spaces around its name", () => {
    const actual = mergeEnvContents("  APOLLO_KEY =user:old\n", {
      [EnvironmentVariable.ApolloKey]: "user:new",
    });

    expect(actual).toBe("APOLLO_KEY=user:new\n");
  });
});
