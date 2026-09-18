import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DataTable, { type Column } from "@/renderer/ui/DataTable";

const COLUMNS: Column[] = [
  { key: "narrow", label: "Narrow", sortable: false, width: "56px" },
  { key: "flexible", label: "Flexible", sortable: false },
];

describe("a column's declared width is pinned in a colgroup", () => {
  it("gives the narrow column's col element that fixed width", () => {
    const { container } = render(
      <DataTable columns={COLUMNS} sortKey="" onSort={function noop() {}}>
        <tr>
          <td>a</td>
          <td>b</td>
        </tr>
      </DataTable>
    );

    const cols = container.querySelectorAll("col");
    expect(cols[0].style.width).toBe("56px");
  });

  it("leaves the flexible column's col element without a width, so it can grow", () => {
    const { container } = render(
      <DataTable columns={COLUMNS} sortKey="" onSort={function noop() {}}>
        <tr>
          <td>a</td>
          <td>b</td>
        </tr>
      </DataTable>
    );

    const cols = container.querySelectorAll("col");
    expect(cols[1].style.width).toBe("");
  });

  it("keeps one col element per column, in order", () => {
    const { container } = render(
      <DataTable columns={COLUMNS} sortKey="" onSort={function noop() {}}>
        <tr>
          <td>a</td>
          <td>b</td>
        </tr>
      </DataTable>
    );

    expect(container.querySelectorAll("col").length).toBe(COLUMNS.length);
  });
});
