import { z } from "zod";

export const Header = z
  .string()
  .min(1)
  .max(128)
  .refine((v) => v.trim().length > 0, "Headers cannot be blank.");
const Ref = z.string().min(1).max(80);
const Base = { references: z.array(Ref).max(6) };
export const Operation = z.discriminatedUnion("type", [
  z.object({ ...Base, type: z.literal("trim"), column: Header }).strict(),
  z.object({ ...Base, type: z.literal("lowercase"), column: Header }).strict(),
  z.object({ ...Base, type: z.literal("uppercase"), column: Header }).strict(),
  z
    .object({ ...Base, type: z.literal("rename"), column: Header, to: Header })
    .strict(),
  z
    .object({
      ...Base,
      type: z.literal("deduplicate"),
      key: z.array(Header).min(1).max(50),
      keep: z.enum(["first", "last"]),
    })
    .strict(),
  z.object({ ...Base, type: z.literal("remove_empty_rows") }).strict(),
]);
export type Operation = z.infer<typeof Operation>;
export const RecipeSchema = z
  .object({
    version: z.literal(1),
    title: z.string().min(1).max(100),
    requiredHeaders: z.array(Header).min(1).max(50),
    operations: z.array(Operation).min(1).max(30),
    assumptions: z.array(z.string().max(500)).max(12),
    sources: z
      .array(
        z
          .object({
            id: Ref,
            label: z.string().max(300),
            kind: z.enum(["instruction", "note", "url"]),
            url: z
              .string()
              .url()
              .refine((v) => {
                const u = new URL(v);
                return u.protocol === "https:" && !u.username && !u.password;
              }, "Reference links must be public HTTPS URLs.")
              .optional(),
          })
          .strict(),
      )
      .min(1)
      .max(4),
    model: z
      .object({
        id: z.string().max(150),
        provider: z.string().max(80),
        upstream: z.string().max(100),
      })
      .strict(),
  })
  .strict();
export type Recipe = z.infer<typeof RecipeSchema>;

export function uniqueHeaders(headers: string[]) {
  if (
    !headers.length ||
    headers.length > 50 ||
    headers.some((h) => !Header.safeParse(h).success)
  )
    throw new Error("Use 1–50 non-empty headers, each at most 128 characters.");
  if (new Set(headers).size !== headers.length)
    throw new Error(
      "Duplicate headers: give every column a unique name before continuing.",
    );
}
export function validateRecipe(input: unknown): Recipe {
  const recipe = RecipeSchema.parse(input);
  uniqueHeaders(recipe.requiredHeaders);
  const sourceIds = recipe.sources.map((s) => s.id);
  if (new Set(sourceIds).size !== sourceIds.length)
    throw new Error("Source IDs must be unique.");
  let headers = [...recipe.requiredHeaders];
  for (const step of recipe.operations) {
    if (step.references.some((r) => !sourceIds.includes(r)))
      throw new Error("A step cites an unknown source.");
    if (!step.references.length)
      throw new Error("Every step needs an instruction or source reference.");
    if ("column" in step && !headers.includes(step.column))
      throw new Error(`Unknown column: ${step.column}`);
    if (step.type === "rename") {
      if (step.to === step.column || headers.includes(step.to))
        throw new Error(`Rename collision: ${step.to}`);
      headers = headers.map((h) => (h === step.column ? step.to : h));
    }
    if (step.type === "deduplicate") {
      if (
        new Set(step.key).size !== step.key.length ||
        step.key.some((k) => !headers.includes(k))
      )
        throw new Error("Deduplication keys must be unique existing columns.");
    }
  }
  return recipe;
}
export function compatible(expected: string[], actual: string[]) {
  return (
    expected.length === actual.length &&
    expected.every((h) => actual.includes(h))
  );
}
export function describe(step: Operation): string {
  switch (step.type) {
    case "trim":
      return `Trim whitespace · ${step.column}`;
    case "lowercase":
      return `Lowercase · ${step.column}`;
    case "uppercase":
      return `Uppercase · ${step.column}`;
    case "rename":
      return `Rename ${step.column} → ${step.to}`;
    case "deduplicate":
      return `Deduplicate ${step.key.join(" + ")} · keep ${step.keep}`;
    case "remove_empty_rows":
      return "Remove completely empty rows";
  }
}
