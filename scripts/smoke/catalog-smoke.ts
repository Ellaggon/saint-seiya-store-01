type SmokeCase = {
  name: string;
  path: string;
  validate: (response: Response, body: string) => void;
};

export {};

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:4322";

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const expectHtml = (marker: string) => (response: Response, body: string) => {
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(
    response.headers.get("content-type")?.includes("text/html"),
    "expected text/html response",
  );
  assert(body.includes(marker), `expected HTML marker ${marker}`);
};

const expectCatalogJson = (response: Response, body: string) => {
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(
    response.headers.get("content-type")?.includes("application/json"),
    "expected application/json response",
  );
  const payload = JSON.parse(body) as {
    items?: unknown;
    pagination?: { page?: unknown; totalPages?: unknown };
    sort?: unknown;
  };
  assert(Array.isArray(payload.items), "expected raw catalog items array");
  assert(payload.pagination, "expected pagination object");
  assert(payload.sort, "expected sort value");
};

const cases: SmokeCase[] = [
  {
    name: "catalog index",
    path: "/catalog",
    validate: expectHtml("catalog-marketplace"),
  },
  {
    name: "catalog page 2",
    path: "/catalog?page=2",
    validate: expectHtml("catalog-marketplace"),
  },
  {
    name: "catalog sorted page 2",
    path: "/catalog?sort=price-asc&page=2",
    validate: expectHtml("catalog-marketplace"),
  },
  {
    name: "catalog partial page 2",
    path: "/catalog/partials/products?page=2",
    validate: expectHtml("catalog-grid-container"),
  },
  {
    name: "catalog products api page 2",
    path: "/api/catalog/products?page=2",
    validate: expectCatalogJson,
  },
  {
    name: "preorders index",
    path: "/preorders",
    validate: expectHtml("preorders"),
  },
];

let failures = 0;

for (const smokeCase of cases) {
  const url = new URL(smokeCase.path, baseUrl);

  try {
    const response = await fetch(url);
    const body = await response.text();
    smokeCase.validate(response, body);
    console.log(`[smoke:catalog] ok ${smokeCase.name}`);
  } catch (error) {
    failures++;
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[smoke:catalog] failed ${smokeCase.name}: ${message}`);
  }
}

if (failures > 0) {
  process.exitCode = 1;
}
