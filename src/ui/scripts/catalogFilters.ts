/**
 * Catalog Filters Client-Side Enhancement
 * Implements AJAX filtering with URL synchronization and loading states.
 */

class CatalogFilters {
  private gridContainer: HTMLElement | null = null;
  private toolbarCount: HTMLElement | null = null;
  private sidebarContainer: HTMLElement | null = null;
  private sortSelect: HTMLSelectElement | null = null;
  private currentUrl: string = window.location.href;

  // Task 7: Cache catalog responses on client
  private productsCache = new Map<string, any>();
  private metadataCache: any = null;
  
  // Abort controller for cancelling pending requests
  private abortController: AbortController | null = null;

  constructor() {
    this.init();
  }

  private init() {
    this.gridContainer = document.getElementById("catalog-grid-container");
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

  private async fetchProducts(url: URL, signal?: AbortSignal) {
    console.time("client_catalog_products");
    const apiUrl = new URL("/api/catalog/products", window.location.origin);
    url.searchParams.forEach((val, key) =>
      apiUrl.searchParams.append(key, val),
    );
    
    try {
      const res = await fetch(apiUrl, { signal });
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      console.timeEnd("client_catalog_products");
      return data;
    } catch (e) {
      console.timeEnd("client_catalog_products");
      throw e;
    }
  }

  private async applyFilters(url: URL, updateHistory = true) {
    if (url.href === this.currentUrl && updateHistory) return;

    const startTotal = performance.now();
    console.log(`[Client Filters] Start applyFilters for: ${url.search}`);

    // Task 7: cache lookup happens before fetch
    const key = url.search || "default";
    if (this.productsCache.has(key)) {
      console.log(`[Client Filters] Cache Hit for key: ${key}`);
      const cachedData = this.productsCache.get(key)!;
      this.updateUI(cachedData, url, updateHistory);
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
      const productsData = await this.fetchProducts(
        url,
        this.abortController.signal,
      );
      
      // Task 7: results stored after fetch
      this.productsCache.set(key, productsData);

      clearTimeout(skeletonTimer);
      this.updateUI(productsData, url, updateHistory);
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

  private updateUI(data: any, url: URL, updateHistory: boolean) {
    console.time("client_ui_render_total");
    const products = Array.isArray(data) ? data : data.items || [];
    const total = Array.isArray(data)
      ? products.length
      : data.pagination?.total ?? products.length;
    
    console.time("client_render_products");
    this.renderProducts(products);
    console.timeEnd("client_render_products");

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
    this.updateCount(total);

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

  // Task 6: Frontend rendering optimization with DocumentFragment
  private renderProducts(products: any[]) {
    if (!this.gridContainer) return;
    if (products.length === 0) {
      this.renderEmpty();
      return;
    }

    const fragment = document.createDocumentFragment();
    const container = document.createElement("div");
    container.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[24px] animate-in fade-in duration-500";

    const placeholderImage =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%2309090b'/%3E%3Cpath d='M150 150h100v100h-100z' fill='%2327272a'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='12' fill='%2352525b' font-weight='bold' letter-spacing='0.2em' text-anchor='middle' dominant-baseline='middle'%3EIMAGE UNAVAILABLE%3C/text%3E%3C/svg%3E";

    products.forEach((p) => {
      const image = p.imageUrl || placeholderImage;
      const price = typeof p.price === "number" ? p.price.toFixed(2) : parseFloat(p.price || 0).toFixed(2);
      
      const itemWrapper = document.createElement("div");
      itemWrapper.innerHTML = `
        <a href="/product/${p.id}" class="group flex flex-col gap-4 cursor-pointer block">
          <div class="relative w-full aspect-square bg-zinc-950 border border-zinc-900 group-hover:border-amber-500 transition-all duration-300 overflow-hidden transform group-hover:scale-[1.03]">
            <img src="${image}" alt="${p.name}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:brightness-110 transition-all duration-300" loading="lazy" />
            <div class="absolute top-3 left-3 flex flex-col gap-2 z-10">
              ${p.status === "PRE_ORDER" ? '<span class="bg-[#E60012] text-white text-[10px] font-black uppercase tracking-widest px-2 py-1">PRE-ORDER</span>' : ""}
              ${p.status === "NEW" ? '<span class="bg-[#E60012] text-white text-[10px] font-black uppercase tracking-widest px-2 py-1">NEW</span>' : ""}
              ${p.status === "OUT_OF_STOCK" ? '<span class="bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-black uppercase tracking-widest px-2 py-1">OUT OF STOCK</span>' : ""}
            </div>
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
              <span class="border border-amber-500 text-amber-500 text-xs font-black uppercase tracking-[0.2em] px-6 py-3 bg-black/80 backdrop-blur-sm shadow-[inset_0_0_10px_rgba(212,175,55,0.2)]">VIEW DETAILS</span>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em]">${p.character || "UNKNOWN"}</span>
            <h3 class="text-white text-sm font-black uppercase tracking-tight leading-snug">${p.name}</h3>
            <div class="flex items-center justify-between mt-1">
              <span class="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">${p.line || "UNKNOWN LINE"}</span>
              <span class="text-amber-500 text-sm font-black uppercase tracking-widest">$${price}</span>
            </div>
          </div>
        </a>
      `;
      container.appendChild(itemWrapper.firstElementChild!);
    });

    fragment.appendChild(container);
    this.gridContainer.innerHTML = "";
    this.gridContainer.appendChild(fragment);
  }

  private renderEmpty() {
    if (!this.gridContainer) return;
    this.gridContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center py-32 border border-zinc-900 bg-zinc-950/50 animate-in fade-in duration-500">
        <span class="text-zinc-800 text-6xl mb-8 font-black">∅</span>
        <h2 class="text-amber-500 font-black text-xs tracking-[0.5em] uppercase">NO COLLECTIBLES FOUND</h2>
        <p class="text-zinc-600 text-[10px] mt-4 tracking-widest uppercase">STRETCH YOUR SEARCH PARAMETERS</p>
        <a href="/catalog" data-filter-link class="mt-8 text-amber-500 text-[9px] font-black uppercase tracking-[0.2em] border border-amber-500/30 px-6 py-3 hover:bg-amber-500 hover:text-black transition-all">
          RESET ARCHIVE
        </a>
      </div>
    `;
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

  private updateCount(count: number) {
    if (this.toolbarCount) this.toolbarCount.textContent = count.toString();
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
