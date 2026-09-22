import IconButton, { IconButtonVariant } from "@/renderer/ui/IconButton";
import IconGlyph, { IconName, IconSize } from "@/renderer/ui/IconGlyph";
import styles from "@/renderer/ui/PagerArrows/PagerArrows.module.scss";
import {
  canGoBack,
  getNextIndex,
  getPreviousIndex,
  hasArrows,
} from "@/renderer/utils/pager.utils";

type PagerArrowsProps = {
  index: number;
  count: number;
  subject: string;
  onChange: (index: number) => void;
};

/** Steps back and forward through a list. */
export default function PagerArrows({
  index,
  count,
  subject,
  onChange,
}: PagerArrowsProps) {
  if (!hasArrows(count)) {
    return null;
  }

  return (
    <div className={styles.pagerArrows}>
      <IconButton
        label={`Previous ${subject}`}
        tooltip={`Previous ${subject}`}
        variant={IconButtonVariant.Inline}
        stretch={false}
        disabled={!canGoBack(index)}
        onClick={function back() {
          onChange(getPreviousIndex(index));
        }}
      >
        <IconGlyph name={IconName.Back} size={IconSize.Jumbo} />
      </IconButton>
      <IconButton
        label={`Next ${subject}`}
        tooltip={`Next ${subject}`}
        variant={IconButtonVariant.Inline}
        stretch={false}
        onClick={function forward() {
          onChange(getNextIndex(index, count));
        }}
      >
        <IconGlyph name={IconName.Forward} size={IconSize.Jumbo} />
      </IconButton>
    </div>
  );
}
