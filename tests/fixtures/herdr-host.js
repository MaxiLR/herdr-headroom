// Stands in for Headroom's main.js in a copy of the mod: builds the host the
// way a copy does and fails the load when the host does not know which system
// it runs on. `herdr-app check` loads a mod with no window, as a copy can
// start before one is open.
import { View } from "gpui-kit";
import { herdrHost } from "./logic/herdr.js";

const PLATFORMS = ["linux", "macos", "windows"];

export default class HostPlatform extends View {
  init() {
    const { platform } = herdrHost();
    if (!PLATFORMS.includes(platform)) {
      throw new Error(`the host does not know its platform: ${platform}`);
    }
  }

  render() {
    return "";
  }
}
