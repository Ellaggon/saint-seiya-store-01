# UI_SOURCE_OF_TRUTH

This document is the absolute visual and interaction authority. It merges the high-end technical aesthetic of **Tamashii Nations** with the operational efficiency of **TodoSaintSeiya**.

---

# 1. Visual DNA & Palette (Premium Display)

The color palette simulates a luxury display case, emphasizing the product colors against a dark, technical background.

- **Primary Background:** `#000000` (Pure Black) - Total focus on the figures.
- **Secondary Background:** `#1A1A1A` (Dark Gray) - For cards, sections, and input fields.
- **Accent (Gold):** `#D4AF37` / Tailwind `amber-500`. Used for "Myth Cloth" branding, borders, and premium highlights.
- **Action (Red):** `#E60012` (Tamashii Red). Reserved for "NEW", "PRE-ORDER", and "OUT OF STOCK" badges.
- **Typography (Main):** `#FFFFFF` (White) - High contrast for legibility.
- **Typography (Meta):** `#A1A1AA` (Gray-400) - For technical specs and shipping info.

---

# 2. Design Patterns & UX Rules

### Geometry & Mechanical Feel

- **Corner Radius:** `0px` (Strictly sharp edges). Tamashii aesthetic is mechanical and precise; rounded corners are forbidden.
- **Borders:** Ultra-thin `1px` borders. Use Gray for standard and Gold for featured "Saints".
- **Shadows:** No soft shadows. Use solid borders or subtle inner glows.

### Performance & Interaction (Professional UX)

- **Hierarchy:** The primary action (e.g., "Add to Cart") must be visible within 3 seconds of page load.
- **Feedback:** Use **Skeleton Loaders** (dark themed) for product grids to simulate fast loading.
- **Latency:** All UI transitions, hovers, and feedback must occur in under 300ms.
- **Responsive:** Mobile-first approach. Navigation depth must not exceed 3 levels.

### Layout System

- Max container width: 1280px
- Section vertical spacing: 96px
- Grid gap: 24px
- Internal card padding: 16px

---

# 3. Component Standards (The "Sanctuary" Catalog)

- **Product Cards:**
  - Aspect Ratio: Strictly `1:1` (Square) for figure images.
  - Border: Thin border that changes to Gold on hover.
  - Hover Effect: Subtle scaling (`scale-105`) + brightness increase to simulate a "spotlight".
- **Navigation:**
  - Top sticky bar with clean, minimalist icons (Lucide/Phosphor).
  - Categorization by "Line" (EX, Myth Cloth, Vintage) and "Character".
- **Typography:**
  - Headings: Bold, All-Caps (e.g., "GEMINI SAGA GOLD SAINT").
  - Body: Clean Sans-serif (Inter or Roboto) for technical details and lore.

---

# 4. Tech Stack & Implementation

- **Framework:** Tailwind CSS (Core styling).
- **Custom CSS:** `src/ui/styles/global.css` (For metallic gradients and custom dark scrollbars).
- **Paths:**
  - Components: `src/ui/components/{module}/`
  - Layouts: `src/ui/layouts/`
  - Pages: `src/ui/pages/{module}/`

---

# 5. UI Enforcement Rules

1. **NO ROUNDED BUTTONS:** Any use of `rounded-md` or similar is a direct violation.
2. **NO PASTEL COLORS:** The palette must remain technical, dark, and high-contrast.
3. **COLLECTOR BORDERS:** Every product image must have a subtle 1px border to simulate its original packaging box.
4. **SHIPPING VISIBILITY:** Order status and shipping tracking must be highlighted in the User Area using technical, minimalist badges.
