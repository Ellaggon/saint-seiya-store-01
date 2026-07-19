/**
 * Catalog Filters Client-Side Enhancement
 * Adds partial HTML navigation on top of the SSR catalog.
 */

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

class CatalogFilters {
  private static readonly sidebarStorageKey = "catalogSidebarCollapsed";
  private gridContainer: HTMLElement | null = null;
  private paginationContainer: HTMLElement | null = null;
  private toolbarCount: HTMLElement | null = null;
  private sortSelect: HTMLSelectElement | null = null;
  private searchForm: HTMLFormElement | null = null;
  private marketplace: HTMLElement | null = null;
  private sidebarToggle: HTMLButtonElement | null = null;
  private currentUrl: string = window.location.href;
  private abortController: AbortController | null = null;

  constructor() {
    this.init();
  }

  private track(eventName: string, payload: Record<string, unknown> = {}) {
    const eventPayload = {
      event: eventName,
      ...payload,
    };

    window.dispatchEvent(
      new CustomEvent("commerce:conversion", { detail: eventPayload }),
    );
    (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push(eventPayload);
  }

  private init() {
    this.gridContainer = document.getElementById("catalog-grid-container");
    this.paginationContainer = document.getElementById(
      "catalog-pagination-container",
    );
    this.toolbarCount = document.getElementById("catalog-result-count");
    this.sortSelect = document.getElementById(
      "catalog-sort-select",
    ) as HTMLSelectElement | null;
    this.searchForm = document.getElementById(
      "catalog-search-form",
    ) as HTMLFormElement | null;
    this.marketplace = document.getElementById("catalog-marketplace");
    this.sidebarToggle = document.getElementById(
      "catalog-sidebar-toggle",
    ) as HTMLButtonElement | null;

    if (!this.gridContainer) return;

    this.initSidebarToggle();

    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      
      const link = target.closest("a[data-filter-link]");

      if (link && link instanceof HTMLAnchorElement) {
        e.preventDefault();
        const url = new URL(link.href);
        if (!link.hasAttribute("data-page-link")) {
          url.searchParams.delete("page");
        }
        this.applyFilters(url);
      }
    });

    window.addEventListener("popstate", () => {
      this.applyFilters(new URL(window.location.href), false);
    });

    this.sortSelect?.addEventListener("change", () => {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("sort", this.sortSelect?.value || "created-desc");
      nextUrl.searchParams.delete("page");
      this.track("catalog_sort_change", {
        sort: this.sortSelect?.value || "created-desc",
      });
      this.applyFilters(nextUrl);
    });

    this.searchForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const nextUrl = new URL(window.location.href);
      const formData = new FormData(this.searchForm as HTMLFormElement);
      const query = String(formData.get("q") || "").trim();

      if (query) {
        nextUrl.searchParams.set("q", query);
      } else {
        nextUrl.searchParams.delete("q");
      }

      nextUrl.searchParams.delete("page");
      this.track("catalog_search_submit", { query });
      this.applyFilters(nextUrl);
    });

    document.addEventListener("submit", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLFormElement)) return;
      if (!target.matches("[data-catalog-filter-form]")) return;

      e.preventDefault();
      const nextUrl = new URL(window.location.href);
      const formData = new FormData(target);
      const managedFields = [
        "minPrice",
        "maxPrice",
        "showSoldOut",
        "openPreorders",
      ];

      managedFields.forEach((field) => nextUrl.searchParams.delete(field));
      formData.forEach((value, key) => {
        const normalized = String(value).trim();
        if (normalized) {
          nextUrl.searchParams.set(key, normalized);
        }
      });

      nextUrl.searchParams.delete("page");
      this.track("catalog_filter_submit", {
        minPrice: nextUrl.searchParams.get("minPrice"),
        maxPrice: nextUrl.searchParams.get("maxPrice"),
        showSoldOut: nextUrl.searchParams.get("showSoldOut") === "true",
        openPreorders: nextUrl.searchParams.get("openPreorders") === "true",
      });
      this.applyFilters(nextUrl);
    });
  }

  private initSidebarToggle() {
    if (!this.marketplace || !this.sidebarToggle) return;

    const storedValue = this.getStoredSidebarState();
    const isCollapsed = storedValue === "true";
    this.setSidebarCollapsed(isCollapsed);

    this.sidebarToggle.addEventListener("click", () => {
      const nextValue =
        this.marketplace?.dataset.sidebarCollapsed !== "true";
      this.setSidebarCollapsed(nextValue);
      this.storeSidebarState(nextValue);
    });
  }

  private getStoredSidebarState(): string | null {
    try {
      return window.localStorage.getItem(CatalogFilters.sidebarStorageKey);
    } catch {
      return null;
    }
  }

  private storeSidebarState(isCollapsed: boolean) {
    try {
      window.localStorage.setItem(
        CatalogFilters.sidebarStorageKey,
        String(isCollapsed),
      );
    } catch {
      // The toggle still works for the current page if storage is unavailable.
    }
  }

  private setSidebarCollapsed(isCollapsed: boolean) {
    if (!this.marketplace || !this.sidebarToggle) return;

    this.marketplace.dataset.sidebarCollapsed = String(isCollapsed);
    this.sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
    const label = isCollapsed ? "Mostrar filtros" : "Ocultar filtros";
    const visibleLabel = this.sidebarToggle.querySelector(
      "[data-sidebar-toggle-label]",
    );
    this.sidebarToggle.setAttribute("aria-label", label);
    this.sidebarToggle.setAttribute("title", label);
    if (visibleLabel) {
      visibleLabel.textContent = isCollapsed ? "Mostrar" : "Filtros";
    }
  }

  private async fetchPartialHtml(
    url: URL,
    signal?: AbortSignal,
  ): Promise<string> {
    const apiUrl = new URL("/catalog/partials/products", window.location.origin);
    url.searchParams.forEach((val, key) =>
      apiUrl.searchParams.append(key, val),
    );

    const response = await fetch(apiUrl, { signal });
    if (!response.ok) throw new Error("Failed to load catalog partial");
    return response.text();
  }

  private async applyFilters(url: URL, updateHistory = true) {
    if (url.href === this.currentUrl && updateHistory) return;

    this.abortController?.abort();
    this.abortController = new AbortController();

    const skeletonTimer = setTimeout(() => {
      this.showLoading();
    }, 120);

    try {
      const partialHtml = await this.fetchPartialHtml(
        url,
        this.abortController.signal,
      );

      clearTimeout(skeletonTimer);
      this.updateUIFromPartial(partialHtml, url, updateHistory);
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return;
      }
      
      clearTimeout(skeletonTimer);
      this.renderError();
    }
  }

  private updateUIFromPartial(partialHtml: string, url: URL, updateHistory: boolean) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(partialHtml, "text/html");
    const nextGrid = doc.getElementById("catalog-grid-container");
    const nextPagination = doc.getElementById("catalog-pagination-container");
    const nextCount = doc.getElementById("catalog-result-count-partial");

    if (nextGrid && this.gridContainer) {
      this.gridContainer.replaceWith(nextGrid);
      this.gridContainer = nextGrid;
    }
    if (nextPagination && this.paginationContainer) {
      this.paginationContainer.replaceWith(nextPagination);
      this.paginationContainer = nextPagination;
      this.toolbarCount = document.getElementById("catalog-result-count");
    }
    if (nextCount && this.toolbarCount) {
      this.toolbarCount.textContent = nextCount.textContent || "0";
    }

    this.updateFilterActiveStates(url);
    this.updateCategoryActive(url);
    this.updateCategoryHero(url);

    if (updateHistory) {
      window.history.pushState({}, "", url.href);
    }
    if (this.sortSelect) {
      this.sortSelect.value = url.searchParams.get("sort") || "created-desc";
    }
    this.syncFormControls(url);

    this.currentUrl = url.href;

    // Scroll to top of catalog section on mobile
    if (window.innerWidth < 1024) {
      this.gridContainer?.scrollIntoView({ behavior: "smooth" });
    }
  }

  private showLoading() {
    if (!this.gridContainer) return;
    const skeleton = document.getElementById("catalog-skeleton-template");
    if (skeleton) {
      this.gridContainer.innerHTML = skeleton.innerHTML;
    }
  }

  private syncFormControls(url: URL) {
    const searchInput = document.getElementById(
      "catalog-search-input",
    ) as HTMLInputElement | null;
    if (searchInput) {
      searchInput.value = url.searchParams.get("q") || "";
    }

    const minPrice = document.querySelector(
      'input[name="minPrice"]',
    ) as HTMLInputElement | null;
    const maxPrice = document.querySelector(
      'input[name="maxPrice"]',
    ) as HTMLInputElement | null;
    const showSoldOut = document.querySelector(
      'input[name="showSoldOut"]',
    ) as HTMLInputElement | null;
    const openPreorders = document.querySelector(
      'input[name="openPreorders"]',
    ) as HTMLInputElement | null;

    if (minPrice) minPrice.value = url.searchParams.get("minPrice") || "";
    if (maxPrice) maxPrice.value = url.searchParams.get("maxPrice") || "";
    if (showSoldOut) showSoldOut.checked = url.searchParams.get("showSoldOut") === "true";
    if (openPreorders) openPreorders.checked = url.searchParams.get("openPreorders") === "true";
  }


  private renderError() {
    if (!this.gridContainer) return;

    const wrapper = document.createElement("div");
    wrapper.className =
      "flex flex-col items-center justify-center py-32 border border-red-900/30 bg-zinc-950/50 animate-in fade-in duration-500";

    const title = document.createElement("h2");
    title.className =
      "text-red-500 font-black text-xs tracking-[0.5em] uppercase";
    title.textContent = "No se pudo cargar el catálogo";

    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "mt-8 text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em] border border-zinc-900 px-6 py-3 hover:border-amber-500 hover:text-amber-500 transition-all";
    button.textContent = "Reintentar";
    button.addEventListener("click", () => window.location.reload());

    wrapper.append(title, button);
    this.gridContainer.replaceChildren(wrapper);
  }

  private updateCategoryActive(url: URL) {
    const activeCat = url.searchParams.get("category");
    const categoryCards = document.querySelectorAll("[data-category-card]");
    categoryCards.forEach((card) => {
      const cardLink = card as HTMLAnchorElement;
      const cardUrl = new URL(cardLink.href);
      const cardCat = cardUrl.searchParams.get("category");
      
      if (cardCat === activeCat) {
        card.classList.add(
          "bg-amber-500",
          "text-black",
          "shadow-[0_8px_24px_rgba(245,158,11,0.18)]",
        );
        card.classList.remove(
          "bg-zinc-950/80",
          "text-zinc-500",
          "hover:bg-white/5",
          "hover:text-white",
        );
      } else {
        card.classList.remove(
          "bg-amber-500",
          "text-black",
          "shadow-[0_8px_24px_rgba(245,158,11,0.18)]",
        );
        card.classList.add(
          "bg-zinc-950/80",
          "text-zinc-500",
          "hover:bg-white/5",
          "hover:text-white",
        );
      }
    });
  }

  private updateCategoryHero(url: URL) {
    const hero = document.getElementById("catalog-hero");
    const visualHeader = document.getElementById("catalog-visual-header");
    const categoryStrip = document.getElementById("catalog-category-strip");
    if (!hero) return;

    const activeCat = url.searchParams.get("category");
    const categoryCards = document.querySelectorAll("[data-category-card]");
    const activeCard = Array.from(categoryCards).find((card) => {
      if (!(card instanceof HTMLAnchorElement)) return false;
      const cardUrl = new URL(card.href);
      return cardUrl.searchParams.get("category") === activeCat;
    });

    if (!(activeCard instanceof HTMLElement)) return;

    const title =
      activeCard.dataset.categoryName || hero.dataset.defaultTitle || "Catálogo";
    const subtitle =
      activeCard.dataset.categorySubtitle ||
      hero.dataset.defaultSubtitle ||
      "Figuras disponibles y preventas seleccionadas.";
    const image = activeCard.dataset.categoryImage || "";
    const titleElement = hero.querySelector("[data-hero-title]");
    const subtitleElement = hero.querySelector("[data-hero-subtitle]");

    if (titleElement) titleElement.textContent = title;
    if (subtitleElement) subtitleElement.textContent = subtitle;
    if (visualHeader) {
      hero.style.backgroundImage = "";
      if (categoryStrip) categoryStrip.style.backgroundImage = "";
      visualHeader.style.backgroundImage = image ? `url("${image}")` : "";
    } else {
      hero.style.backgroundImage = image ? `url("${image}")` : "";
    }
  }

  private updateFilterActiveStates(url: URL) {
    const filterLinks = document.querySelectorAll("a[data-filter-link]");
    filterLinks.forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.hasAttribute("data-page-link")) return;
      if (link.hasAttribute("data-category-card")) return;

      const href = new URL(link.href);
      const isActive = [
        "availability",
        "collection",
        "category",
        "status",
      ].some(
        (key) =>
          href.searchParams.has(key) &&
          href.searchParams.get(key) === url.searchParams.get(key),
      );

      const container = link.querySelector(".group\\/item") || link;
      if (isActive) {
        container.classList.add("border-amber-500");
        container.classList.remove("border-zinc-900", "hover:border-zinc-700");
      } else {
        container.classList.remove("border-amber-500");
        container.classList.add("border-zinc-900", "hover:border-zinc-700");
      }
    });
  }
}

// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
  new CatalogFilters();
});
