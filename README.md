# Puck nested-slot perf repro

Minimal, dependency-free reproduction of **per-keystroke input lag that grows with the size of
the whole document** when editing a field inside deeply nested slots, and of the fact that
`_experimentalVirtualization` only covers root-level zones (so nested-slot documents get no
benefit).

Stock Puck only — two trivial components (`Section` with a `slot`, `Field` with a `text` field).
No custom `resolveData` / `resolveFields` / hooks, so the cost is isolated to Puck core.

## Versions

- `@puckeditor/core` **0.21.3** (0.21.2 behaves identically — the 0.21.3 changeset is `fix:`
  commits only, none touching `walkAppState` / the reducer / virtualization).
- React 18, Vite 5.

## Run

```bash
npm install
npm run dev        # http://localhost:4180  (or: npm run build && npm run preview)
```

Toolbar: pick a size (**N=90/135/200/300**), toggle **nested / flat (root-level)**, and **toggle
virtualization**. URL params also work: `?n=300&mode=nested&virt=1`.

## What to do

1. Open with `?n=300&mode=nested&virt=0`.
2. Click any field on the canvas to select it.
3. Type in its `label` in the right sidebar — note the input lag.
4. **Hold a key down**: the page freezes for ~1–2 s, then all characters appear at once (the input
   queue starves because each keystroke costs more than the key-repeat interval).
5. Switch to `flat` (same N) — much smoother. Turn virtualization **on**: `flat` improves to a
   constant, `nested` does **not** change.

## Analysis

The full root-cause analysis, the measurement matrix (single-keystroke and held-key, vanilla vs a
proposed fix), and the suggested direction live in the accompanying issue on `puckeditor/puck`.
This repo is just the reproduction.
