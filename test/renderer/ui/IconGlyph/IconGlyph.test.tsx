import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import IconGlyph, { IconName, IconSize } from "@/renderer/ui/IconGlyph";

describe("an icon renders at its given size, not whatever text size surrounds it", () => {
  it("sets an explicit font-size for each size", () => {
    const sizes: Array<[IconSize, string]> = [
      [IconSize.Small, "1rem"],
      [IconSize.Medium, "1.25rem"],
      [IconSize.Large, "1.5rem"],
      [IconSize.ExtraLarge, "1.75rem"],
      [IconSize.Jumbo, "2.5rem"],
    ];

    sizes.forEach(function checkOne([size, expected]) {
      const { container } = render(
        <IconGlyph name={IconName.Search} size={size} />
      );

      const actual = container.querySelector("svg")?.style.fontSize;

      expect(actual).toBe(expected);
    });
  });

  it("gives the row-expand chevron a size large enough to see", () => {
    const { container } = render(
      <IconGlyph name={IconName.ExpandRow} size={IconSize.Medium} />
    );

    expect(container.querySelector("svg")?.style.fontSize).toBe("1.25rem");
  });
});
