# Puck nested-slot perf repro

Minimal, dependency-free reproduction of **O(n) per-keystroke input lag when editing
fields inside deeply nested slots**, and of the fact that `_experimentalVirtualization`
only covers root-level zones (so nested-slot documents get no benefit).

Stock Puck only — two trivial components (`Section` with a `slot`, `Field` with a `text`
field). No custom resolveData / resolveFields / hooks. This isolates the cost to Puck core.

## Versions

- `@puckeditor/core` **0.21.3** (latest stable; 0.21.2 behaves identically — the 0.21.3
  changeset contains only `fix:` commits, none touching `walkAppState` / reducer /
  virtualization).
- React 18, Vite 5.

## Run

```bash
npm install
npm run dev        # http://localhost:4180  (or: npm run build && npm run preview)
```

Toolbar: pick a size (**N=90/135/200/300**), toggle **nested / flat (root-level)**, and
**toggle virtualization**. URL params also work: `?n=300&mode=nested&virt=1`.

## What to do

1. Open with `?n=300&mode=nested&virt=0`.
2. Click any field on the canvas to select it.
3. Type in its `label` in the right sidebar — note the input lag.
4. **Hold a key down**: the page freezes for ~1–2s, then all characters appear at once
   (the input queue starves because each keystroke costs more than the key-repeat interval).
5. Switch to `flat` (same N) — much smoother. Turn virtualization **on** — `flat` improves
   further, `nested` does **not** change.

## Measured (production build, headless Chromium, per-keystroke latency editing `label`)

| nested, virtualization off | latency |
| --- | --- |
| N=90  | ~30 ms |
| N=135 | ~44 ms |
| N=200 | ~59 ms |

Grows ~linearly with the number of nodes.

| N=135 | virt off | virt on |
| --- | --- | --- |
| flat (root-level) | ~38 ms | **~27 ms** |
| nested            | ~46 ms | ~41 ms (no change) |

Heavier real-world components (each field doing its own render work) push the nested figure
to ~80 ms @135 and make the hold-key freeze far more pronounced; the trivial components here
show the Puck-core floor.

## Why

- Editing any field dispatches a `replace` action, which runs `walkAppState(state, config)`
  over the **whole** data tree on every keystroke — O(total nodes), independent of which
  node changed.
- `_experimentalVirtualization` is gated to the root area zone only
  (`packages/core/components/DropZone/index.tsx`):

  ```ts
  const isRootAreaZone = (areaId ?? rootAreaId) === rootAreaId && depth === 0;
  const shouldVirtualizeItems = _experimentalVirtualization && isRootAreaZone;
  ```

  Documents that wrap their content in a single root layout component (a very common
  pattern) keep all of it in nested slots at `depth >= 1`, so virtualization never engages.

## Relation to #1492

This is the still-unaddressed part of #1492 ("Performance degradation with large nested
documents"). The reporters there explicitly had deeply nested slots; the issue was closed
alongside the root-only virtualization in 0.21.2, but no nested-slot reporter confirmed a
fix. The nested per-keystroke `walkAppState` cost remains.

## Possible directions

- Incremental `walkAppState` — only re-walk the changed subtree on `replace`.
- Extend virtualization beyond the root area zone to nested slots.
