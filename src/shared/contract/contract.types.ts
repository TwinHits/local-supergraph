import { type ErrorsContract } from "@/shared/errors/errors.contract";
import { type SettingsContract } from "@/shared/settings/settings.contract";
import { type SubgraphContract } from "@/shared/subgraph/subgraph.contract";
import { type ThemeContract } from "@/shared/themes/themes.contract";

/** Every domain's surface, composed. One line per domain, no signatures here. */
export type Contract = {
  errors: ErrorsContract;
  settings: SettingsContract;
  subgraph: SubgraphContract;
  theme: ThemeContract;
};

/** The same surface as the renderer sees it: every call crosses IPC, so every call is async. */
export type Promised<T> = {
  [Namespace in keyof T]: {
    [Method in keyof T[Namespace]]: T[Namespace][Method] extends (
      ...args: infer Args
    ) => infer Result
      ? (...args: Args) => Promise<Awaited<Result>>
      : never;
  };
};

/**
 * One contract method with its parameters erased. `never` accepts every
 * signature, since parameters are checked the other way round from returns.
 */
type AnyMethod = (...args: never[]) => unknown;

/** The contract with its keys erased, so main can walk it in a loop. */
export type Handlers = Record<string, Record<string, AnyMethod>>;

/** The same, for the async side preload builds and the renderer receives. */
export type Calls = Record<
  string,
  Record<string, (...args: unknown[]) => Promise<unknown>>
>;
