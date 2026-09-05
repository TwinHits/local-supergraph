/* v8 ignore file -- bootstrap only; covering it would assert that React mounts */
import { createRoot } from "react-dom/client";
import App from "@/App";

createRoot(document.getElementById("root")!).render(<App />);
