import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import SettingsModal from "@/renderer/features/SettingsModal";

const settings = { routerPort: 4041 };

function show(onChange = vi.fn()) {
  render(
    <SettingsModal
      open
      settings={settings}
      onChange={onChange}
      onClose={vi.fn()}
    />
  );
  return onChange;
}

test("shows the router port", () => {
  show();

  const actual = screen.getByLabelText("Router port") as HTMLInputElement;

  expect(actual.value).toBe("4041");
});

test("reports a changed router port", async () => {
  const onChange = show();

  await userEvent.type(screen.getByLabelText("Router port"), "2");

  expect(onChange).toHaveBeenCalledWith({ routerPort: 40412 });
});

test("keeps letters out of a port", async () => {
  const onChange = show();

  await userEvent.type(screen.getByLabelText("Router port"), "x");

  expect(onChange).toHaveBeenCalledWith({ routerPort: 4041 });
});
