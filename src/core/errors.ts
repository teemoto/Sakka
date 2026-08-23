export const sakkaErrorCategories = [
  "unauthenticated",
  "unauthorized",
  "misconfigured",
  "not_found",
  "validation",
  "conflict",
  "rate_limited",
  "transient",
] as const;

export type SakkaErrorCategory = (typeof sakkaErrorCategories)[number];

export class SakkaError extends Error {
  readonly category: SakkaErrorCategory;
  readonly correlationId?: string;
  readonly retryable: boolean;

  constructor({
    category,
    message,
    correlationId,
    retryable = false,
  }: {
    category: SakkaErrorCategory;
    message: string;
    correlationId?: string;
    retryable?: boolean;
  }) {
    super(message);
    this.name = "SakkaError";
    this.category = category;
    this.correlationId = correlationId;
    this.retryable = retryable;
  }
}
