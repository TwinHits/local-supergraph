import { type SystemContract } from "@/shared/system/system.contract";

/** Every domain's surface, composed. One line per domain, no signatures here. */
export type Contract = {
  system: SystemContract;
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
 * One contract method, with its own signature erased. A method with fewer
 * parameters is assignable to one taking more, so every Contract method fits.
 */
type AnyMethod = (...args: unknown[]) => unknown;

/** The contract with its keys erased, so main can walk it in a loop. */
export type Handlers = Record<string, Record<string, AnyMethod>>;

/** The same, for the async side preload builds and the renderer receives. */
export type Calls = Record<
  string,
  Record<string, (...args: unknown[]) => Promise<unknown>>
>;
