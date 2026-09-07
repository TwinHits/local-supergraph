import { prefetchVariants } from "@/main/services/apollo/apollo.service";

/** Starts the work services do before anything asks them for it. */
export function startServices(): void {
  prefetchVariants();
}
