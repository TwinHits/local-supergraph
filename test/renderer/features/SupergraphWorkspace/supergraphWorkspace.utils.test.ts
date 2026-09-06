import { expect, test } from "vitest";

import {
  filterRows,
  isValidPort,
  portMessage,
  rowStatus,
  sortRows,
  subgraphRows,
  tableView,
} from "@/renderer/features/SupergraphWorkspace/supergraphWorkspace.utils";
import {
  Composition,
  Reachability,
  type Row,
  RowStatus,
  SortColumn,
} from "@/shared/subgraph/subgraph.types";

test("a local subgraph that answers is healthy", () => {
  const actual = rowStatus({
    local: true,
    reachability: Reachability.Reachable,
    composition: Composition.NotRunning,
  });

  expect(actual).toBe(RowStatus.Healthy);
});

test("a local subgraph that refuses beats a composed graph", () => {
  const actual = rowStatus({
    local: true,
    reachability: Reachability.Unreachable,
    composition: Composition.Composed,
  });

  expect(actual).toBe(RowStatus.Failed);
});

test("composition beats a remote probe", () => {
  const actual = rowStatus({
    local: false,
    reachability: Reachability.Reachable,
    composition: Composition.Failed,
  });

  expect(actual).toBe(RowStatus.Failed);
});

test("a remote probe answers when nothing nearer has", () => {
  const actual = rowStatus({
    local: false,
    reachability: Reachability.Unreachable,
    composition: Composition.NotRunning,
  });

  expect(actual).toBe(RowStatus.Failed);
});

test("nothing reported yet is pending", () => {
  const actual = rowStatus({
    local: false,
    reachability: Reachability.Unknown,
    composition: Composition.NotRunning,
  });

  expect(actual).toBe(RowStatus.Pending);
});

const subgraphs = [
  { name: "characters", routingUrl: "https://characters.svc/graphql" },
  { name: "starships", routingUrl: "https://starships.svc/graphql" },
];

test("a subgraph with no override is remote and portless", () => {
  const actual = subgraphRows({
    subgraphs,
    overrides: {},
    health: {},
    composition: {},
  });

  expect(actual[0]).toEqual({
    name: "characters",
    routingUrl: "https://characters.svc/graphql",
    local: false,
    port: null,
    status: RowStatus.Pending,
    reason: "No answer yet",
  });
});

test("an override makes the row local and carries its port", () => {
  const actual = subgraphRows({
    subgraphs,
    overrides: { starships: { local: true, port: 4002 } },
    health: { starships: Reachability.Reachable },
    composition: {},
  });

  expect(actual[1]).toEqual({
    name: "starships",
    routingUrl: "https://starships.svc/graphql",
    local: true,
    port: 4002,
    status: RowStatus.Healthy,
    reason: "Answering",
  });
});

test("a failed composition shows on a remote row", () => {
  const actual = subgraphRows({
    subgraphs,
    overrides: {},
    health: { characters: Reachability.Reachable },
    composition: { characters: Composition.Failed },
  });

  expect(actual[0].status).toBe(RowStatus.Failed);
});

test("returns one row per subgraph", () => {
  const actual = subgraphRows({
    subgraphs,
    overrides: {},
    health: {},
    composition: {},
  });

  expect(actual.length).toBe(subgraphs.length);
});

function row(name: string, status: RowStatus, local: boolean): Row {
  return {
    name,
    routingUrl: `https://${name}.svc/graphql`,
    local,
    port: null,
    status,
    reason: "",
  };
}

const rows = [
  row("planets", RowStatus.Healthy, false),
  row("characters", RowStatus.Failed, true),
  row("starships", RowStatus.Pending, false),
];

test("an empty search keeps every row", () => {
  const actual = filterRows(rows, "   ");

  expect(actual.length).toBe(3);
});

test("search matches the name", () => {
  const actual = filterRows(rows, "STAR");

  expect(
    actual.map(function name(each) {
      return each.name;
    })
  ).toEqual(["starships"]);
});

test("search matches the url", () => {
  const actual = filterRows(rows, "planets.svc");

  expect(
    actual.map(function name(each) {
      return each.name;
    })
  ).toEqual(["planets"]);
});

test("sorting by status puts the broken ones on top", () => {
  const actual = sortRows(rows, SortColumn.Status);

  expect(
    actual.map(function name(each) {
      return each.name;
    })
  ).toEqual(["characters", "starships", "planets"]);
});

test("sorting by local puts the local ones on top", () => {
  const actual = sortRows(rows, SortColumn.Local);

  expect(actual[0].name).toBe("characters");
});

test("sorting leaves the given rows alone", () => {
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

test("the view filters before it sorts", () => {
  const actual = tableView(rows, "s", SortColumn.Name);

  expect(
    actual.map(function name(each) {
      return each.name;
    })
  ).toEqual(["characters", "planets", "starships"]);
});

const ROUTER_PORT = 4041;

test("accepts a port in range", () => {
  expect(isValidPort(4001)).toBe(true);
});

test("rejects a port past the top of the range", () => {
  expect(isValidPort(65536)).toBe(false);
});

test("rejects a fraction", () => {
  expect(isValidPort(80.5)).toBe(false);
});

test("asks for a port when there is none", () => {
  const actual = portMessage(null, [], ROUTER_PORT);

  expect(actual).toBe("Pick a port");
});

test("names the range when the port is out of it", () => {
  const actual = portMessage(0, [], ROUTER_PORT);

  expect(actual).toBe("Ports run 1 to 65535");
});

test("warns when the router already holds the port", () => {
  const actual = portMessage(ROUTER_PORT, [], ROUTER_PORT);

  expect(actual).toBe("The router is on this port");
});

test("warns when another subgraph holds the port", () => {
  const actual = portMessage(4001, [4001], ROUTER_PORT);

  expect(actual).toBe("Another subgraph is on this port");
});

test("says nothing when the port is usable", () => {
  const actual = portMessage(4002, [4001], ROUTER_PORT);

  expect(actual).toBe("");
});
