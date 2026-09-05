export enum IpcChannel {
  SystemVersions = "system:versions",
}

export type SystemVersions = {
  electron: string;
  chrome: string;
  node: string;
};
