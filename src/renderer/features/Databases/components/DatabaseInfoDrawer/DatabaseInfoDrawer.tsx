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

/** A loaded connection info's database, port, and local port fields, grouped in one row. */
function connectionFieldsFor(
  info: DatabaseConnectionInfo
): DatabaseInfoField[] {
  return [
    { label: "Database", value: info.databaseName },
    { label: "Port", value: String(info.port) },
    { label: "Local port", value: String(info.localPort) },
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
        {info !== undefined && info !== null && (
          <div className={styles.databaseInfoDrawer__field}>
            <TextLabel muted className={styles.databaseInfoDrawer__label}>
              Host
            </TextLabel>
            <span className={styles.databaseInfoDrawer__value}>
              {info.host}
            </span>
          </div>
        )}
        {info !== undefined && info !== null && (
          <div className={styles.databaseInfoDrawer__table}>
            <div className={styles.databaseInfoDrawer__group}>
              {connectionFieldsFor(info).map(function toField(field) {
                return (
                  <div
                    key={field.label}
                    className={styles.databaseInfoDrawer__groupField}
                  >
                    <TextLabel
                      muted
                      className={styles.databaseInfoDrawer__label}
                    >
                      {field.label}
                    </TextLabel>
                    <span className={styles.databaseInfoDrawer__value}>
                      {field.value}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className={styles.databaseInfoDrawer__group}>
              <div className={styles.databaseInfoDrawer__groupField}>
                <TextLabel muted className={styles.databaseInfoDrawer__label}>
                  Username
                </TextLabel>
                <span className={styles.databaseInfoDrawer__value}>
                  {info.username}
                </span>
              </div>
              <div className={styles.databaseInfoDrawer__groupField}>
                <TextLabel muted className={styles.databaseInfoDrawer__label}>
                  Password
                </TextLabel>
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
                    tooltipDelayMs={0}
                    onCopy={onCopyPasswordUrlEncoded}
                  />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </TableDrawerRow>
  );
}
