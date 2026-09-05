import { useCallback, useEffect, useState } from "react";
import { api } from "@/renderer/api";
import { type SystemVersions } from "@/shared/system/system.types";
import Button from "@/renderer/components/Button";

export default function App() {
  const [versions, setVersions] = useState<SystemVersions | null>(null);

  const readVersions = useCallback(function read() {
    void api.system.versions().then(setVersions);
  }, []);

  useEffect(readVersions, [readVersions]);

  return (
    <main>
      <h1>Hello, World</h1>
      {versions === null ? (
        <p>Asking main for versions...</p>
      ) : (
        <dl>
          <dt>Electron</dt>
          <dd>{versions.electron}</dd>
          <dt>Chrome</dt>
          <dd>{versions.chrome}</dd>
          <dt>Node</dt>
          <dd>{versions.node}</dd>
        </dl>
      )}
      <Button onClick={readVersions}>Refresh</Button>
    </main>
  );
}
