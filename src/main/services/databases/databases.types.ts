/** One (database, environment) pick's connection parameters, field-for-field with `databases.json`. */
export type DatabaseConfigEntry = {
  target_instance: string;
  host: string;
  port: number;
  local_port: number;
  aws_profile: string;
  database_name: string;
  username: string;
  password_url: string;
};

/** The shape of `databases.json`: database name -> environment name -> its config. */
export type DatabasesConfigFile = {
  databases: Record<string, Record<string, DatabaseConfigEntry>>;
};
