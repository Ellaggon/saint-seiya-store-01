/**
 * Catalog Filters Client-Side Enhancement
 * Implements AJAX filtering with URL synchronization and loading states.
 */

class CatalogFilters {
  private gridContainer: HTMLElement | null = null;
  private paginationContainer: HTMLElement | null = null;
  private toolbarCount: HTMLElement | null = null;
  private sidebarContainer: HTMLElement | null = null;
  private sortSelect: HTMLSelectElement | null = null;
  private currentUrl: string = window.location.href;

  // Cache partial HTML responses by querystring
  private partialCache = new Map<string, string>();
  private metadataCache: any = null;
  
  // Abort controller for cancelling pending requests
  private abortController: AbortController | null = null;

  constructor() {
    this.init();
  }

  private init() {
    this.gridContainer = document.getElementById("catalog-grid-container");
    this.paginationContainer = document.getElementById(
      "catalog-pagination-container",
    );
    this.toolbarCount = document.getElementById("catalog-result-count");
    this.sidebarContainer = document.querySelector("aside");
    this.sortSelect = document.getElementById(
      "catalog-sort-select",
    ) as HTMLSelectElement | null;

    if (!this.gridContainer) return;

    // Fetch metadata once on page load
    this.fetchMetadataOnLoad();

    // Listen to all link clicks in document (delegation)
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

    // Handle back/forward navigation
    window.addEventListener("popstate", () => {
      this.applyFilters(new URL(window.location.href), false);
    });

    this.sortSelect?.addEventListener("change", () => {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("sort", this.sortSelect?.value || "created-desc");
      nextUrl.searchParams.delete("page");
      this.applyFilters(nextUrl);
    });
  }

  private async fetchMetadataOnLoad() {
    console.time("client_catalog_metadata");
    try {
      const res = await fetch("/api/catalog/metadata");
      if (res.ok) {
        this.metadataCache = await res.json();
      }
    } catch (e) {
      console.error("Failed to load metadata:", e);
    }
    console.timeEnd("client_catalog_metadata");
  }

  private async fetchPartialHtml(url: URL, signal?: AbortSignal) {
    console.time("client_catalog_partial");
    const apiUrl = new URL("/catalog/partials/products", window.location.origin);
    url.searchParams.forEach((val, key) =>
      apiUrl.searchParams.append(key, val),
    );
    
    try {
      const res = await fetch(apiUrl, { signal });
      if (!res.ok) throw new Error("Fetch failed");
      const html = await res.text();
      console.timeEnd("client_catalog_partial");
      return html;
    } catch (e) {
      console.timeEnd("client_catalog_partial");
      throw e;
    }
  }

  private async applyFilters(url: URL, updateHistory = true) {
    if (url.href === this.currentUrl && updateHistory) return;

    const startTotal = performance.now();
    console.log(`[Client Filters] Start applyFilters for: ${url.search}`);

    // Cache lookup before network fetch
    const key = url.search || "default";
    if (this.partialCache.has(key)) {
      console.log(`[Client Filters] Cache Hit for key: ${key}`);
      const cachedHtml = this.partialCache.get(key)!;
      this.updateUIFromPartial(cachedHtml, url, updateHistory);
      console.log(`[Client Filters] Total Latency (Cached): ${(performance.now() - startTotal).toFixed(2)}ms`);
      return;
    }

    // Cancel any pending requests
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    // Show skeleton if it takes time
    let showSkeleton = false;
    const skeletonTimer = setTimeout(() => {
      showSkeleton = true;
      this.showLoading();
    }, 120);

    try {
      const partialHtml = await this.fetchPartialHtml(
        url,
        this.abortController.signal,
      );
      
      this.partialCache.set(key, partialHtml);

      clearTimeout(skeletonTimer);
      this.updateUIFromPartial(partialHtml, url, updateHistory);
      console.log(`[Client Filters] Total Latency (Network): ${(performance.now() - startTotal).toFixed(2)}ms`);

    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log(`[Client Filters] Request aborted.`);
        return;
      }
      
      clearTimeout(skeletonTimer);
      console.error("Filter Error:", error);
      this.renderError();
    }
  }

  private updateUIFromPartial(partialHtml: string, url: URL, updateHistory: boolean) {
    console.time("client_ui_render_total");
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
    }
    if (nextCount && this.toolbarCount) {
      this.toolbarCount.textContent = nextCount.textContent || "0";
    }

    // Only update sidebar bounds if metadata is cached
    if (this.metadataCache) {
      this.updateSidebarCounts(this.metadataCache, url);
    }
    this.updateCategoryActive(url);

    if (updateHistory) {
      window.history.pushState({}, "", url.href);
    }
    if (this.sortSelect) {
      this.sortSelect.value = url.searchParams.get("sort") || "created-desc";
    }

    this.currentUrl = url.href;

    // Scroll to top of catalog section on mobile
    if (window.innerWidth < 1024) {
      this.gridContainer?.scrollIntoView({ behavior: "smooth" });
    }
    
    console.timeEnd("client_ui_render_total");
  }

  private showLoading() {
    if (!this.gridContainer) return;
    const skeleton = document.getElementById("catalog-skeleton-template");
    if (skeleton) {
      this.gridContainer.innerHTML = skeleton.innerHTML;
    }
  }


  private renderError() {
    if (!this.gridContainer) return;
    this.gridContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center py-32 border border-red-900/30 bg-zinc-950/50 animate-in fade-in duration-500">
        <h2 class="text-red-500 font-black text-xs tracking-[0.5em] uppercase">FAILED TO LOAD COLLECTIBLES</h2>
        <button onclick="window.location.reload()" class="mt-8 text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em] border border-zinc-900 px-6 py-3 hover:border-amber-500 hover:text-amber-500 transition-all">
          RETRY CONNECTION
        </button>
      </div>
    `;
  }

  private updateCategoryActive(url: URL) {
    const activeCat = url.searchParams.get("category");
    const categoryCards = document.querySelectorAll("[data-category-card]");
    categoryCards.forEach((card) => {
      const cardLink = card as HTMLAnchorElement;
      const cardUrl = new URL(cardLink.href);
      const cardCat = cardUrl.searchParams.get("category");
      
      if (cardCat === activeCat) {
        card.classList.add("border-amber-500");
        card.classList.remove("border-zinc-900");
      } else {
        card.classList.remove("border-amber-500");
        card.classList.add("border-zinc-900");
      }
    });
  }

  private updateSidebarCounts(metadata: any, url: URL) {
    if (!metadata) return;

    const filterLinks = document.querySelectorAll("a[data-filter-link]");
    filterLinks.forEach((link) => {
      const l = link as HTMLAnchorElement;
      const href = new URL(l.href);

      let count = 0;
      let isActive = false;

      if (href.searchParams.has("collection")) {
        const slug = href.searchParams.get("collection");
        const item = metadata.collections.find((c: any) => c.slug === slug);
        if (item) count = item.count;
        isActive = url.searchParams.get("collection") === slug;
      } else if (href.searchParams.has("character")) {
        const slug = href.searchParams.get("character");
        const item = metadata.characters.find((c: any) => c.slug === slug);
        if (item) count = item.count;
        isActive = url.searchParams.get("character") === slug;
      } else if (href.searchParams.has("category")) {
        const slug = href.searchParams.get("category");
        const item = metadata.categories.find((c: any) => c.slug === slug);
        if (item) count = item.count;
        isActive = url.searchParams.get("category") === slug;
      }

      const countSpan = l.querySelector("span span");
      if (countSpan) countSpan.textContent = `(${count})`;

      const container = l.querySelector(".group\\/item") || l;
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
