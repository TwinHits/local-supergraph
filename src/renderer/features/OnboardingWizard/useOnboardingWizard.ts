import { useCallback, useEffect, useState } from "react";

import { api } from "@/renderer/api";
import {
  OnboardingState,
  type WizardStep,
} from "@/renderer/features/OnboardingWizard/onboardingWizard.types";
import {
  buildSteps,
  changesWhatTabsRead,
  isOnboardingRequired,
} from "@/renderer/features/OnboardingWizard/onboardingWizard.utils";
import { type Prerequisite } from "@/shared/onboarding/onboarding.types";

const FOCUS_EVENT = "focus";

/** Decides at start whether the wizard shows, then walks its steps. */
export function useOnboardingWizard() {
  const [state, setState] = useState(OnboardingState.Checking);
  const [steps, setSteps] = useState<WizardStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [missing, setMissing] = useState<Prerequisite[]>([]);
  const [checking, setChecking] = useState(false);
  const [tabsStale, setTabsStale] = useState(false);
  const [tabsGeneration, setTabsGeneration] = useState(0);

  useEffect(function checkOnStart() {
    void api.onboarding.status().then(function decide(status) {
      if (!isOnboardingRequired(status)) {
        setState(OnboardingState.Done);
        return;
      }
      setMissing(status.missing);
      setSteps(buildSteps(status));
      setTabsStale(changesWhatTabsRead(status));
      setState(OnboardingState.Required);
    });
  }, []);

  const recheck = useCallback(function checkAgain() {
    setChecking(true);
    void api.onboarding.status().then(function apply(status) {
      setMissing(status.missing);
      setChecking(false);
    });
  }, []);

  useEffect(
    function recheckWhenFocused() {
      if (state !== OnboardingState.Required) {
        return undefined;
      }
      window.addEventListener(FOCUS_EVENT, recheck);
      return function stopRechecking() {
        window.removeEventListener(FOCUS_EVENT, recheck);
      };
    },
    [state, recheck]
  );

  const advance = useCallback(
    function next() {
      if (stepIndex + 1 < steps.length) {
        setStepIndex(stepIndex + 1);
        return;
      }
      void api.onboarding.complete().then(function finish() {
        if (tabsStale) {
          setTabsGeneration(function nextGeneration(current) {
            return current + 1;
          });
        }
        setState(OnboardingState.Done);
      });
    },
    [stepIndex, steps.length, tabsStale]
  );

  return {
    state,
    steps,
    stepIndex,
    missing,
    checking,
    tabsGeneration,
    recheck,
    advance,
  };
}
