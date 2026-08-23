import { z } from "zod";

import { SakkaError } from "@/core/errors";
import type { SakkaConfiguration } from "@/core/models";

const configurationSchema = z.object({
  SAKKA_GITHUB_OWNER: z.string().trim().min(1),
  SAKKA_GITHUB_REPOSITORY: z.string().trim().min(1),
  SAKKA_GITHUB_BASE_BRANCH: z.string().trim().min(1),
  SAKKA_CONTENT_DIRECTORY: z.string().trim().min(1),
  SAKKA_CONTENT_EXTENSIONS: z.string().trim().min(1),
  SAKKA_FRONTMATTER_FIELDS: z.string().trim().min(1),
});

type ConfigurationEnvironment = Record<string, string | undefined>;

function splitConfiguredList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isSafeRelativePath(value: string): boolean {
  return (
    !value.startsWith("/") &&
    !value.includes("\\") &&
    value !== "." &&
    value
      .split("/")
      .every(
        (segment) => segment.length > 0 && segment !== "." && segment !== "..",
      )
  );
}

export function isSafeGitBranchName(value: string): boolean {
  const forbiddenCharacters = new Set(["~", "^", ":", "?", "*", "[", "\\"]);

  return (
    value.length > 0 &&
    !value.startsWith("refs/") &&
    !value.startsWith("/") &&
    !value.endsWith("/") &&
    !value.endsWith(".") &&
    !value.includes("..") &&
    !value.includes("@{") &&
    [...value].every(
      (character) =>
        !forbiddenCharacters.has(character) &&
        !/\s/.test(character) &&
        character.charCodeAt(0) > 31 &&
        character.charCodeAt(0) !== 127,
    ) &&
    value
      .split("/")
      .every(
        (segment) => segment.length > 0 && segment !== "." && segment !== "..",
      )
  );
}

function configurationError(): SakkaError {
  return new SakkaError({
    category: "misconfigured",
    message: "Sakka repository configuration is invalid.",
  });
}

export function parseSakkaConfiguration(
  environment: ConfigurationEnvironment,
): SakkaConfiguration {
  const parsed = configurationSchema.safeParse(environment);
  if (!parsed.success) {
    throw configurationError();
  }

  const contentExtensions = splitConfiguredList(
    parsed.data.SAKKA_CONTENT_EXTENSIONS,
  );
  const supportedFrontmatterFields = splitConfiguredList(
    parsed.data.SAKKA_FRONTMATTER_FIELDS,
  );

  if (
    !isSafeGitBranchName(parsed.data.SAKKA_GITHUB_BASE_BRANCH) ||
    !isSafeRelativePath(parsed.data.SAKKA_CONTENT_DIRECTORY) ||
    contentExtensions.length === 0 ||
    contentExtensions.some((extension) => !/^\.[a-z0-9]+$/i.test(extension)) ||
    supportedFrontmatterFields.length === 0 ||
    supportedFrontmatterFields.some(
      (field) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(field),
    )
  ) {
    throw configurationError();
  }

  return {
    repository: {
      owner: parsed.data.SAKKA_GITHUB_OWNER,
      repository: parsed.data.SAKKA_GITHUB_REPOSITORY,
    },
    baseBranch: parsed.data.SAKKA_GITHUB_BASE_BRANCH,
    contentDirectory: parsed.data.SAKKA_CONTENT_DIRECTORY,
    contentExtensions,
    supportedFrontmatterFields,
  };
}

export function assertConfiguredContentPath(
  configuration: SakkaConfiguration,
  path: string,
): void {
  const prefix = `${configuration.contentDirectory}/`;
  const extension = path.includes(".") ? `.${path.split(".").at(-1)}` : "";

  if (
    !isSafeRelativePath(path) ||
    !path.startsWith(prefix) ||
    !configuration.contentExtensions.includes(extension)
  ) {
    throw new SakkaError({
      category: "validation",
      message:
        "This content path is outside Sakka's configured content target.",
    });
  }
}

function normalizeBranchSegment(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    throw new SakkaError({
      category: "validation",
      message: "Sakka could not create a safe working branch name.",
    });
  }

  return normalized;
}

export function createWorkingBranchName({
  authorLogin,
  articleSlug,
  suffix,
}: {
  authorLogin: string;
  articleSlug: string;
  suffix: string;
}): string {
  if (!/^[a-z0-9]{8}$/i.test(suffix)) {
    throw new SakkaError({
      category: "validation",
      message: "Sakka could not create a safe working branch name.",
    });
  }

  const branch = `sakka/${normalizeBranchSegment(authorLogin)}/${normalizeBranchSegment(articleSlug)}-${suffix.toLowerCase()}`;
  if (!isSafeGitBranchName(branch)) {
    throw new SakkaError({
      category: "validation",
      message: "Sakka could not create a safe working branch name.",
    });
  }

  return branch;
}
