import { type ApolloContract } from "@/shared/apollo/apollo.contract";
import { type EnvironmentContract } from "@/shared/environment/environment.contract";
import { type ErrorsContract } from "@/shared/errors/errors.contract";
import { type SettingsContract } from "@/shared/settings/settings.contract";
import { type SubgraphContract } from "@/shared/subgraph/subgraph.contract";
import { type SupergraphContract } from "@/shared/supergraph/supergraph.contract";
import { type WindowContract } from "@/shared/window/window.contract";

/** Every domain the renderer can call. */
export type Contract = {
  apollo: ApolloContract;
  environment: EnvironmentContract;
  errors: ErrorsContract;
  settings: SettingsContract;
  subgraph: SubgraphContract;
  supergraph: SupergraphContract;
  windowControls: WindowContract;
};

/** One domain's methods, each free to answer with a promise. */
export type Awaitable<Namespace> = {
  [Method in keyof Namespace]: Namespace[Method] extends (
    ...args: infer Args
  ) => infer Result
    ? (...args: Args) => Result | Promise<Result>
    : never;
};

/** Every domain as main implements it. */
export type Implementation = {
  [Namespace in keyof Contract]: Awaitable<Contract[Namespace]>;
};

/** Every domain as the renderer sees it, with every call async. */
export type Promised<T> = {
  [Namespace in keyof T]: {
    [Method in keyof T[Namespace]]: T[Namespace][Method] extends (
      ...args: infer Args
    ) => infer Result
      ? (...args: Args) => Promise<Awaited<Result>>
      : never;
  };
};

/** One contract method with its parameters erased. */
type AnyMethod = (...args: never[]) => unknown;

/** The contract with its keys erased, so main can loop over it. */
export type Handlers = Record<string, Record<string, AnyMethod>>;

/** The same for the async copy preload puts on the window. */
export type Calls = Record<
  string,
  Record<string, (...args: unknown[]) => Promise<unknown>>
>;
