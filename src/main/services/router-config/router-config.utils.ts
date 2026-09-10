/** Renders the router configuration as the YAML rover dev reads for the router. */
export function renderRouterConfigYaml(): string {
  return [
    "sandbox:",
    "  enabled: true",
    "homepage:",
    "  enabled: false",
    "supergraph:",
    "  introspection: true",
    "include_subgraph_errors:",
    "  all: true",
    "plugins:",
    "  experimental.expose_query_plan: true",
    "headers:",
    "  all:",
    "    request:",
    "      - propagate:",
    "          matching: .*",
    "telemetry:",
    "  instrumentation:",
    "    spans:",
    "      mode: spec_compliant",
    "authorization:",
    "  directives:",
    "    enabled: false",
    "",
  ].join("\n");
}
