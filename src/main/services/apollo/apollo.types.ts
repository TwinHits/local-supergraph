/** One subgraph in rover's `subgraph list --format json` answer. */
export type RoverSubgraph = {
  name: string;
  url: string;
};

/** The envelope rover wraps every JSON answer in. */
export type RoverResponse = {
  data?: {
    subgraphs?: RoverSubgraph[];
    success?: boolean;
  };
  error?: {
    message?: string;
    code?: string;
  } | null;
};
