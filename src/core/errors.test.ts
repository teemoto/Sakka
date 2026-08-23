import { describe, expect, it } from "vitest";

import { SakkaError, sakkaErrorCategories } from "@/core/errors";

describe("SakkaError", () => {
  it("keeps a stable category and safe correlation ID", () => {
    const error = new SakkaError({
      category: "conflict",
      message: "This article changed while you were editing it.",
      correlationId: "op_123",
    });

    expect(error).toMatchObject({
      name: "SakkaError",
      category: "conflict",
      correlationId: "op_123",
      retryable: false,
    });
  });

  it("contains the error categories promised to the UI", () => {
    expect(sakkaErrorCategories).toEqual([
      "unauthenticated",
      "unauthorized",
      "misconfigured",
      "not_found",
      "validation",
      "conflict",
      "rate_limited",
      "transient",
    ]);
  });
});
