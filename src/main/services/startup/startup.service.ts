import { cacheAllVariants } from "@/main/services/apollo/apollo.service";

/** Starts the work services do before anything asks. */
export function startServices(): void {
  cacheAllVariants();
}
