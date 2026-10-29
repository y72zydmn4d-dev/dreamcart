# DreamCart — Product Blueprint (Starter Context)

Status: Initial project context, not the full master blueprint.

## 1. Product Vision

DreamCart is a complete virtual shopping experience.

Users discover real products, select actual variants,
add items to a cart, perform simulated checkout,
track virtual shipping, and receive products into
a personal virtual collection.

No real money is transferred.
No real orders are placed.
No physical products are delivered.

All simulation features must be clearly disclosed.

## 2. Product Value

- Entertainment through product discovery and selection
- Exploration of consumer shopping psychology
- A potential future environment for research

Psychological benefits are hypotheses, not established
outcomes for DreamCart.

## 3. Primary User Journey

Discover -> Configure -> Cart -> Virtual Checkout
-> Virtual Tracking -> Virtual Collection

## 4. MVP Must Have

- Responsive, polished web interface
- Verified internal product catalog
- Product search and details
- Accurate variant identification
- URL import with safe fallback
- Source URLs and reference prices
- Multi-source shopping cart
- Fully simulated checkout
- Virtual order creation and confirmation
- Fast and time-based shipping simulation
- Virtual delivery and collections
- Persistent data and order history
- Error, empty, and loading states

## 5. Product Discovery

Use a hybrid approach:

1. Internal curated catalog
2. Approved official provider integrations
3. URL import where legally and technically permitted
4. Manual metadata completion
5. External search redirects

Never assume unrestricted Shopee, Lazada, Amazon,
Apple, or eBay catalog access.

Never fabricate product identity, configuration,
prices, sources, or availability.

Maintain product, variant, offer, price snapshot,
and provenance as distinct concepts.

## 6. Technical Architecture

Frontend: Next.js, React, TypeScript
UI: Tailwind CSS, shadcn/ui
Database: Supabase PostgreSQL
Hosting: Vercel
Architecture: Modular Monolith

Domain modules:
- Product Catalog
- Product Discovery
- Product Import
- Cart
- Virtual Checkout
- Virtual Orders
- Shipping Simulation
- Virtual Collections

## 7. Shipping Simulation

Two modes:

Fast Simulation:
User advances through permitted states.

Time-Based Simulation:
Calculate order state from persisted timestamps.

Order states:
Confirmed -> Preparing -> Packed -> In Transit
-> Out for Delivery -> Virtually Delivered

No actual logistics integration.

## 8. Consumer Psychology

Research areas:
- Hedonic Shopping Motivation
- Retail Therapy
- Psychological Ownership
- Anticipatory Pleasure
- Online Shopping Cart Behavior
- Shopping Satisfaction

Do not assert therapeutic effectiveness.

Avoid manipulative scarcity, fake discounts,
compulsive engagement loops, and dark patterns.

## 9. MVP Exclusions

- Real payments
- Real order fulfillment
- Complex AI recommendations
- Native mobile applications
- Microservices and Kubernetes
- GPU infrastructure
- Unapproved paid APIs

## 10. Development Roadmap

Phase 0: Data and licensing feasibility
Phase 1: Architecture and UX specification
Phase 2: Catalog and search
Phase 3: Product pages and URL import
Phase 4: Cart and virtual checkout
Phase 5: Tracking and collections
Phase 6: Testing and security hardening
Phase 7: Public MVP

Do not begin a phase before its dependencies
and acceptance criteria are satisfied.
