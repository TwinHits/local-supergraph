/* v8 ignore file -- bootstrap only; covering it would assert that React mounts */
import { createRoot } from "react-dom/client";
import App from "@/renderer/components/App";

createRoot(document.getElementById("root")!).render(<App />);
