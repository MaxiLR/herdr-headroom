// Which form a copy of the mod takes: the connect dialog or the remove dialog
// when it was opened as one, the form its props name (the account view only
// with the account it shows), else the one its block's size suits.

const NAMED = ["list", "rail", "strip", "detail"];

// Narrower than this, the block is a rail; shorter than this, a strip.
const RAIL_BELOW = 160;
export const STRIP_BELOW = 48;

export function chooseForm(props, size) {
  if (props.connect) return "connect";
  if (isAccountId(props.remove)) return "remove";
  if (NAMED.includes(props.form)) return props.form;
  if (props.form === "account" && isAccountId(props.account)) return "account";
  if (!size) return "list";
  if (size.width < RAIL_BELOW) return "rail";
  if (size.height < STRIP_BELOW) return "strip";
  return "list";
}

const isAccountId = (id) => typeof id === "string" && id !== "";
