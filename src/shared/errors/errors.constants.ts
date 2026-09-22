import { ErrorKey, ErrorScope } from "@/shared/errors/errors.types";

/**
 * Whether each error is about the developer's local AWS setup — worth a
 * table-wide callout, since one fix commonly clears more than one row — or
 * about one specific row's own config or connection attempt.
 */
export const ERROR_SCOPES: Record<ErrorKey, ErrorScope> = {
  [ErrorKey.RoverMissing]: ErrorScope.Shared,
  [ErrorKey.GraphRefUnset]: ErrorScope.Shared,
  [ErrorKey.ApolloKeyInvalid]: ErrorScope.Shared,
  [ErrorKey.GraphNotFound]: ErrorScope.Shared,
  [ErrorKey.AwsCliMissing]: ErrorScope.Shared,
  [ErrorKey.SessionManagerPluginMissing]: ErrorScope.Shared,
  [ErrorKey.AwsProfileMissing]: ErrorScope.Shared,
  [ErrorKey.DatabaseEntryMissing]: ErrorScope.RowSpecific,
  [ErrorKey.AwsSsoExpired]: ErrorScope.Shared,
  [ErrorKey.AwsProfileNotLoggedIn]: ErrorScope.Shared,
  [ErrorKey.AwsSessionUnreachable]: ErrorScope.Shared,
  [ErrorKey.PortInUse]: ErrorScope.RowSpecific,
  [ErrorKey.PortInvalid]: ErrorScope.RowSpecific,
  [ErrorKey.CompositionFailed]: ErrorScope.Shared,
  [ErrorKey.ComposedButUnreachable]: ErrorScope.Shared,
  [ErrorKey.SubgraphUnauthorized]: ErrorScope.RowSpecific,
  [ErrorKey.LocalRefused]: ErrorScope.RowSpecific,
  [ErrorKey.RemoteUnreachable]: ErrorScope.RowSpecific,
  [ErrorKey.Unknown]: ErrorScope.RowSpecific,
};
