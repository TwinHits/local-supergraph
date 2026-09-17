import ConnectionControl from "@/renderer/features/Databases/components/ConnectionControl";
import ConnectionStatusIndicator from "@/renderer/features/Databases/components/ConnectionStatusIndicator";
import CopyButton from "@/renderer/features/Databases/components/CopyButton";
import LocalPortField from "@/renderer/features/Databases/components/LocalPortField";
import { TableCell, TableRow } from "@/renderer/ui/DataTable";
import { IconName } from "@/renderer/ui/IconGlyph";
import TextLabel from "@/renderer/ui/TextLabel";
import { type DatabaseConnectionState } from "@/shared/databases/databases.types";

type DatabaseRowProps = {
  name: string;
  state: DatabaseConnectionState;
  localPort: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onPortChange: (port: number) => void;
  onCopyPassword: () => Promise<boolean>;
  onCopyPasswordUrlEncoded: () => Promise<boolean>;
};

/** One line of the table for one database. */
export default function DatabaseRow({
  name,
  state,
  localPort,
  onConnect,
  onDisconnect,
  onPortChange,
  onCopyPassword,
  onCopyPasswordUrlEncoded,
}: DatabaseRowProps) {
  return (
    <TableRow>
      <TableCell>
        <ConnectionStatusIndicator state={state} />
      </TableCell>
      <TableCell>
        <TextLabel>{name}</TextLabel>
      </TableCell>
      <TableCell>
        <LocalPortField port={localPort} onPortChange={onPortChange} />
      </TableCell>
      <TableCell>
        <ConnectionControl
          state={state}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />
      </TableCell>
      <TableCell>
        <CopyButton
          icon={IconName.Copy}
          label={`Copy ${name}'s password`}
          tooltip="Copy password"
          onCopy={onCopyPassword}
        />
      </TableCell>
      <TableCell>
        <CopyButton
          icon={IconName.CopyUrlEncoded}
          label={`Copy ${name}'s password, URL-encoded`}
          tooltip="Copy password (URL-encoded)"
          onCopy={onCopyPasswordUrlEncoded}
        />
      </TableCell>
    </TableRow>
  );
}
