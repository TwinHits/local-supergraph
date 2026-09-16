import { describe, expect, it } from "vitest";

import {
  buildPortDiagnosis,
  buildRowStatus,
  buildSubgraphRows,
  buildTableView,
  filterRows,
  isValidPort,
  sortRows,
} from "@/renderer/features/SupergraphWorkspace/supergraphWorkspace.utils";
import { type Diagnosis, ErrorKey } from "@/shared/errors/errors.types";
import {
  Composition,
  Reachability,
  type Row,
  RowStatus,
  SortColumn,
} from "@/shared/subgraph/subgraph.types";

describe("row status picks the signal closest to the developer's own machine", () => {
  it("a local subgraph that answers is healthy", () => {
    const actual = buildRowStatus({
      local: true,
      reachability: Reachability.Reachable,
      composition: Composition.NotRunning,
    });

    expect(actual).toBe(RowStatus.Healthy);
  });

  it("a local subgraph that refuses beats a composed graph", () => {
    const actual = buildRowStatus({
      local: true,
      reachability: Reachability.Unreachable,
      composition: Composition.Composed,
    });

    expect(actual).toBe(RowStatus.Failed);
  });

  it("composition beats a remote probe", () => {
    const actual = buildRowStatus({
      local: false,
      reachability: Reachability.Reachable,
      composition: Composition.Failed,
    });

    expect(actual).toBe(RowStatus.Failed);
  });

  it("a remote probe answers when nothing nearer has", () => {
    const actual = buildRowStatus({
      local: false,
      reachability: Reachability.Unreachable,
      composition: Composition.NotRunning,
    });

    expect(actual).toBe(RowStatus.Failed);
  });

  it("nothing reported yet is pending", () => {
    const actual = buildRowStatus({
      local: false,
      reachability: Reachability.Unknown,
      composition: Composition.NotRunning,
    });

    expect(actual).toBe(RowStatus.Pending);
  });
});

const subgraphs = [
  { name: "characters", routingUrl: "https://characters.svc/graphql" },
  { name: "starships", routingUrl: "https://starships.svc/graphql" },
];

const KEY_REJECTED: Diagnosis = {
  key: ErrorKey.ApolloKeyInvalid,
  summary: "Apollo rejected the key",
  cause: "APOLLO_KEY is invalid or has expired.",
  resolution: ["Regenerate the key"],
  raw: "401 Unauthorized",
};

describe("a table row merges the subgraph, its override, its health, and its errors into one line", () => {
  it("a subgraph with no override is remote and portless", () => {
    const actual = buildSubgraphRows({
      subgraphs,
      overrides: {},
      health: {},
      composition: {},
      errors: {},
      disabled: [],
    });

    expect(actual[0]).toEqual({
      name: "characters",
      routingUrl: "https://characters.svc/graphql",
      local: false,
      port: null,
      enabled: true,
      status: RowStatus.Pending,
      reason: "No answer yet",
    });
  });

  it("an override makes the row local and carries its port", () => {
    const actual = buildSubgraphRows({
      subgraphs,
      overrides: { starships: { local: true, port: 4002 } },
      health: { starships: Reachability.Reachable },
      composition: {},
      errors: {},
      disabled: [],
    });

    expect(actual[1]).toEqual({
      name: "starships",
      routingUrl: "https://starships.svc/graphql",
      local: true,
      port: 4002,
      enabled: true,
      status: RowStatus.Healthy,
      reason: "Answering",
    });
  });

  it("a failed composition shows on a remote row", () => {
    const actual = buildSubgraphRows({
      subgraphs,
      overrides: {},
      health: { characters: Reachability.Reachable },
      composition: { characters: Composition.Failed },
      errors: {},
      disabled: [],
    });

    expect(actual[0].status).toBe(RowStatus.Failed);
  });

  it("returns one row per subgraph", () => {
    const actual = buildSubgraphRows({
      subgraphs,
      overrides: {},
      health: {},
      composition: {},
      errors: {},
      disabled: [],
    });

    expect(actual.length).toBe(subgraphs.length);
  });

  it("a failing row says what its top error was", () => {
    const actual = buildSubgraphRows({
      subgraphs,
      overrides: {},
      health: { characters: Reachability.Unreachable },
      composition: {},
      errors: {
        characters: [
          {
            ...KEY_REJECTED,
            key: ErrorKey.RemoteUnreachable,
            summary: "The deployed URL did not answer",
          },
        ],
      },
      disabled: [],
    });

    expect(actual[0].reason).toBe("The deployed URL did not answer");
  });

  it("a row nothing was reported about falls back to how its probe went", () => {
    const actual = buildSubgraphRows({
      subgraphs,
      overrides: {},
      health: { characters: Reachability.Reachable },
      composition: {},
      errors: {},
      disabled: [],
    });

    expect(actual[0].reason).toBe("Answering");
  });
});

function row(name: string, status: RowStatus, local: boolean): Row {
  return {
    name,
    routingUrl: `https://${name}.svc/graphql`,
    local,
    port: null,
    enabled: true,
    status,
    reason: "",
  };
}

const rows = [
  row("planets", RowStatus.Healthy, false),
  row("characters", RowStatus.Failed, true),
  row("starships", RowStatus.Pending, false),
];

describe("the table can be searched and sorted", () => {
  it("an empty search keeps every row", () => {
    const actual = filterRows(rows, "   ");

    expect(actual.length).toBe(3);
  });

  it("search matches the name", () => {
    const actual = filterRows(rows, "STAR");

    expect(
      actual.map(function name(each) {
        return each.name;
      })
    ).toEqual(["starships"]);
  });

  it("search matches the url", () => {
    const actual = filterRows(rows, "planets.svc");

    expect(
      actual.map(function name(each) {
        return each.name;
      })
    ).toEqual(["planets"]);
  });

  it("sorting by status puts the broken ones on top", () => {
    const actual = sortRows(rows, SortColumn.Status);

    expect(
      actual.map(function name(each) {
        return each.name;
      })
    ).toEqual(["characters", "starships", "planets"]);
  });

  it("sorting by local puts the local ones on top", () => {
    const actual = sortRows(rows, SortColumn.Local);

    expect(actual[0].name).toBe("characters");
  });

  it("sorting leaves the given rows alone", () => {
    const before = rows.map(function name(each) {
      return each.name;
    });

    sortRows(rows, SortColumn.Status);

    expect(
      rows.map(function name(each) {
        return each.name;
      })
    ).toEqual(before);
  });

  it("the view filters before it sorts", () => {
    const actual = buildTableView(rows, "s", SortColumn.Name);

    expect(
      actual.map(function name(each) {
        return each.name;
      })
    ).toEqual(["characters", "planets", "starships"]);
  });
});

const ROUTER_PORT = 4041;

describe("a local subgraph's port is checked for real conflicts before it's trusted", () => {
  it("accepts a port in range", () => {
    expect(isValidPort(4001)).toBe(true);
  });

  it("rejects a port past the top of the range", () => {
    expect(isValidPort(65536)).toBe(false);
  });

  it("rejects a fraction", () => {
    expect(isValidPort(80.5)).toBe(false);
  });

  it("asks for a port when there is none", () => {
    const actual = buildPortDiagnosis(null, [], ROUTER_PORT);

    expect(actual?.summary).toBe("No port is set for this subgraph");
  });

  it("names the range when the port is out of it", () => {
    const actual = buildPortDiagnosis(0, [], ROUTER_PORT);

    expect(actual?.summary).toBe("That port is not valid");
  });

  it("warns when the router already holds the port", () => {
    const actual = buildPortDiagnosis(ROUTER_PORT, [], ROUTER_PORT);

    expect(actual?.summary).toBe("That port is already used by the router");
  });

  it("warns when another subgraph holds the port", () => {
    const actual = buildPortDiagnosis(4001, [4001], ROUTER_PORT);

    expect(actual?.summary).toBe(
      "That port is already used by another local subgraph"
    );
  });

  it("says nothing when the port is usable", () => {
    const actual = buildPortDiagnosis(4002, [4001], ROUTER_PORT);

    expect(actual).toBeNull();
  });
});
