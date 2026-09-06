/* v8 ignore file -- bootstrap only; covering it would assert that React mounts */
import { createRoot } from "react-dom/client";

import App from "@/renderer/App";
import DarkTheme from "@/renderer/ui/DarkTheme";

createRoot(document.getElementById("root")!).render(
  <DarkTheme>
    <App />
  </DarkTheme>
);
