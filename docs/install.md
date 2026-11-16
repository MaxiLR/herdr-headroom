# Installing

[Back to the README](../README.md)

Install Herdr and start it once, so its home exists: `$HERDR_APP_HOME` when
set, else `~/.config/herdr-app`.

```sh
scripts/install.sh --dry-run          # what it would do; changes nothing
scripts/install.sh                    # install the mod
scripts/install.sh --layout           # and add the layout herdr-headroom
scripts/install.sh --layout my-name   # or a layout of another name
```

`scripts/install.sh [--dry-run] [--layout [name]]` prints one line per step: a
mark (`✔` done, `•` would do, `!` left for you, `✖` failed), the step and what
happened. On a terminal the lines are coloured; piped output is plain, and
`NO_COLOR` turns colours off. It refuses, changing nothing, when the Herdr home
does not exist.

- **Back up.** A previous install in `<Herdr home>/mods/headroom/` is moved to
  `<Herdr home>/backups/headroom-<YYYYmmdd-HHMMSS>/` (with `-2`, `-3`, … when
  that name is taken), outside `mods/` so Herdr does not load the backup as a
  mod. A first install makes no backup.
- **Copy.** `mods/headroom/` of this checkout is copied to
  `<Herdr home>/mods/headroom/`, leaving out the `gpui-kit.d.ts` and
  `jsconfig.json` Herdr writes itself. On a reinstall it reports how many files
  changed, were added or were removed; `--dry-run` lists each one.
- **Check.** When `herdr-app` is on `PATH`, it runs `herdr-app check` on the
  installed folder. A failed check prints what `herdr-app` said and exits 1;
  without `herdr-app` the check is skipped with a warning.
- **Command.** It writes `~/.local/bin/headroom`, the one file outside the
  Herdr home: a launcher holding this checkout's path, which runs the
  checkout's `scripts/headroom` (see [Updating](#updating)). An install from
  another checkout points it there. A `headroom` file the installer did not
  write is left as it is, and the step says so. The step also says when
  `~/.local/bin` is not on `PATH`; add it to run `headroom` from any directory.
  Without `HOME` it writes no command and says so.
- **Layout** (`--layout`, default name `herdr-headroom`). A name must match
  `^[A-Za-z0-9_-]+$`: Herdr lists a layout under its file name and switches
  only to one whose name uses letters, digits, `-` or `_`. Any other name is
  refused before anything changes, with exit 2. It needs `jq`. It writes
  `<Herdr home>/layouts/<name>.json`: a copy of the home's `layouts/main.json`
  with two changes, and nothing else.
  - **The block.** One Headroom block is added as the last child of
    `sidebar-lists`, after Spaces and Agents, sized by the mod (`props.fit`,
    shown under [Using it in your own layout](layout.md)).
    It is as tall as its header and its accounts need, up to two accounts;
    with three or more it is 17 px taller, for the hint that says how many
    more are below. Further accounts scroll, or you drag the block taller. A
    drag is kept, across restarts too, until the height the block needs
    changes.
  - **The status row.** The first block with the id `status` (Herdr's
    `workspace-status`) is put in a row of its size: the `status` block at a
    weight of 3, then the `headroom-strip` block, hidden, at a weight of 2,
    120 px at least and 720 px at most, across a boundary that drags (shown
    under [The strip's separator](layout.md#the-strips-separator)). "Show in status
    bar" in Accounts and settings shows and hides it. Without a `status`
    block the layout is written without it, and the step says so.

  Settings shows the layout as written, the palette with its first letter in
  upper case. It never overwrites or edits a layout and never switches to it;
  it prints the command that does:

  ```sh
  herdr-app do layout.switch --name herdr-headroom
  ```

  Without `jq`, without `layouts/main.json`, with a `main.json` that is not
  valid JSON or has no `sidebar-lists` node with children, or when the layout
  already exists, it says so, writes no layout and still installs the mod.

  A layout an earlier version of the installer wrote keeps what it was written
  with; `Herdr Headroom.json` is one, which Herdr cannot show. To replace it,
  switch to another layout, remove `<Herdr home>/layouts/<name>.json` and run
  `--layout` again.

The installer binds no key and never reads, copies or removes the vault
(`<Herdr home>/headroom/`).

## Updating

```sh
headroom update   # from any directory
```

It runs `git pull --ff-only` in the checkout the mod was installed from, on the
branch that is checked out, then that checkout's `scripts/install.sh`, without
`--layout`: the steps above, with the previous install backed up. With nothing
to pull it installs the checkout again. When the pull fails (no upstream, a
branch that diverged, local edits in the way, no network) it shows what git
said, installs nothing and exits 1.

`headroom` with anything but `update` prints its usage and exits 2. When the
checkout has moved or is gone, `headroom` says so instead, whatever it was
given, and exits 1; run `scripts/install.sh` from where the checkout is now.

## Undoing

Remove `<Herdr home>/mods/headroom/`, `~/.local/bin/headroom`, and the layout
file if one was written. To go back to an earlier version, copy the backup
folder back to `<Herdr home>/mods/headroom/`. Remove `<Herdr home>/headroom/`
to delete every stored login.
