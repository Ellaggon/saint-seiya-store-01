type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  meta: string;
};

const formatMoney = (amount: number): string => {
  const value = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `Bs ${formatted}`;
};

const formatDisplayDate = (value: string): string => {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const calculateDeposit = (price: number, type: string, value: number): number => {
  if (type === "FULL") return price;
  if (type === "FIXED") return Math.min(value, price);
  return Math.min(price * (value / 100), price);
};

const serializeForm = (form: HTMLFormElement): string => {
  const data = new FormData(form);
  return [...data.entries()]
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");
};

const readCatalog = (): CatalogProduct[] => {
  const node = document.getElementById("preorder-product-catalog");
  if (!node?.textContent) return [];
  try {
    const parsed: unknown = JSON.parse(node.textContent);
    return Array.isArray(parsed) ? (parsed as CatalogProduct[]) : [];
  } catch {
    return [];
  }
};

const bootAdminPreorderFicha = () => {
  const form = document.getElementById("preorder-campaign-form");
  if (!(form instanceof HTMLFormElement)) return;
  if (form.dataset.bound === "1") return;
  form.dataset.bound = "1";

  const isEditing = form.dataset.editing === "true";
  const reserved = Number(form.dataset.reserved ?? 0);
  const depositLocked = form.dataset.depositLocked === "true";
  let snapshot = serializeForm(form);

  const productIdInput = document.getElementById("productId") as HTMLInputElement | null;
  const statusInput = document.getElementById("status") as HTMLInputElement | null;
  const slotsInput = document.getElementById("totalSlots") as HTMLInputElement | null;
  const depositValueInput = document.getElementById("depositValue") as HTMLInputElement | null;
  const depositPanel = document.getElementById("depositValuePanel");
  const depositLabel = document.getElementById("depositValueLabel");
  const depositPrefix = document.getElementById("depositValuePrefix");
  const depositSuffix = document.getElementById("depositValueSuffix");
  const depositLive = document.querySelector("[data-deposit-live]");
  const opensAt = document.getElementById("opensAt") as HTMLInputElement | null;
  const closesAt = document.getElementById("closesAt") as HTMLInputElement | null;
  const etaLabelInput = document.getElementById("etaLabel") as HTMLInputElement | null;
  const etaStart = document.getElementById("etaStart") as HTMLInputElement | null;
  const etaEnd = document.getElementById("etaEnd") as HTMLInputElement | null;
  const windowPhrase = document.querySelector("[data-window-phrase]");
  const searchInput = document.getElementById("product-search") as HTMLInputElement | null;
  const results = document.getElementById("product-results");
  const receiptDialog = document.querySelector("[data-receipt-dialog]");
  const toast = document.getElementById("preorder-toast");

  const getDepositType = (): string => {
    const checked = form.querySelector<HTMLInputElement>(
      'input[name="depositType"]:checked',
    );
    const hidden = form.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="depositType"]',
    );
    return checked?.value ?? hidden?.value ?? "PERCENT";
  };

  const getPrice = (): number => Number(form.dataset.productPrice ?? 0);

  const setAll = (selector: string, text: string) => {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = text;
    });
  };

  const setDirty = (dirty: boolean) => {
    form.dataset.dirty = dirty ? "true" : "false";
  };

  const syncDirty = () => {
    setDirty(serializeForm(form) !== snapshot);
  };

  const syncDepositUi = () => {
    const type = getDepositType();
    form.querySelectorAll(".preorder-choice").forEach((choice) => {
      const input = choice.querySelector<HTMLInputElement>('input[name="depositType"]');
      choice.classList.toggle("is-selected", input?.value === type);
    });

    if (!depositValueInput || !depositPanel || !depositLabel) return;

    if (type === "FULL") {
      depositPanel.classList.add("hidden");
      if (!depositLocked) {
        depositValueInput.value = "0";
        depositValueInput.readOnly = true;
        depositValueInput.required = false;
      }
      return;
    }

    depositPanel.classList.remove("hidden");
    depositValueInput.required = !depositLocked;
    if (!depositLocked) depositValueInput.readOnly = false;
    depositPrefix?.classList.toggle("hidden", type !== "FIXED");
    depositSuffix?.classList.toggle("hidden", type !== "PERCENT");
    depositLabel.textContent =
      type === "FIXED" ? "Monto de abono" : "Porcentaje de abono";
  };

  const windowState = (): { text: string; tone: string; receipt: string } => {
    const opens = opensAt?.value ?? "";
    const closes = closesAt?.value ?? "";
    if (!opens && !closes) {
      return {
        text: "Abierta todo el tiempo que esté en vitrina.",
        tone: "muted",
        receipt: "Mientras esté en vitrina.",
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const openDate = opens ? new Date(`${opens}T00:00:00`) : null;
    const closeDate = closes ? new Date(`${closes}T00:00:00`) : null;
    if (openDate && today < openDate) {
      return {
        text: `Todavía no acepta reservas. Abre el ${formatDisplayDate(opens)}.`,
        tone: "muted",
        receipt: `Se puede reservar ${formatDisplayDate(opens)} – ${formatDisplayDate(closes) || "—"}`,
      };
    }
    if (closeDate && today > closeDate) {
      return {
        text: "Ya no acepta reservas nuevas.",
        tone: "danger",
        receipt: `Se puede reservar ${formatDisplayDate(opens) || "—"} – ${formatDisplayDate(closes)}`,
      };
    }
    if (closeDate) {
      const days = Math.max(
        1,
        Math.ceil((closeDate.getTime() - today.getTime()) / 86_400_000),
      );
      return {
        text: `Abierta. Cierra en ${days} ${days === 1 ? "día" : "días"}.`,
        tone: "live",
        receipt: `Se puede reservar ${formatDisplayDate(opens) || "—"} – ${formatDisplayDate(closes)}`,
      };
    }
    return {
      text: "Abierta mientras esté en vitrina.",
      tone: "live",
      receipt: `Se puede reservar ${formatDisplayDate(opens)} – —`,
    };
  };

  const syncPreview = () => {
    const price = getPrice();
    const type = getDepositType();
    const rawValue = Number(depositValueInput?.value ?? 0);
    const value = Number.isFinite(rawValue) ? rawValue : 0;
    const deposit = calculateDeposit(price, type, value);
    const balance = Math.max(price - deposit, 0);
    const slots = Number(slotsInput?.value ?? 0);
    const eta = etaLabelInput?.value.trim() || "Sin informar";
    const rangeStart = etaStart?.value ?? "";
    const rangeEnd = etaEnd?.value ?? "";
    const window = windowState();

    setAll("[data-receipt-hoy]", formatMoney(deposit));
    setAll(
      "[data-receipt-despues]",
      type === "FULL" || balance <= 0
        ? "Pagan el total hoy. No queda saldo."
        : `Después ${formatMoney(balance)}, cuando llegue a tienda`,
    );
    setAll("[data-receipt-eta]", eta);
    document.querySelectorAll("[data-receipt-eta-range]").forEach((node) => {
      if (rangeStart || rangeEnd) {
        node.textContent = `Ventana ${formatDisplayDate(rangeStart) || "—"} – ${formatDisplayDate(rangeEnd) || "—"}`;
        node.classList.remove("hidden");
      } else {
        node.textContent = "";
        node.classList.add("hidden");
      }
    });
    setAll("[data-receipt-window]", window.receipt);
    setAll(
      "[data-receipt-slots]",
      reserved > 0
        ? `${Number.isFinite(slots) ? slots : 0} unidades · ${reserved} ya tomadas`
        : `${Number.isFinite(slots) && slots > 0 ? slots : 0} unidades`,
    );

    if (depositLive instanceof HTMLElement) {
      depositLive.textContent =
        type === "FULL"
          ? `Pagan ${formatMoney(price)} ahora. No queda saldo.`
          : `Hoy ${formatMoney(deposit)} · después ${formatMoney(balance)}`;
    }

    if (windowPhrase instanceof HTMLElement) {
      windowPhrase.textContent = window.text;
      windowPhrase.classList.remove("text-[#4ADE80]", "text-[#F87171]", "text-[#71717A]");
      windowPhrase.classList.add(
        window.tone === "live"
          ? "text-[#4ADE80]"
          : window.tone === "danger"
            ? "text-[#F87171]"
            : "text-[#71717A]",
      );
    }

    const occupancyLabel =
      reserved === 0
        ? "Nadie ha reservado todavía"
        : `${reserved} de ${Number.isFinite(slots) ? slots : 0} reservadas`;
    setAll("[data-hero-occupancy]", occupancyLabel);
    setAll(
      "[data-hero-occupancy-total]",
      `${Number.isFinite(slots) && slots > 0 ? slots : 0} unidades`,
    );
    const bar = document.querySelector("[data-hero-occupancy-bar]");
    if (bar instanceof HTMLElement) {
      const percent =
        Number.isFinite(slots) && slots > 0
          ? Math.min(100, (reserved / slots) * 100)
          : 0;
      bar.style.width = `${percent}%`;
    }

    const stripEta =
      eta === "Sin informar" ? "" : eta.replace(/^Llegada estimada /i, "");
    const stripSlots = Number.isFinite(slots) && slots > 0 ? `${slots} cupos` : "Sin cupos";
    setAll(
      "[data-receipt-strip]",
      [`Hoy ${formatMoney(deposit)}`, stripEta, stripSlots].filter(Boolean).join(" · "),
    );
  };

  const syncAll = () => {
    syncDepositUi();
    syncPreview();
    syncDirty();
  };

  const applyProduct = (product: CatalogProduct) => {
    if (productIdInput) productIdInput.value = product.id;
    form.dataset.productPrice = String(product.price);
    form.dataset.productName = product.name;
    form.dataset.productImage = product.imageUrl;
    setAll("[data-hero-title]", product.name);
    setAll("[data-hero-meta]", product.meta || "Figura de catálogo");
    setAll("[data-hero-price]", formatMoney(product.price));
    setAll("[data-receipt-name]", product.name);
    setAll("[data-receipt-price]", formatMoney(product.price));
    document.querySelector("[data-hero-price]")?.classList.remove("hidden");

    const photo = document.querySelector("[data-hero-photo]");
    if (photo instanceof HTMLElement) {
      let image = photo.querySelector("img");
      if (product.imageUrl) {
        if (!(image instanceof HTMLImageElement)) {
          image = document.createElement("img");
          image.alt = "";
          image.className = "h-full w-full object-cover";
          photo.replaceChildren(image);
        }
        image.src = product.imageUrl;
      } else {
        photo.replaceChildren();
      }
    }

    document.querySelectorAll("[data-receipt-photo]").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (!product.imageUrl) {
        node.replaceChildren();
        return;
      }
      let image = node.querySelector("img");
      if (!(image instanceof HTMLImageElement)) {
        image = document.createElement("img");
        image.alt = "";
        image.className = "h-full w-full object-cover";
        node.replaceChildren(image);
      }
      image.src = product.imageUrl;
    });

    if (searchInput) searchInput.value = product.name;
    results?.setAttribute("hidden", "");
    document.querySelector("[data-product-error]")?.classList.add("hidden");
    syncAll();
  };

  const renderResults = (query: string) => {
    if (!results) return;
    const catalog = readCatalog();
    const normalized = query.trim().toLowerCase();
    const matches = catalog
      .filter((item) => item.name.toLowerCase().includes(normalized))
      .slice(0, 8);
    results.replaceChildren();
    if (!normalized || matches.length === 0) {
      results.hidden = true;
      return;
    }
    matches.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      const thumb = document.createElement("span");
      thumb.className =
        "h-10 w-8 shrink-0 overflow-hidden rounded-md border border-[#18181B] bg-[#09090B]";
      if (item.imageUrl) {
        const img = document.createElement("img");
        img.src = item.imageUrl;
        img.alt = "";
        img.className = "h-full w-full object-cover";
        thumb.append(img);
      }
      const copy = document.createElement("span");
      copy.className = "min-w-0";
      const name = document.createElement("span");
      name.className = "block truncate text-[13px] text-[#FAFAFA]";
      name.textContent = item.name;
      const price = document.createElement("span");
      price.className = "block text-[12px] text-[#71717A]";
      price.textContent = formatMoney(item.price);
      copy.append(name, price);
      button.append(thumb, copy);
      button.addEventListener("click", () => applyProduct(item));
      results.append(button);
    });
    results.hidden = false;
  };

  searchInput?.addEventListener("input", () => {
    renderResults(searchInput.value);
  });
  searchInput?.addEventListener("focus", () => {
    if (searchInput.value.trim().length >= 1) renderResults(searchInput.value);
  });
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (searchInput?.contains(target) || results?.contains(target)) return;
    results?.setAttribute("hidden", "");
  });

  form.querySelectorAll<HTMLButtonElement>("[data-status]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.status;
      if (!next || !statusInput) return;
      statusInput.value = next;
      form.querySelectorAll<HTMLButtonElement>(".preorder-segment [data-status]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item.dataset.status === next));
      });
      const more = button.closest("details");
      if (more instanceof HTMLDetailsElement) more.open = false;
      syncDirty();
    });
  });

  document.querySelector("[data-receipt-open]")?.addEventListener("click", () => {
    if (receiptDialog instanceof HTMLDialogElement) receiptDialog.showModal();
  });
  document.querySelector("[data-receipt-close]")?.addEventListener("click", () => {
    if (receiptDialog instanceof HTMLDialogElement) receiptDialog.close();
  });

  document.querySelectorAll("[data-discard]").forEach((node) => {
    node.addEventListener("click", () => {
      form.reset();
      snapshot = serializeForm(form);
      syncDepositUi();
      syncPreview();
      setDirty(!isEditing);
    });
  });

  form.addEventListener("input", syncAll);
  form.addEventListener("change", syncAll);

  form.addEventListener("submit", (event) => {
    if (!isEditing && !productIdInput?.value) {
      event.preventDefault();
      document.querySelector("[data-product-error]")?.classList.remove("hidden");
      searchInput?.focus();
      return;
    }
    document.querySelectorAll<HTMLButtonElement>("[data-save]").forEach((button) => {
      button.disabled = true;
    });
  });

  const savedUrl = new URL(window.location.href);
  if (savedUrl.searchParams.get("saved") === "1") {
    toast?.classList.remove("hidden");
    savedUrl.searchParams.delete("saved");
    window.history.replaceState({}, "", `${savedUrl.pathname}${savedUrl.search}`);
    window.setTimeout(() => toast?.classList.add("hidden"), 2800);
  }

  syncDepositUi();
  syncPreview();
  snapshot = serializeForm(form);
  setDirty(!isEditing);
};

bootAdminPreorderFicha();
document.addEventListener("astro:page-load", bootAdminPreorderFicha);
