// IO80 layout in key units. The knob replaces the top-right key; the fingerprint
// reader sits between the navigation cluster and the arrow keys.
export type Key = { x: number; y: number; w: number; code: string };

const row = (y: number, x0: number, keys: [string, number?][]): Key[] => {
  let x = x0;
  return keys.map(([code, w = 1]) => {
    const k = { x, y, w, code };
    x += w;
    return k;
  });
};

const letters = (s: string) => [...s].map((c) => [`Key${c}`] as [string]);
const fn = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => [`F${a + i}`] as [string]);

export const keys: Key[] = [
  { x: 0, y: 0, w: 1, code: "Escape" },
  ...row(0, 2, fn(1, 4)),
  ...row(0, 6.5, fn(5, 8)),
  ...row(0, 11, fn(9, 12)),
  ...row(0, 15.25, [["PrintScreen"], ["ScrollLock"]]),
  ...row(1.25, 0, [
    ["Backquote"],
    ...Array.from({ length: 10 }, (_, i) => [`Digit${(i + 1) % 10}`] as [string]),
    ["Minus"],
    ["Equal"],
    ["Backspace", 2],
  ]),
  ...row(1.25, 15.25, [["Insert"], ["Home"], ["PageUp"]]),
  ...row(2.25, 0, [["Tab", 1.5], ...letters("QWERTYUIOP"), ["BracketLeft"], ["BracketRight"], ["Backslash", 1.5]]),
  ...row(2.25, 15.25, [["Delete"], ["End"], ["PageDown"]]),
  ...row(3.25, 0, [["CapsLock", 1.75], ...letters("ASDFGHJKL"), ["Semicolon"], ["Quote"], ["Enter", 2.25]]),
  ...row(4.25, 0, [["ShiftLeft", 2.25], ...letters("ZXCVBNM"), ["Comma"], ["Period"], ["Slash"], ["ShiftRight", 2.75]]),
  { x: 16.25, y: 4.25, w: 1, code: "ArrowUp" },
  ...row(5.25, 0, [
    ["ControlLeft", 1.25],
    ["MetaLeft", 1.25],
    ["AltLeft", 1.25],
    ["Space", 6.25],
    ["AltRight", 1.25],
    ["MetaRight", 1.25],
    ["ContextMenu", 1.25],
    ["ControlRight", 1.25],
  ]),
  ...row(5.25, 15.25, [["ArrowLeft"], ["ArrowDown"], ["ArrowRight"]]),
];

export const knob = { x: 17.25, y: 0 };
export const fingerprint = { x: 16.25, y: 3.25 };
export const width = 18.25;
export const depth = 6.25;
