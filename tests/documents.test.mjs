import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

// The layout the installer writes from a main.json shaped like Herdr's own:
// the lists in the sidebar and the 28 px status block under the work column.
let written = null;
function installedLayout() {
  if (written) return written;
  const root = mkdtempSync(join(tmpdir(), "headroom-documents-"));
  try {
    const home = join(root, "herdr-app");
    mkdirSync(join(home, "layouts"), { recursive: true });
    const main = {
      id: "root",
      type: "row",
      children: [
        {
          id: "sidebar-lists",
          type: "column",
          children: [
            {
              id: "spaces",
              type: "block",
              size: { weight: 1 },
              min: 90,
              content: { mod: "spaces" },
            },
          ],
        },
        {
          id: "work",
          type: "column",
          children: [
            { id: "main", type: "block", content: { tab: "active" } },
            {
              id: "status",
              type: "block",
              size: { px: 28 },
              content: { mod: "workspace-status" },
            },
          ],
        },
      ],
    };
    writeFileSync(join(home, "layouts", "main.json"), JSON.stringify(main));
    const jq = spawnSync("/bin/sh", ["-c", "command -v jq"], {
      encoding: "utf8",
    }).stdout.trim();
    assert.ok(jq, "jq must be installed to run the installer");
    const result = spawnSync(
      fileURLToPath(new URL("../scripts/install.sh", import.meta.url)),
      ["--layout"],
      {
        encoding: "utf8",
        env: {
          HERDR_APP_HOME: home,
          HOME: root,
          PATH: [dirname(jq), "/usr/bin", "/bin"].join(":"),
        },
      },
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    written = JSON.parse(
      readFileSync(join(home, "layouts", "herdr-headroom.json"), "utf8"),
    );
    return written;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// The node of `layout` with the id `id`, or null.
function node(layout, id) {
  if (layout.id === id) return layout;
  for (const child of layout.children ?? []) {
    const found = node(child, id);
    if (found) return found;
  }
  return null;
}

test("the README shows the block the installer adds, sized by the mod with fit", () => {
  const own = section(read("README.md"), "Using it in your own layout");
  const [first] = fences(own, "json");
  const shown = JSON.parse(first);
  assert.deepEqual(shown, {
    id: "headroom",
    type: "block",
    size: { px: 111 },
    min: 90,
    content: { mod: "headroom", props: { fit: "headroom" } },
  });
  const lists = node(installedLayout(), "sidebar-lists").children;
  assert.deepEqual(lists.at(-1), shown);
});

test("the README's status row example is the row the installer writes", () => {
  const separator = section(read("README.md"), "The strip's separator");
  const [example] = fences(separator, "json");
  assert.deepEqual(JSON.parse(example), node(installedLayout(), "status-row"));
});

test("the README's fit holds the first two accounts: 111 to 207 px in the list, 97 or 103 px in the rail", () => {
  const readme = read("README.md");
  assert.doesNotMatch(readme, /329/);
  const props = section(readme, "Props");
  const rows = props.split("\n").filter((line) => line.startsWith("| `"));
  const row = (name) => rows.find((line) => line.startsWith(`| \`${name}\``));
  assert.match(row("form"), /`account`/);
  assert.match(row("account"), /<provider>:<account id>:<organization id>/);
  assert.match(row("fit"), /two accounts/);
  const own = section(readme, "Using it in your own layout").replace(
    /\s+/g,
    " ",
  );
  for (const px of [111, 120, 190, 207, 97, 103]) {
    assert.match(own, new RegExp(`\\b${px} px\\b`), `${px} px`);
  }
  assert.match(own, /two accounts/);
  assert.match(own, /`headroom\.fit`/);
});

test("the README names herdr-headroom, not Herdr Headroom, as the default layout", () => {
  const readme = read("README.md");
  const install = section(readme, "Install");
  assert.match(install, /default name `herdr-headroom`/);
  assert.match(install, /\^\[A-Za-z0-9_-\]\+\$/);
  const commands = fences(install, "sh").join("\n");
  assert.match(
    commands,
    /^ *herdr-app do layout\.switch --name herdr-headroom$/m,
  );
  assert.match(commands, /--layout +# [^\n]*herdr-headroom/);
  for (const match of readme.matchAll(/Herdr Headroom/g)) {
    const after = readme.slice(match.index + match[0].length).slice(0, 5);
    assert.equal(after, ".json", "Herdr Headroom only as an old layout's file");
  }
});

test("the README shows another mod opening the account view", () => {
  const scripts = fences(read("README.md"), "js").join("\n");
  assert.match(scripts, /form: "account"/);
  assert.match(scripts, /width: 380/);
});

test("the README puts Rename and Remove behind the three dots, and Remove asks with the mod's own dialog", () => {
  const readme = read("README.md").replace(/\s+/g, " ");
  assert.match(readme, /Rename and Remove behind (the )?three dots/);
  assert.match(readme, /Remove asks [^.]*the mod's own dialog/);
});

test("no document names the headroom.remove command or Herdr's confirm dialog for Remove", () => {
  for (const path of ["README.md", "CONTEXT.md", "RECIPE.md"]) {
    const text = read(path);
    assert.doesNotMatch(text, /headroom\.remove/, path);
    assert.doesNotMatch(text, /nextCommand/, path);
    assert.doesNotMatch(text, /confirm dialog/, path);
  }
});

test("no document gives fit's old 329 px", () => {
  for (const path of DOCUMENTS) {
    assert.doesNotMatch(read(path), /\b329\b/, path);
  }
});

test("RECIPE.md watches out for layout names, a popup's height and the hint's position", () => {
  const watch = section(read("RECIPE.md"), "Watch out").replace(/\s+/g, " ");
  assert.match(watch, /letters, digits, `-` or `_`/);
  assert.match(watch, /popup's root[^.]*explicit height/);
  assert.match(watch, /hint[^.]*wheel/);
});

test("the glossary's forms fit the list to two accounts and the detail view manages everything", () => {
  const glossary = read("CONTEXT.md").replace(/\s+/g, " ");
  const form = glossary.slice(
    glossary.indexOf("**Form** — "),
    glossary.indexOf("**Account view** — "),
  );
  assert.match(form, /two accounts/);
  assert.match(form, /hint/);
  assert.match(form, /Show in status bar/);
  assert.match(form, /Rename and Remove/);
  const account = glossary.slice(
    glossary.indexOf("**Account view** — "),
    glossary.indexOf("**Connect dialog** — "),
  );
  assert.match(account, /closes itself/);
  assert.match(account, /the mod's own dialog/);
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

test("design.json is valid, keeps the account view and names the three-dot menu and Remove's dialog", () => {
  const design = JSON.parse(read(".impeccable/design.json"));
  assert.equal(design.schemaVersion, 2);
  const names = design.components.map((component) => component.name);
  for (const name of [/account view/i, /three-dot menu/i, /remove's dialog/i]) {
    assert.ok(
      names.some((found) => name.test(found)),
      `${name}: ${names.join(", ")}`,
    );
  }
  const row = design.components.find((c) => c.refersTo === "account-row");
  assert.match(row.css, /\.ds-thin\{[^}]*margin-top:6px/);
  assert.match(row.description, /two bars at most/i);
});

test("DESIGN.md and design.json ask Remove with the mod's own dialog, not Herdr's confirm dialog", () => {
  for (const path of ["DESIGN.md", ".impeccable/design.json"]) {
    const text = read(path).replace(/\s+/g, " ");
    assert.doesNotMatch(text, /\b329\b/, path);
    assert.doesNotMatch(text, /confirms? through Herdr's/, path);
    assert.doesNotMatch(text, /Herdr's own confirm dialog/, path);
    assert.doesNotMatch(text, /scrollbar, confirm dialog/, path);
  }
  const design = read("DESIGN.md").replace(/\s+/g, " ");
  assert.match(design, /Remove asks [^.]*the mod's own dialog/);
  const dialog = section(read("DESIGN.md"), "Remove's Dialog").replace(
    /\s+/g,
    " ",
  );
  for (const px of [18, 15, 13, 32, 8]) {
    assert.match(dialog, new RegExp(`\\b${px} px\\b`), `${px} px`);
  }
  assert.match(dialog, /`blocked`/);
  assert.match(dialog, /`solid-foreground`/);
});

test("a row draws two bars at most, and the rail and the strip show the fuller of the weekly and the 5-hour window", () => {
  const design = read("DESIGN.md").replace(/\s+/g, " ");
  assert.doesNotMatch(design, /tightest window/);
  assert.doesNotMatch(design, /Per-model window:\*\*/);
  assert.match(design, /two bars at most/i);
  assert.match(design, /fuller of the weekly and the 5-hour/);
  assert.match(design, /never in the list/i);
  const brief = read(".impeccable/surfaces/mods-headroom-main-js.md").replace(
    /\s+/g,
    " ",
  );
  assert.doesNotMatch(brief, /tightest window/);
  assert.match(brief, /fuller of the weekly and the 5-hour/);
});

test("DESIGN.md gives the line, the fitted list, the hint, the rail and the strip their measures", () => {
  const layout = section(read("DESIGN.md"), "Layout").replace(/\s+/g, " ");
  for (const px of [1, 41, 70, 61, 49, 50, 25, 34, 11, 16, 10.5, 120, 720]) {
    assert.match(layout, new RegExp(`(^|[^\\d.])${px} px\\b`), `${px} px`);
  }
  assert.match(layout, /"3 more"/);
  assert.match(layout, /"\+3"/);
  assert.match(layout, /`chevron-down`/);
  assert.match(layout, /two fifths of the status bar/);
  assert.match(layout, /up to 640 px/);
});

test("DESIGN.md draws the three-dot menu, the danger button, the square Connect account and the second switch", () => {
  const doc = read("DESIGN.md");
  const menu = section(doc, "Three-Dot Menu").replace(/\s+/g, " ");
  for (const px of [176, 5, 12.8, 31, 7, 14, 9]) {
    assert.match(menu, new RegExp(`(^|[^\\d.])${px} px\\b`), `${px} px`);
  }
  assert.match(menu, /`popover`/);
  const buttons = section(doc, "Buttons").replace(/\s+/g, " ");
  assert.match(buttons, /`solid-foreground`[^.]*5:1/);
  assert.match(buttons, /30 px square/);
  assert.match(buttons, /340 px/);
  assert.match(buttons, /22 px three-dot/);
  const toggle = section(doc, "Switch").replace(/\s+/g, " ");
  assert.match(toggle, /Show in status bar/);
  assert.match(toggle, /10 px under/);
  const view = section(doc, "Account View").replace(/\s+/g, " ");
  assert.match(view, /640 px/);
  assert.match(view, /closes itself when it opens another view/);
});

test("PRODUCT.md fits Limits to two accounts, puts the strip behind a switch and says what the second live use showed", () => {
  const product = read("PRODUCT.md");
  const context = section(product, "Operating Context").replace(/\s+/g, " ");
  assert.match(context, /two accounts/);
  assert.match(context, /hint/);
  assert.match(context, /Show in status bar/);
  assert.match(context, /one place to manage/);
  const evidence = section(product, "Evidence on Hand").replace(/\s+/g, " ");
  assert.match(evidence, /second live use/);
  assert.match(evidence, /[Nn]ot tried live/);
  assert.doesNotMatch(evidence, /has not been tried live yet/);
});
