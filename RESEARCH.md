# Product notes

Research checked on 13 October 2026 against official product documentation.

## Patterns worth carrying into a restaurant inventory tool

### Ingredient-aware recipes

Square's restaurant inventory documentation describes ingredient tracking, menu costing, purchase orders and analytics alongside POS. Its recipes guide explains that ingredients can be connected to menu items and that selling a menu item deducts ingredient stock while rolling cost into COGS and margin calculations. This supports the core Mise demo flow: sell a menu item, create an invoice and record recipe ingredient movements together.

### Supplier orders with explicit receipt

Square's purchase order flow captures supplier, delivery location, expected date and line items, and supports receiving inventory against the order. Mise models supplier, expected delivery, product and quantity. It only changes on-hand stock when the order is received.

### Perishable goods and traceability

Odoo's inventory docs describe expiry information attached to lots and FEFO (first expired, first out) removal. Mise currently displays seeded expiry examples, but does not claim to track received lots. Lot-level dates, traceability and FEFO allocation are called out as production roadmap work.

## Sources

- [Square Recipes](https://squareup.com/help/us/en/article/8629-beta-track-ingredient-costs-with-square-recipes)
- [Square Restaurant Inventory](https://squareup.com/help/us/en/article/8610-manage-ingredient-inventory-with-square-restaurant-inventory)
- [Square purchase orders](https://squareup.com/help/us/en/article/8258-create-purchase-orders-with-square-for-retail)
- [Odoo expiration dates](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/product_tracking/expiration_dates.html)
- [Odoo FEFO strategy](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/shipping_receiving/removal_strategies/fefo.html)
