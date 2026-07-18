# PulseOps AI - Design System (CRED Brand Kit)

## Visual Philosophy
The design adopts the **CRED** aesthetic: premium dark mode, pitch-black canvases, hairline borders, golden accents, and vibrant neon feedback. We eliminate generic rounded edges, shadows, and spacing in favor of:
- High typographic contrast.
- Snappy UI tab switching.
- Gold/Copper highlights (`#E5C384`) representing luxury engineering tools.
- Flat border wrappers (`#222222`) that separate components.

---

## Design Tokens

### Color Scheme
- **Backdrop Canvas**: `#060606` (Pitch Black)
- **Component Surface**: `#121212` (Rich Charcoal Slate)
- **Hairline Borders**: `#222222` (Very dark gray)
- **Primary Gilded Accent**: `#E5C384` (Gold/Bronze)
- **Success Indicators**: `#00FF66` (Neon green)
- **Warning Indicators**: `#FFAA00` (Neon orange)
- **Danger Alerts**: `#FF3333` (Neon red)
- **Text Main**: `#FFFFFF` (White)
- **Text Sub**: `#8E8E8E` (Muted gray)

### Typography
- **Hero Title**: `16px` (Font-weight: 700)
- **Sub-headings**: `11px` (Font-weight: 700, Text-transform: uppercase)
- **Body Content**: `12px` (Font-weight: 400, line-height: 1.5)
- **Telemetry Console logs**: `11px` (Monospace, Courier/Lucida Console)

### Spacing System
All margins and padding are strictly aligned:
- **Small**: `8px`
- **Medium**: `12px`
- **Large / Padding**: `16px`
- **Block Gaps**: `20px` / `24px`

---

## UI Snappiness
To optimize performance:
- View toggles are bound to `.app-view` elements which use CSS display rules (`display: none` / `display: flex`).
- Avoided costly filter overlays or background reflows. Transition times are locked to `100ms` or instant swaps, giving a fast user interface.
