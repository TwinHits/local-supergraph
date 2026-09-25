import { useCallback, useState } from "react";

import { api } from "@/renderer/api";
import { trimCredentials } from "@/renderer/features/OnboardingWizard/onboardingWizard.utils";
import { type Diagnosis } from "@/shared/errors/errors.types";
import { type ApolloCredentials } from "@/shared/onboarding/onboarding.types";

const EMPTY_CREDENTIALS: ApolloCredentials = { apolloKey: "", graphRef: "" };

/** Holds the credentials being typed and checks them against the registry on submit. */
export function useCredentialsStep(onAccepted: () => void) {
  const [credentials, setCredentials] =
    useState<ApolloCredentials>(EMPTY_CREDENTIALS);
  const [submitting, setSubmitting] = useState(false);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);

  const changeKey = useCallback(function setKey(apolloKey: string) {
    setCredentials(function withKey(current) {
      return { ...current, apolloKey };
    });
  }, []);

  const changeGraphRef = useCallback(function setGraphRef(graphRef: string) {
    setCredentials(function withGraphRef(current) {
      return { ...current, graphRef };
    });
  }, []);

  const submit = useCallback(
    function submitCredentials() {
      setSubmitting(true);
      void api.onboarding
        .submitCredentials(trimCredentials(credentials))
        .then(function apply(accepted) {
          if (accepted) {
            setSubmitting(false);
            setDiagnoses([]);
            onAccepted();
            return;
          }
          void api.errors.supergraphErrors().then(function show(found) {
            setSubmitting(false);
            setDiagnoses(found);
          });
        });
    },
    [credentials, onAccepted]
  );

  return {
    credentials,
    submitting,
    diagnoses,
    changeKey,
    changeGraphRef,
    submit,
  };
}
