/* v8 ignore file -- this only mounts React */
import { createRoot } from "react-dom/client";

import App from "@/renderer/App";
import DarkTheme from "@/renderer/ui/DarkTheme";

createRoot(document.getElementById("root")!).render(
  <DarkTheme>
    <App />
  </DarkTheme>
);
