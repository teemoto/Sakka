import type { Draft } from "@/core/models";

/**
 * Persists only draft-operation metadata. Repository source remains in GitHub.
 */
export interface DraftStore {
  get(id: string): Promise<Draft | undefined>;
  save(draft: Draft): Promise<void>;
}
