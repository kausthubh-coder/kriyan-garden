import { quickAddGrammar } from "../src/quickAddGrammar";
import { quickAddCases } from "../src/quickAddCases";
const document = `# Quick add

Type a title, followed by any combination of a day, time, #tag and length. Every part except the title is optional. Length is never inferred. The Day view defaults to its selected day and area; the API can supply different defaults. Dates use your local day, not the server's UTC date.

Area names belong to you. Music is a custom area in these tested examples; use your own area names.

## Tokens

This table is generated from the same fixtures exercised by quickAdd.test.ts. Rebuild it with \`bun run docs:quick-add\` from the repository root.

| Tokens and examples | Meaning |
| --- | --- |
${quickAddGrammar.map((row) => `| ${row.tokens.map((token) => `\`${token}\``).join(", ")} | ${row.meaning} |`).join("\n")}

## How the parser decides

The first day and first time win. A weekday means its next occurrence, including a week from today when it is the same weekday. An unknown #tag stays in the title. Area tags are checked before project tags. The parser capitalizes the first letter of the remaining title and collapses spaces. Numbers and words that do not match a token stay in the title. In particular, "20 minutes" is ordinary title text; use "20m" to set a length. ISO dates, deadlines, repeat rules and reminders are edited in task details, not parsed from this input.

## Tested examples

| Input | Parsed fields |
| --- | --- |
${quickAddCases.filter((row) => row.text.trim()).map((row) => `| ${JSON.stringify(row.text)} | ${JSON.stringify(row.expected)} |`).join("\n")}

The example fixture uses Tuesday 29 September 2026 as today and 1 October as the selected day. Your dates follow your local calendar.
`;
const target = new URL("../../../docs/site/quick-add.md", import.meta.url);
if (process.argv.includes("--check")) {
  if (await Bun.file(target).text() !== document) {
    throw new Error("Quick-add docs are out of date. Run bun run docs:quick-add and review the changes.");
  }
  console.log("Quick-add docs match tested grammar fixtures.");
} else {
  await Bun.write(target, document);
  console.log("Generated docs/site/quick-add.md from tested grammar fixtures.");
}
