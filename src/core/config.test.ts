import { describe, expect, it } from "vitest";

import {
  assertConfiguredContentPath,
  createWorkingBranchName,
  isSafeGitBranchName,
  parseSakkaConfiguration,
} from "@/core/config";
import { SakkaError } from "@/core/errors";

const environment = {
  SAKKA_GITHUB_OWNER: "teemoto",
  SAKKA_GITHUB_REPOSITORY: "aslambhai",
  SAKKA_GITHUB_BASE_BRANCH: "sakka/dogfood",
  SAKKA_CONTENT_DIRECTORY: "src/content/articles",
  SAKKA_CONTENT_EXTENSIONS: ".md,.mdx",
  SAKKA_FRONTMATTER_FIELDS:
    "title,description,publishedAt,minutes,topic,icon,draft,featured",
};

function expectSakkaError(
  operation: () => unknown,
  category: SakkaError["category"],
): void {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(SakkaError);
    expect((error as SakkaError).category).toBe(category);
    return;
  }

  throw new Error("Expected SakkaError to be thrown.");
}

describe("parseSakkaConfiguration", () => {
  it("parses the single dogfood repository configuration", () => {
    expect(parseSakkaConfiguration(environment)).toEqual({
      repository: { owner: "teemoto", repository: "aslambhai" },
      baseBranch: "sakka/dogfood",
      contentDirectory: "src/content/articles",
      contentExtensions: [".md", ".mdx"],
      supportedFrontmatterFields: [
        "title",
        "description",
        "publishedAt",
        "minutes",
        "topic",
        "icon",
        "draft",
        "featured",
      ],
    });
  });

  it("rejects missing or unsafe repository configuration", () => {
    expectSakkaError(
      () =>
        parseSakkaConfiguration({
          ...environment,
          SAKKA_CONTENT_DIRECTORY: "../articles",
        }),
      "misconfigured",
    );

    expectSakkaError(
      () =>
        parseSakkaConfiguration({
          ...environment,
          SAKKA_GITHUB_OWNER: undefined,
        }),
      "misconfigured",
    );
  });
});

describe("repository target guards", () => {
  const configuration = parseSakkaConfiguration(environment);

  it("allows only paths inside the configured directory and extension set", () => {
    expect(() =>
      assertConfiguredContentPath(
        configuration,
        "src/content/articles/hello-world.mdx",
      ),
    ).not.toThrow();

    expectSakkaError(
      () =>
        assertConfiguredContentPath(
          configuration,
          "src/content/pages/about.md",
        ),
      "validation",
    );
  });

  it("generates deterministic safe article working branches", () => {
    expect(
      createWorkingBranchName({
        authorLogin: "Teemoto",
        articleSlug: "Working with AI!",
        suffix: "a1b2c3d4",
      }),
    ).toBe("sakka/teemoto/working-with-ai-a1b2c3d4");

    expect(isSafeGitBranchName("sakka/dogfood")).toBe(true);
    expect(isSafeGitBranchName("refs/heads/main")).toBe(false);
    expect(isSafeGitBranchName("sakka/unsafe:name")).toBe(false);
  });
});
