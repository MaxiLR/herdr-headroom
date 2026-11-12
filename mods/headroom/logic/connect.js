// The connect dialog's words and its sign-in.

export function errorText(kind, provider) {}

export function stopsIn(deadline, now) {}

export function dialogState(provider) {
  return {};
}

export function startSignIn(state, options) {
  return { submit() {}, stop() {}, done: Promise.resolve() };
}
