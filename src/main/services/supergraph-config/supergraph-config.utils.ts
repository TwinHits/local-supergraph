export type ConfigEntry = {
  name: string;
  url: string;
};

/** Renders config entries as the YAML `rover dev` reads for its subgraph overrides. */
export function renderConfigYaml(
  entries: ConfigEntry[],
  federationVersion: string
): string {
  const header = `federation_version: ${JSON.stringify(federationVersion)}\n`;

  if (entries.length === 0) {
    return `${header}subgraphs: {}\n`;
  }

  const body = entries
    .map(function entryLines(entry) {
      const url = JSON.stringify(entry.url);
      return `  ${entry.name}:\n    routing_url: ${url}\n    schema:\n      subgraph_url: ${url}`;
    })
    .join("\n");

  return `${header}subgraphs:\n${body}\n`;
}
