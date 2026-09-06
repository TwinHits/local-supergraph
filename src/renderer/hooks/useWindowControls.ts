import { useCallback, useEffect, useState } from "react";

import { api } from "@/renderer/api";

/** The window buttons' state, and what each one does. */
export function useWindowControls() {
  const [maximized, setMaximized] = useState(false);

  const read = useCallback(function ask() {
    void api.windowControls.isMaximized().then(setMaximized);
  }, []);

  useEffect(
    function watchResize() {
      read();
      window.addEventListener("resize", read);
      return function stop() {
        window.removeEventListener("resize", read);
      };
    },
    [read]
  );

  const minimize = useCallback(function hide() {
    void api.windowControls.minimize();
  }, []);

  const toggleMaximize = useCallback(function toggle() {
    void api.windowControls.toggleMaximize().then(setMaximized);
  }, []);

  const close = useCallback(function shut() {
    void api.windowControls.close();
  }, []);

  return { maximized, minimize, toggleMaximize, close };
}
