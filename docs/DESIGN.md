# Knowledge Board — "Flow" Design System

> Reverse-extracted from `wireframe.html` (Variant ③ "Flow").
> An airy, light UI that renders a board's card order as a literal
> **learning path / timeline** — reinforcing "sequence as procedure."
> Signature elements: timeline metaphor, progress rings, and done states.

---

## 1. Design Tokens

### Color palette

| Token      | Value     | Role                                            |
| ---------- | --------- | ----------------------------------------------- |
| `--bg`     | `#f7f8fb` | App/surface background (cool off-white)         |
| `--panel`  | `#ffffff` | Cards, list items, board items                  |
| `--ink`    | `#1a1d26` | Primary text                                    |
| `--muted`  | `#737a89` | Secondary text, captions, labels                |
| `--line`   | `#eaecf2` | Borders, dividers, timeline track, progress bg  |
| `--accent` | `#4f46e5` | Primary action, active state, timeline nodes    |

Supporting / incidental colors used inline:

- Board ring gradients & progress bars per-board: `#4f46e5` (indigo),
  `#0ea5e9` (sky), `#f59e0b` (amber).
- Avatar gradient: `linear-gradient(135deg, #f0abfc, #818cf8)`.
- Progress track fill background: `#eef0f5`.
- Mini pill (default): bg `#f0f1f7`, text `#6b7280`.
- Mini pill (accent): bg `#eef0ff`, text `var(--accent)`.

### Typography

```css
--font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
--mono: "SFMono-Regular", ui-monospace, Menlo, Consolas, monospace;
```

Base body: `color:#e7e7ea` on dark chrome, but the Flow **surface** flips to
light (`--ink` on `--bg`). Font smoothing: `-webkit-font-smoothing:antialiased`.

**Type scale (within Flow):**

| Element             | Size   | Weight | Notes                                    |
| ------------------- | ------ | ------ | ---------------------------------------- |
| Brand wordmark      | 17px   | 700    |                                          |
| Path title (`h2`)   | 20px   | —      |                                          |
| Board item title    | 14px   | —      |                                          |
| Card title (`h5`)   | 14px   | —      |                                          |
| Body / description  | 12px   | —      | `line-height:1.5`, color `--muted`       |
| Subhead / label     | 11px   | —      | uppercase, `letter-spacing:1.3px`        |
| Board item meta      | 11px   | —      | color `--muted`                          |
| Mini pill            | 10px   | —      | rounded 20px                             |

### Radius, spacing & elevation

- **Radii:** surface `20px` · cards/items `13–14px` · board ring `11px` ·
  brand mark `8px` · buttons `10px` · pills `20px` (full) · progress `5px`.
- **Surface shadow:** `0 30px 60px -40px rgba(20,24,60,.5), inset 0 0 0 1px #eef0f5`
  (soft, far-cast, with a hairline inset ring).
- **Card hover lift:** `box-shadow:0 12px 26px -18px rgba(20,24,60,.5)`.
- **Board item hover:** `transform:translateY(-2px)` + `0 12px 24px -16px rgba(20,24,60,.4)`.
- **Button shadow:** `0 8px 20px -8px rgba(79,70,229,.7)` (accent-tinted).
- **Transitions:** `.12s`–`.15s` for interactive lift/hover.

---

## 2. Layout

```
┌─────────────────────────────────────────────┐
│  surface (radius 20, padding 26 28)          │
│  ┌── top bar ─────────────────────────────┐  │
│  │ [mark] Brand      [+ New board]  (av)  │  │
│  └────────────────────────────────────────┘  │
│  ┌── cols: 270px │ 1fr, gap 24 ───────────┐  │
│  │  Boards          │   Path (timeline)   │  │
│  │  · board-list    │   · path-head       │  │
│  │    b-item…       │   · step / step.done│  │
│  │                  │   · add-step        │  │
│  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

- **Outer surface:** `padding:26px 28px`, rounded 20, light background.
- **Two-column body:** `grid-template-columns:270px 1fr; gap:24px`
  (left = board list, right = timeline path).
- **Responsive:** at `max-width:900px` the columns collapse to a single
  column (`grid-template-columns:1fr`).

---

## 3. Components

### 3.1 Top bar

```html
<div class="top">
  <div class="brand"><span class="m"></span> Trailmark</div>
  <button class="btn">+ New board</button>
  <span class="av"></span>
</div>
```

- `.top` — `display:flex; align-items:center; margin-bottom:24px`.
- `.brand` — flex row, gap 10, `font-weight:700; font-size:17px`.
- `.brand .m` — 24×24 accent square, radius 8, with an inset outlined
  square via `::after` (`inset:7px; border:2px solid #fff; border-radius:3px`).
  Reads as a small logo mark.
- `.btn` — `margin-left:14px`; accent bg, white text, radius 10,
  `padding:10px 16px`, weight 600, accent-tinted shadow.
- `.av` — `margin-left:auto`; 32×32 circle avatar with
  `linear-gradient(135deg,#f0abfc,#818cf8)`.

### 3.2 Section subhead

```css
.subhead{
  font-size:11px; text-transform:uppercase; letter-spacing:1.3px;
  color:var(--muted); margin-bottom:12px;
}
```

Used above the board list ("Boards").

### 3.3 Board list item

```html
<div class="b-item on">
  <span class="ring" style="background:#4f46e5">W</span>
  <div style="flex:1">
    <h4>Learn Web Dev</h4>
    <p>7 of 18 done</p>
    <div class="progress"><i style="width:39%;background:#4f46e5"></i></div>
  </div>
</div>
```

- `.b-item` — panel card, `border:1px solid var(--line)`, radius 14,
  `padding:14px`, flex row gap 12, `cursor:pointer`, `.15s` transition.
- Hover: `translateY(-2px)` + soft shadow.
- `.b-item.on` (active/selected): `outline:2px solid var(--accent);
  outline-offset:-1px`.
- `.ring` — 38×38 rounded-11 square, per-board solid color, white bold
  initial letter, centered. Acts as the board's identity badge.
- `.progress` — 5px tall track, `background:#eef0f5`, radius 5, clipped.
- `.progress i` — filled portion; `width` = % complete, `background` = board color.

### 3.4 Timeline path

```html
<div class="path" data-sortable-wrap>
  <div class="path-head"><h2>Learn Web Dev</h2><span class="tag">— your path, top to bottom</span></div>
  <div data-sortable>
    <div class="step done">…</div>
    <div class="step">…</div>
  </div>
  <div class="add-step">+ Add a step to your path</div>
</div>
```

**Path header**

- `.path` — `position:relative; padding-left:8px`.
- `.path-head` — flex row, gap 12, `margin-bottom:18px`.
- `.path-head h2` — 20px title. `.tag` — 12px muted caption.

**Step (timeline row)** — the signature component

```css
.step{position:relative; padding-left:42px; padding-bottom:14px}

/* connector line running through the timeline */
.step::before{
  content:""; position:absolute; left:15px; top:26px; bottom:-4px;
  width:2px; background:var(--line);
}
.step:last-child::before{display:none}

/* node dot on the timeline */
.step .node{
  position:absolute; left:6px; top:14px; width:20px; height:20px;
  border-radius:50%; background:#fff; border:3px solid var(--accent); z-index:2;
}
.step.done .node{background:var(--accent)}   /* filled = completed */
```

- A vertical 2px `--line` track connects nodes; hidden on the last step.
- Node is a 20px ring in `--accent`; **`.done` fills it solid** to signal
  completion. Incomplete steps stay hollow (white center).

**Step card**

```css
.step .card{
  background:var(--panel); border:1px solid var(--line);
  border-radius:13px; padding:14px 16px; cursor:grab; transition:.12s;
}
.step .card:hover{box-shadow:0 12px 26px -18px rgba(20,24,60,.5)}
.step .card.dragging{opacity:.55; transform:rotate(-1deg) scale(1.01)}
```

Card internals:

- `.card .r` — flex row (gap 8) holding the drag grip + title.
- `.card .grip` — `⋮⋮`, color `#c4c8d4`, `cursor:grab`,
  `letter-spacing:-2px` (tightens the dots).
- `.card h5` — 14px title, `flex:1`.
- `.card p` — 12px muted description, `line-height:1.5`, `margin-top:5px`.
- `.card .foot` — flex row (gap 8) of mini pills, `margin-top:10px`.

**Mini pills (status / metadata chips)**

```css
.mini{font-size:10px; padding:3px 9px; border-radius:20px;
      background:#f0f1f7; color:#6b7280}
.mini.accent{background:#eef0ff; color:var(--accent)}
```

Usage: `✓ done` (accent), `in progress`, `next up`, and attachment/link
tags like `🔗 mdn`, `📎 pdf`, `📎 notes.md`.

### 3.5 Add-step affordance

```css
.add-step{
  margin-left:42px;                 /* aligns with card column, past the rail */
  border:2px dashed var(--line);
  border-radius:13px; padding:12px; text-align:center;
  color:var(--muted); font-size:13px; cursor:pointer;
}
```

Dashed placeholder inviting a new step at the end of the path.

### 3.6 Drop indicator (drag-to-reorder)

```css
.drop-line{
  height:2px; background:var(--accent); border-radius:2px;
  margin:0 0 14px 42px;              /* indented to align with cards */
  box-shadow:0 0 8px rgba(79,70,229,.4);
}
```

A glowing accent line shown between steps while dragging to preview the
drop position. The `42px` left margin keeps it aligned with the card
column (clearing the timeline rail).

---

## 4. Interaction Notes

- **Drag to re-sequence:** each `.step .card` is draggable
  (`cursor:grab` → `.dragging` applies `opacity:.55` + a slight
  `rotate(-1deg) scale(1.01)` tilt for a "picked up" feel).
- **Drop preview:** a `.drop-line` is inserted at the nearest gap under the
  cursor; on drop the step moves and the sequence re-renders.
- **Completion state:** toggling a step to done fills its timeline node and
  swaps its foot pill to the accent `✓ done` chip; the board's progress bar
  and "X of Y done" count reflect the ratio.
- **Selection:** the active board carries `.b-item.on` (inset accent outline).

---

## 5. Quick-start CSS scaffold

```css
:root{
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --mono: "SFMono-Regular", ui-monospace, Menlo, Consolas, monospace;
}

/* Flow theme scope */
.flow{
  --bg:#f7f8fb; --panel:#ffffff; --ink:#1a1d26;
  --muted:#737a89; --line:#eaecf2; --accent:#4f46e5;
  font-family:var(--font);
}

.flow .surface{
  background:var(--bg); color:var(--ink);
  border-radius:20px; padding:26px 28px;
  box-shadow:0 30px 60px -40px rgba(20,24,60,.5), inset 0 0 0 1px #eef0f5;
}

.flow .cols{display:grid; grid-template-columns:270px 1fr; gap:24px}

@media(max-width:900px){
  .flow .cols{grid-template-columns:1fr}
}
```
