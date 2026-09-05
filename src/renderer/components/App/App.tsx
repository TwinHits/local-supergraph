import { useEffect, useState } from "react";
import { systemVersions } from "@/renderer/api";
import { type SystemVersions } from "@/models";

export default function App() {
  const [versions, setVersions] = useState<SystemVersions | null>(null);

  useEffect(function readVersions() {
    void systemVersions().then(setVersions);
  }, []);

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
    </main>
  );
}
