import { type MouseEvent } from "react";

import ConnectionControl from "@/renderer/features/Databases/components/ConnectionControl";
import ConnectionStatusIndicator from "@/renderer/features/Databases/components/ConnectionStatusIndicator";
import DatabaseInfoDrawer from "@/renderer/features/Databases/components/DatabaseInfoDrawer";
import styles from "@/renderer/features/Databases/components/DatabaseRow/DatabaseRow.module.scss";
import LocalPortField from "@/renderer/features/Databases/components/LocalPortField";
import { TableCell, TableRow } from "@/renderer/ui/DataTable";
import IconGlyph, { IconName, IconSize } from "@/renderer/ui/IconGlyph";
import TextLabel from "@/renderer/ui/TextLabel";
import {
  type DatabaseConnectionInfo,
  type DatabaseConnectionState,
} from "@/shared/databases/databases.types";

const DRAWER_COLUMN_COUNT = 5;

type DatabaseRowProps = {
  name: string;
  state: DatabaseConnectionState;
  /** This row's own current error, if it has one. */
  reason: string | null;
  localPort: number;
  expanded: boolean;
  connectionInfo: DatabaseConnectionInfo | null | undefined;
  onToggleExpanded: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onPortChange: (port: number) => void;
  onCopyPassword: () => Promise<boolean>;
  onCopyPasswordUrlEncoded: () => Promise<boolean>;
};

/** Keeps a click on an interactive cell from also toggling the row's drawer. */
function stopPropagation(event: MouseEvent): void {
  event.stopPropagation();
}

/** One line of the table for one database, expandable into its connection info. */
export default function DatabaseRow({
  name,
  state,
  reason,
  localPort,
  expanded,
  connectionInfo,
  onToggleExpanded,
  onConnect,
  onDisconnect,
  onPortChange,
  onCopyPassword,
  onCopyPasswordUrlEncoded,
}: DatabaseRowProps) {
  return (
    <>
      <TableRow onClick={onToggleExpanded}>
        <TableCell>
          <span className={styles.databaseRow__chevron}>
            <IconGlyph
              name={expanded ? IconName.CollapseRow : IconName.ExpandRow}
              size={IconSize.Medium}
            />
          </span>
        </TableCell>
        <TableCell>
          <ConnectionStatusIndicator state={state} reason={reason} />
        </TableCell>
        <TableCell>
          <TextLabel>{name}</TextLabel>
        </TableCell>
        <TableCell>
          <span onClick={stopPropagation}>
            <LocalPortField port={localPort} onPortChange={onPortChange} />
          </span>
        </TableCell>
        <TableCell>
          <span onClick={stopPropagation}>
            <ConnectionControl
              state={state}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
            />
          </span>
        </TableCell>
      </TableRow>
      <DatabaseInfoDrawer
        name={name}
        expanded={expanded}
        info={connectionInfo}
        columnCount={DRAWER_COLUMN_COUNT}
        onCopyPassword={onCopyPassword}
        onCopyPasswordUrlEncoded={onCopyPasswordUrlEncoded}
      />
    </>
  );
}
