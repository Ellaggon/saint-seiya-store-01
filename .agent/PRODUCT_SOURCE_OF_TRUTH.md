# 1. Mission & Vision (The Sanctuary)

Build the ultimate digital sanctuary for Saint Seiya collectors. Focused on premium presentation (Tamashii style), high-end catalog browsing, and reliable global shipping management.

---

# 2. Core Modules

## Users

**Entity:** `User`  
**Capabilities:**

- Customer profile & Admin management.
- Address book for shipping (essential for global deliveries).
- _Note: Authentication is an infrastructure concern._

## Catalog (The Sanctuary)

**Entities:** `Product`, `Category`, `Character`, `ProductCharacter`  
**Capabilities:**

- Manage Saint Seiya lines (Classic, EX, Myth Cloth, Vintage).
- Advanced filtering by Character (e.g., Saga, Shaka) and Saga (e.g., Sanctuary, Hades).
- Technical specs display: Height, Material, Brand, and Release Date.

## Orders & Shipping

**Entities:** `Order`, `OrderItem`  
**Capabilities:**

- Checkout flow and order creation.
- Shipping management with real-time status (Pending -> Shipped -> Delivered).
- Integration of Tracking IDs for customer peace of mind.

## Inventory & Reservations

**Entities:** `Inventory`, `Reservation`  
**Capabilities:**

- Real-time stock tracking by warehouse location.
- Pre-order system (Reservations) for upcoming Tamashii Nations releases.
- **Depends on:** Users, Catalog.

---

# 3. Domain Model (Technical Specs)

## User

- **id** (uuid): Unique identifier.
- **name** (string): Full name.
- **email** (string): Identification email.
- **address** (string): Default shipping address.
- **role** (string): admin | customer.
- **status** (string): active | suspended.

## Product

- **id** (uuid): Unique identifier.
- **name** (string): e.g., "Gemini Saga Gold Saint".
- **description** (text): Detailed lore and figure specs.
- **price** (decimal): Unit price in USD/EUR.
- **categoryId** (uuid): Refers to the Line (e.g., Myth Cloth EX).
- **height** (decimal): Figure height in cm (Tamashii spec).
- **imageUrl** (string): Main product asset.
- **stock** (integer): Available units.
- **status** (string): draft | published | pre_order | out_of_stock.

## Category (Line)

- **id** (uuid).
- **name** (string): e.g., "Myth Cloth EX", "Soul of Gold", "Vintage 80s".

## Character

- **id** (uuid).
- **name** (string): e.g., "Pegasus Seiya", "Virgo Shaka".

## Order

- **id** (uuid).
- **userId** (uuid).
- **status** (string): pending | paid | shipped | delivered | canceled.
- **totalAmount** (decimal): Final transaction price.
- **shippingTrackerId** (string): Tracking number for the courier.
- **createdAt** (datetime).

## OrderItem

- **id** (uuid).
- **orderId** (uuid).
- **productId** (uuid).
- **quantity** (integer).
- **price** (decimal): Captured price at time of sale (historical).

## Inventory

- **id** (uuid).
- **productId** (uuid).
- **quantity** (integer): Physical units in warehouse.
- **location** (string): Specific shelf/bin (e.g., "A-12-Sanctuary").

---

# 4. MVP Scope

**Included in MVP:**

- Full User CRUD & Address management.
- Enhanced Catalog (Lines, Characters, and Figure Specs).
- Order creation & Shipping status tracking.
- Basic Inventory & Reservation (Pre-order) flow.

**Explicitly Excluded:**

- Multi-currency auto-conversion.
- Auction system or second-hand marketplace.
- Community forums or user reviews.

---

# 5. Dependency & Evolution Rules

1. **Orders** depends on **Users** and **Catalog**.
2. **Inventory** depends on **Catalog**.
3. All implementation must follow the **AUTO_EXECUTION_PIPELINE**.
4. Any change in logic must update this document FIRST.
