# Architecture Source Of Truth

## Legacy Boundaries

`Reservation` is the legacy inventory reservation model. It must not be used for preorder or pre-sale flows. Modern preorder flows must use `PreorderReservation` through the preorder domain, application use cases, and infrastructure repository.

`Product.status = PRE_ORDER` may remain as a visual or commercial badge for catalog/product presentation. It is not the operational source of truth for preorder availability.

Operational preorder availability belongs to the preorder subdomain: `PreorderCampaign`, `PreorderReservation`, and derived backend DTOs. UI, pages, and components must not infer preorder capacity from `Product.stock` or from `Product.status`.

Legacy models may coexist temporarily for compatibility, but they must not receive new preorder features.
