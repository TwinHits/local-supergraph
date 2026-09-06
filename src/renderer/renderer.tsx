/* v8 ignore file -- bootstrap only; covering it would assert that React mounts */
import { createRoot } from "react-dom/client";

import App from "@/renderer/App";
import { applyTheme } from "@/renderer/theme";
import { DEFAULT_THEME } from "@/shared/themes/themes.constants";

applyTheme(DEFAULT_THEME);

createRoot(document.getElementById("root")!).render(<App />);
