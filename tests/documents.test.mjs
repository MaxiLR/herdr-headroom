import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const DOCUMENTS = [
  "README.md",
  "CONTEXT.md",
  "DESIGN.md",
  "PRODUCT.md",
  "RECIPE.md",
];
const RECORDS = [
  ".impeccable/design.json",
  ".impeccable/surfaces/mods-headroom-main-js.md",
];

// The text of `doc` from the heading `title` to the next heading of the same
// or a higher level.
function section(doc, title) {
  const lines = doc.split("\n");
  const start = lines.findIndex((line) => line.replace(/^#+ /, "") === title);
  assert.notEqual(start, -1, `no heading "${title}"`);
  const level = lines[start].match(/^#+/)[0].length;
  const end = lines.findIndex(
    (line, i) =>
      i > start && /^#+ /.test(line) && line.match(/^#+/)[0].length <= level,
  );
  return lines.slice(start, end === -1 ? undefined : end).join("\n");
}

// The bodies of the fenced blocks of `language` in `text`.
function fences(text, language) {
  const found = [];
  const pattern = new RegExp("```" + language + "\\n([\\s\\S]*?)```", "g");
  for (const match of text.matchAll(pattern)) found.push(match[1]);
  return found;
}

test("the README shows the block the installer adds, without fit", () => {
  const own = section(read("README.md"), "Using it in your own layout");
  const [first] = fences(own, "json");
  assert.deepEqual(JSON.parse(first), {
    id: "headroom",
    type: "block",
    size: { weight: 1 },
    min: 90,
    content: { mod: "headroom" },
  });
});

test("the README's props name the account form, its account and fit's 329 px", () => {
  const props = section(read("README.md"), "Props");
  const rows = props.split("\n").filter((line) => line.startsWith("| `"));
  const row = (name) => rows.find((line) => line.startsWith(`| \`${name}\``));
  assert.match(row("form"), /`account`/);
  assert.match(row("account"), /<provider>:<account id>:<organization id>/);
  assert.match(row("fit"), /329 px/);
});

test("the README shows another mod opening the account view", () => {
  const scripts = fences(read("README.md"), "js").join("\n");
  assert.match(scripts, /form: "account"/);
  assert.match(scripts, /width: 380/);
});

test("no document or record mentions an account menu", () => {
  for (const path of [...DOCUMENTS, ...RECORDS]) {
    assert.doesNotMatch(read(path), /account(.s)? menu/i, path);
  }
});

test("no document or record names Herdr's provider icons as the marks", () => {
  for (const path of [...DOCUMENTS, ...RECORDS]) {
    const text = read(path);
    assert.doesNotMatch(text, /icons\/codex\.svg/, path);
    for (const match of text.matchAll(/icons\/claude\.svg/g)) {
      const before = text.slice(Math.max(0, match.index - 13), match.index);
      assert.equal(before, "mods/headroom/", `${path}: Herdr's claude.svg`);
    }
  }
});

test("no document gives the list's old 320 px limit", () => {
  for (const path of DOCUMENTS) {
    assert.doesNotMatch(read(path), /\b320 ?px\b/, path);
  }
});

test("a click on an account is not said to open the detail view", () => {
  for (const path of [...DOCUMENTS, ...RECORDS]) {
    const text = read(path).replace(/\s+/g, " ");
    assert.doesNotMatch(
      text,
      /click on an account[^.]*opens? the detail view/i,
      path,
    );
    assert.doesNotMatch(text, /a click opens the detail view/i, path);
    assert.doesNotMatch(
      text,
      /account in the list, the rail or the strip, and the list's/i,
      path,
    );
  }
});

test("the glossary names the account view", () => {
  assert.match(read("CONTEXT.md"), /^\*\*Account view\*\* — /m);
});

test("DESIGN.md's pair is 6 px apart, with no menu and Claude's orange", () => {
  const front = read("DESIGN.md").split("\n---\n")[0];
  assert.match(front, /^ {2}pair: "6px"$/m);
  assert.doesNotMatch(front, /^ {2}menu(-item)?(-active)?:/m);
  assert.match(front, /"#D97757"/i);
});

test("RECIPE.md uses no crypto.subtle and warns about it", () => {
  const recipe = read("RECIPE.md");
  assert.doesNotMatch(section(recipe, "Built from"), /crypto\.subtle/);
  assert.match(section(recipe, "Watch out"), /crypto\.subtle/);
});

test("design.json is valid, without the menu and with the account view", () => {
  const design = JSON.parse(read(".impeccable/design.json"));
  const names = design.components.map((component) => component.name);
  assert.ok(!names.some((name) => /menu/i.test(name)), names.join(", "));
  assert.ok(
    names.some((name) => /account view/i.test(name)),
    names.join(", "),
  );
  assert.ok(
    !design.extensions.shadows.some((shadow) => shadow.name === "menu"),
  );
  const row = design.components.find((c) => c.refersTo === "account-row");
  assert.match(row.css, /\.ds-thin\{[^}]*margin-top:6px/);
});
