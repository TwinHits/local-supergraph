import { type Contract } from "@/shared/contract/contract.types";

type ChannelsOf<Namespace extends keyof Contract> =
  `${Namespace & string}.${keyof Contract[Namespace] & string}`;

type Channel = {
  [Namespace in keyof Contract]: ChannelsOf<Namespace>;
}[keyof Contract];

/** The channel names, listed because contextBridge cannot read a type. */
export const CHANNELS = [
  "apollo.listSubgraphs",
  "apollo.reloadSubgraphs",
  "environment.graphName",
  "environment.variants",
  "errors.subgraphErrors",
  "errors.supergraphErrors",
  "settings.read",
  "settings.update",
  "settings.routerAddress",
  "settings.currentVariant",
  "settings.updateVariant",
  "settings.localAddress",
  "subgraph.overrides",
  "subgraph.updateOverride",
  "subgraph.checkHealth",
  "subgraph.disabledSubgraphs",
  "subgraph.setSubgraphEnabled",
  "supergraph.start",
  "supergraph.status",
  "supergraph.stop",
  "windowControls.minimize",
  "windowControls.toggleMaximize",
  "windowControls.close",
  "windowControls.isMaximized",
  "windowControls.openExternal",
] as const satisfies readonly Channel[];

type Unlisted = Exclude<Channel, (typeof CHANNELS)[number]>;

// Fails to compile when a Contract method is missing from CHANNELS.
export const ALL_CHANNELS_LISTED: Unlisted extends never ? true : never = true;

export const BRIDGE_KEY = "bridge";

/** The channel name for one contract method. */
export function buildChannelName(namespace: string, method: string): string {
  return `${namespace}.${method}`;
}
