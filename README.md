# Mise

**Restaurant inventory and point of sale, in good order.**

Mise is an open source starter for independent restaurants. It brings ingredient stock, simple purchasing, point of sale, invoices and stock movement history into one small web app.

> This is an interactive front-end prototype. It stores sample workspace data in the current browser only. It has no server, accounts, payment processor, backups or production security controls.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The sample workspace uses Ghana cedis (GHS); change `CURRENCY` in `src/data.ts` to try a different currency. Use **Reset sample data** in the sidebar to restore the initial ingredients and transactions in this browser.

## What is here

- **Overview:** sales recorded today, inventory value, reorder alerts, recent movements and invoices.
- **Inventory:** searchable ingredient and supply list, category filters, stock counts, reorder points, unit costs, supplier names and CSV export.
- **Point of sale:** menu checkout, customer and payment method capture, invoice creation and recipe-based ingredient deductions. A sale is blocked if the recipe would use more stock than is available.
- **Purchases:** create a supplier order, then receive it to update on-hand stock and add an audit movement.
- **Invoices:** view a transaction record, inspect line items, print an invoice or export the list as CSV.
- **Reports:** inventory valuation, paid sales for the last seven days, category value and an expiry watch for the sample lot dates.
- **Local persistence:** changes are saved in browser `localStorage`; no data leaves the device.

## Product direction

This repository is a starting point rather than a finished point-of-sale product. Useful next steps for a production release:

1. Add a server API, relational database, migrations, authentication and role-based permissions.
2. Make recipes, menus, suppliers, taxes, payment methods and locations configurable in the app.
3. Record received stock by lot with best-before dates, traceability and first-expiry-first-out picking.
4. Add waste reasons, stock counts with approval, transfers between locations and a full append-only movement ledger.
5. Add invoice numbering and tax rules for the operator’s jurisdiction, plus payment and accounting integrations.
6. Add automated tests, data import/export mapping, backups and offline-safe synchronization before real operations.

The demo has a single location and seeded menu. Sample expiry values are product-level examples, not batch traceability. Do not use this prototype to process real payments or as the authoritative record for a live business.

## Why these workflows

Restaurant inventory differs from a simple retail count: a menu sale can consume several ingredients at once. Mise connects each sample menu item to a recipe so checkout records the sale and reduces its ingredient quantities together. Purchase orders move through an explicit receive step so ordered stock does not appear on hand until the delivery is recorded. Stock adjustments, purchases and sales appear in one movement history.

These choices follow patterns in current product documentation: Square describes ingredient tracking, recipe-based food cost and purchase orders connected to vendors and receipts; Odoo documents expiry tracking by lot and first-expired-first-out stock handling. Those are useful reference workflows, not endorsements or requirements for the implementation.

## Research references

- [Square: Track ingredient costs with Square Recipes](https://squareup.com/help/us/en/article/8629-beta-track-ingredient-costs-with-square-recipes)
- [Square: Manage ingredient inventory with Square Restaurant Inventory](https://squareup.com/help/us/en/article/8610-manage-ingredient-inventory-with-square-restaurant-inventory)
- [Square: Create and manage purchase orders](https://squareup.com/help/us/en/article/8258-create-purchase-orders-with-square-for-retail)
- [Odoo 19: Expiration dates](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/product_tracking/expiration_dates.html)
- [Odoo 19: FEFO removal strategy](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/shipping_receiving/removal_strategies/fefo.html)

## License

MIT. See [LICENSE](./LICENSE).
