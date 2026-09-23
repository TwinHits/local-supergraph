import {
  type ApolloCredentials,
  type OnboardingStatus,
} from "@/shared/onboarding/onboarding.types";

/** What the renderer may ask while setting the app up. */
export type OnboardingContract = {
  status(): OnboardingStatus;
  submitCredentials(credentials: ApolloCredentials): boolean;
  complete(): void;
};
