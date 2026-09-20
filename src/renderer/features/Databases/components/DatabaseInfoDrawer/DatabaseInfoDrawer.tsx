import CopyButton from "@/renderer/features/Databases/components/CopyButton";
import styles from "@/renderer/features/Databases/components/DatabaseInfoDrawer/DatabaseInfoDrawer.module.scss";
import { TableDrawerRow } from "@/renderer/ui/DataTable";
import { IconName } from "@/renderer/ui/IconGlyph";
import TextLabel from "@/renderer/ui/TextLabel";
import { type DatabaseConnectionInfo } from "@/shared/databases/databases.types";

type DatabaseInfoField = {
  label: string;
  value: string;
};

type DatabaseInfoDrawerProps = {
  name: string;
  expanded: boolean;
  info: DatabaseConnectionInfo | null | undefined;
  columnCount: number;
  onCopyPassword: () => Promise<boolean>;
  onCopyPasswordUrlEncoded: () => Promise<boolean>;
};

/** A loaded connection info's fields, in display order. */
function fieldsFor(info: DatabaseConnectionInfo): DatabaseInfoField[] {
  return [
    { label: "Host", value: info.host },
    { label: "Port", value: String(info.port) },
    { label: "Local port", value: String(info.localPort) },
    { label: "Database", value: info.databaseName },
    { label: "Username", value: info.username },
  ];
}

/** A row's expandable panel showing its connection info for copying into a SQL IDE. */
export default function DatabaseInfoDrawer({
  name,
  expanded,
  info,
  columnCount,
  onCopyPassword,
  onCopyPasswordUrlEncoded,
}: DatabaseInfoDrawerProps) {
  return (
    <TableDrawerRow expanded={expanded} columnCount={columnCount}>
      <div className={styles.databaseInfoDrawer}>
        {info === undefined && (
          <TextLabel muted>Loading connection info…</TextLabel>
        )}
        {info === null && (
          <TextLabel muted>No connection info for this environment.</TextLabel>
        )}
        {info !== undefined &&
          info !== null &&
          fieldsFor(info).map(function toField(field) {
            return (
              <div
                key={field.label}
                className={styles.databaseInfoDrawer__field}
              >
                <TextLabel muted>{field.label}</TextLabel>
                <span className={styles.databaseInfoDrawer__value}>
                  {field.value}
                </span>
              </div>
            );
          })}
        {info !== undefined && info !== null && (
          <div className={styles.databaseInfoDrawer__field}>
            <TextLabel muted>Password</TextLabel>
            <span className={styles.databaseInfoDrawer__actions}>
              <CopyButton
                icon={IconName.Copy}
                label={`Copy ${name}'s password`}
                tooltip="Copy password"
                onCopy={onCopyPassword}
              />
              <CopyButton
                icon={IconName.CopyUrlEncoded}
                label={`Copy ${name}'s password, URL-encoded`}
                tooltip="Copy password, URL-encoded"
                onCopy={onCopyPasswordUrlEncoded}
              />
            </span>
          </div>
        )}
      </div>
    </TableDrawerRow>
  );
}
