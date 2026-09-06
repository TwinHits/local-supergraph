import { type Contract } from "@/shared/contract/contract.types";

type ChannelsOf<Namespace extends keyof Contract> =
  `${Namespace & string}.${keyof Contract[Namespace] & string}`;

type Channel = {
  [Namespace in keyof Contract]: ChannelsOf<Namespace>;
}[keyof Contract];

/** The runtime half of the contract: contextBridge copies real keys, so it cannot read a type. */
export const CHANNELS = [
  "errors.diagnose",
  "settings.read",
  "settings.update",
  "subgraph.list",
  "subgraph.overrides",
  "subgraph.setOverride",
  "subgraph.health",
  "theme.read",
  "theme.set",
] as const satisfies readonly Channel[];

type Unlisted = Exclude<Channel, (typeof CHANNELS)[number]>;

// Fails to compile when a Contract method is missing from CHANNELS.
export const ALL_CHANNELS_LISTED: Unlisted extends never ? true : never = true;

export const BRIDGE_KEY = "bridge";

/** Names the IPC channel one contract method travels on. */
export function channelName(namespace: string, method: string): string {
  return `${namespace}.${method}`;
}
