import { useState } from "react";

import { TAB_ITEMS } from "@/renderer/App.constants";
import styles from "@/renderer/App.module.scss";
import { AppTab } from "@/renderer/App.types";
import Databases from "@/renderer/features/Databases";
import Header from "@/renderer/features/Header";
import OnboardingWizard, {
  OnboardingState,
  useOnboardingWizard,
} from "@/renderer/features/OnboardingWizard";
import Supergraph from "@/renderer/features/Supergraph";
import LoadingSpinner from "@/renderer/ui/LoadingSpinner";
import TabRail from "@/renderer/ui/TabRail";

/**
 * Classes for a tab's wrapper: visible when active, hidden (not unmounted)
 * otherwise — so switching tabs doesn't reset a feature's own state (the
 * Supergraph table's loading state, in particular) back to its first render.
 */
function tabClasses(active: boolean): string {
  return [styles.app__body__tab, active ? "" : styles["app__body__tab--hidden"]]
    .join(" ")
    .trim();
}

/** The app's shell: header, tab rail, whichever feature tab is active, and the setup wizard over them. */
export default function App() {
  const [activeTab, setActiveTab] = useState(AppTab.Supergraph);
  const onboarding = useOnboardingWizard();

  return (
    <div className={styles.app}>
      <Header />
      {onboarding.state === OnboardingState.Checking ? (
        <div className={styles.app__loading}>
          <LoadingSpinner label="Checking your setup" />
        </div>
      ) : (
        <div key={onboarding.tabsGeneration} className={styles.app__body}>
          <TabRail
            items={TAB_ITEMS}
            activeId={activeTab}
            onChange={function changeTab(id) {
              setActiveTab(id as AppTab);
            }}
          />
          <div className={styles.app__body__main}>
            <div className={tabClasses(activeTab === AppTab.Supergraph)}>
              <Supergraph />
            </div>
            <div className={tabClasses(activeTab === AppTab.Databases)}>
              <Databases />
            </div>
          </div>
        </div>
      )}
      <OnboardingWizard wizard={onboarding} />
    </div>
  );
}
