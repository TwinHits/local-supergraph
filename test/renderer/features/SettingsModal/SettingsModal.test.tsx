import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import SettingsModal from "@/renderer/features/SettingsModal";
import { ThemeName } from "@/shared/themes/themes.types";

const settings = { routerPort: 4041, healthCheckIntervalMs: 5000 };

const onThemeChange = vi.fn();

function show(onChange = vi.fn()) {
  render(
    <SettingsModal
      open
      settings={settings}
      theme={ThemeName.Light}
      onChange={onChange}
      onThemeChange={onThemeChange}
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

test("shows the poll interval", () => {
  show();

  const actual = screen.getByLabelText(
    "Health check interval (ms)"
  ) as HTMLInputElement;

  expect(actual.value).toBe("5000");
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

test("reports a theme change", async () => {
  show();

  await userEvent.click(screen.getByLabelText("Theme"));
  await userEvent.click(screen.getByRole("option", { name: ThemeName.Dark }));

  expect(onThemeChange).toHaveBeenCalledWith(ThemeName.Dark);
});
