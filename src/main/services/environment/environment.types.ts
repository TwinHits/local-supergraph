import { type EnvironmentVariable } from "@/main/services/environment/environment.constants";

/** Values to set for some of the variables the app reads. */
export type EnvironmentValues = Partial<Record<EnvironmentVariable, string>>;
