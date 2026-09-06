import { expect, test } from "vitest";

import { theme, titleBarOverlay } from "@/main/services/theme/theme.service";
import { ThemeName } from "@/shared/themes/themes.types";

test("light gives the light title bar", () => {
  const actual = titleBarOverlay(ThemeName.Light);

  expect(actual).toEqual({
    color: "#ffffff",
    symbolColor: "#1f1f1f",
    height: 44,
  });
});

test("dark gives the dark title bar", () => {
  const actual = titleBarOverlay(ThemeName.Dark);

  expect(actual.color).toBe("#1f1f1f");
});

test("the height does not change with the theme", () => {
  const light = titleBarOverlay(ThemeName.Light);
  const dark = titleBarOverlay(ThemeName.Dark);

  expect(light.height).toBe(dark.height);
});

test("setting a theme is what read gives back", () => {
  theme.set(ThemeName.Dark);

  expect(theme.read()).toBe(ThemeName.Dark);
});
