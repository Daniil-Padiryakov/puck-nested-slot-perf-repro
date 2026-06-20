import { useCallback, useMemo, useState } from "react";

import { type Config, type Data, Puck } from "@puckeditor/core";

// --- Vanilla Puck config: zero custom logic, just a slot container + a leaf field ---

type FieldProps = { label: string };
type SectionProps = { title: string; items: unknown };

const config: Config = {
  components: {
    // Leaf component — its `label` prop is what we edit in the sidebar.
    Field: {
      fields: { label: { type: "text" } },
      defaultProps: { label: "Field" },
      render: ({ label }: FieldProps) => (
        <div
          style={{ padding: "4px 8px", border: "1px solid #ddd", margin: 2 }}
        >
          {label}
        </div>
      ),
    },
    // Slot container — holds many children inside a Puck slot (depth >= 1).
    Section: {
      fields: { title: { type: "text" }, items: { type: "slot" } },
      defaultProps: { title: "Section", items: [] },
      render: ({
        title,
        items: Items,
      }: SectionProps & { items: React.ComponentType }) => (
        <div style={{ border: "1px solid #999", margin: 6, padding: 6 }}>
          <strong>{title}</strong>
          <Items />
        </div>
      ),
    },
  },
};

// --- Data generators ---

const makeField = (id: string, label: string) => ({
  type: "Field",
  props: { id, label },
});

// NESTED: root -> Container(slot) -> S Sections(slot) -> F Fields. Mirrors a real
// document: one root layout wrapping everything, content lives 2 slot-levels deep.
const makeNested = (total: number): Data => {
  const perSection = 9;
  const sectionCount = Math.max(1, Math.round(total / perSection));
  const sections = [];
  for (let s = 0; s < sectionCount; s++) {
    const fields = [];
    for (let f = 0; f < perSection; f++) {
      const first = s === 0 && f === 0;
      fields.push(
        makeField(`fld-${s}-${f}`, first ? "PROBE" : `Field ${s}.${f}`),
      );
    }
    sections.push({
      type: "Section",
      props: { id: `sec-${s}`, title: `Section ${s}`, items: fields },
    });
  }
  return {
    content: [
      {
        type: "Section",
        props: { id: "root-container", title: "Document", items: sections },
      },
    ],
    root: { props: {} },
  } as Data;
};

// FLAT: all fields directly at root level (depth 0) — the case Puck's
// `_experimentalVirtualization` actually covers. Used as A/B baseline.
const makeFlat = (total: number): Data => {
  const fields = [];
  for (let i = 0; i < total; i++) {
    fields.push(makeField(`fld-${i}`, i === 0 ? "PROBE" : `Field ${i}`));
  }
  return { content: fields, root: { props: {} } } as Data;
};

const params = new URLSearchParams(window.location.search);
const initialN = Number(params.get("n") ?? "135");
const initialMode = params.get("mode") === "flat" ? "flat" : "nested";
const initialVirt = params.get("virt") === "1";

const generate = (mode: string, n: number): Data =>
  mode === "flat" ? makeFlat(n) : makeNested(n);

export const App = () => {
  const [mode, setMode] = useState(initialMode);
  const [n, setN] = useState(initialN);
  const [virt, setVirt] = useState(initialVirt);
  const [data, setData] = useState<Data>(() => generate(initialMode, initialN));
  // key remounts Puck cleanly on regenerate / mode / virt change
  const [seed, setSeed] = useState(0);

  const regenerate = useCallback((m: string, count: number) => {
    setMode(m);
    setN(count);
    setData(generate(m, count));
    setSeed((s) => s + 1);
  }, []);

  const totalNodes = useMemo(() => {
    if (mode === "flat") return n;
    const perSection = 9;
    const sectionCount = Math.max(1, Math.round(n / perSection));
    return 1 + sectionCount + sectionCount * perSection; // container + sections + fields
  }, [mode, n]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: 8,
          borderBottom: "1px solid #ccc",
          fontFamily: "sans-serif",
          fontSize: 13,
        }}
      >
        <strong>Puck nested-slot perf repro</strong> — mode: <b>{mode}</b>,
        target N: <b>{n}</b>, total puck nodes: <b>{totalNodes}</b>,
        virtualization: <b>{virt ? "on" : "off"}</b>
        <div
          style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}
        >
          {[90, 135, 200, 300].map((count) => (
            <button key={`n-${count}`} onClick={() => regenerate(mode, count)}>
              N={count}
            </button>
          ))}
          <span style={{ width: 12 }} />
          <button onClick={() => regenerate("nested", n)}>nested</button>
          <button onClick={() => regenerate("flat", n)}>
            flat (root-level)
          </button>
          <span style={{ width: 12 }} />
          <button
            onClick={() => {
              setVirt((v) => !v);
              setSeed((s) => s + 1);
            }}
          >
            toggle virtualization
          </button>
        </div>
        <div style={{ marginTop: 4, color: "#666" }}>
          Select any field on the canvas, then type in its <code>label</code> in
          the right sidebar. Feel the input lag. Compare nested vs flat at the
          same N.
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Puck
          key={`${mode}-${n}-${virt}-${seed}`}
          config={config}
          data={data}
          onChange={setData}
          iframe={{ enabled: false }}
          _experimentalVirtualization={virt}
        />
      </div>
    </div>
  );
};
