// Headroom: how close each connected Claude or Codex account is to its
// usage limits, in whatever block a layout gives it.
import { View, div } from "gpui-kit";
import {
  agents,
  appHome,
  closeOverlay,
  exec,
  layout,
  notify,
  openOverlay,
  props,
  readTextFile,
  run,
  setShared,
  shared,
  theme,
  window,
  writeTextFile,
} from "herdr";
import { chooseForm } from "./logic/form.js";
import { drawn } from "./logic/hint.js";
import { createHost } from "./logic/host.js";
import { PREFS_KEY, published } from "./logic/publish.js";
import { sharedStore } from "./logic/store.js";
import * as account from "./ui/account.js";
import * as connect from "./ui/connect.js";
import * as detail from "./ui/detail.js";
import * as list from "./ui/list.js";
import * as rail from "./ui/rail.js";
import * as remove from "./ui/remove.js";
import * as strip from "./ui/strip.js";

const FORMS = { list, rail, strip, account, detail, connect, remove };
const MODULES = Object.values(FORMS);

// Countdowns are in minutes; the store reads the accounts that are due.
const TICK_MS = 60000;

export default class Headroom extends View {
  init(initial, cx) {
    this.initial = initial ?? {};
    this.host = createHost({
      fetch: (url, options) => fetch(url, options),
      exec,
      appHome,
      readTextFile,
      writeTextFile,
      shared,
      setShared,
      notify,
      layout,
      run,
      openOverlay,
      closeOverlay,
      platform: () => window()?.platform,
      agents,
    });
    this.store = sharedStore(this.host);
    this.ui = {};
    this.size = null;
    const view = this.view();
    for (const module of MODULES) module.init?.(view, cx);
    cx.spawn(async (cx) => {
      await this.store.start();
      await this.store.tick();
      cx.notify();
    });
    cx.timer.every(TICK_MS, (cx) => {
      cx.notify();
      cx.spawn(async () => {
        await this.store.tick();
      });
    });
  }

  view() {
    const given = props() ?? this.initial;
    return {
      form: chooseForm(given, this.size),
      props: given,
      size: this.size,
      now: Date.now(),
      theme: theme(),
      readings: published(this.host),
      notify: this.host.shared(PREFS_KEY)?.notify !== false,
      ui: this.ui,
      store: this.store,
      host: this.host,
    };
  }

  render(cx) {
    const view = this.view();
    drawn(view);
    return div()
      .id("root")
      .size_full()
      .on_size_change((size, cx) => {
        this.size = size;
        cx.notify();
      })
      .child(FORMS[view.form].render(view, cx));
  }

  async close(cx) {
    const view = this.view();
    for (const module of MODULES) await module.close?.(view, cx);
  }
}
