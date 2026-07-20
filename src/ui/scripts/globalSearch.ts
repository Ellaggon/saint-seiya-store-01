type SearchSource = "catalog" | "preorder";
type SearchScope = "all" | "catalog" | "preorders";

interface SearchSuggestItem {
  id: string;
  name: string;
  source: SearchSource;
  href: string;
}

interface SearchSuggestResponse {
  query: string;
  items: SearchSuggestItem[];
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 80;
const CLIENT_CACHE_TTL_MS = 30_000;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const sourceSuffix = (source: SearchSource): string =>
  source === "catalog" ? "Disponible en tienda" : "Preventa";

class GlobalSearchController {
  private form: HTMLFormElement | null = null;
  private input: HTMLInputElement | null = null;
  private results: HTMLElement | null = null;
  private emptyState: HTMLElement | null = null;
  private status: HTMLElement | null = null;
  private debounceTimer: number | null = null;
  private abortController: AbortController | null = null;
  private activeIndex = -1;
  private items: SearchSuggestItem[] = [];
  private scope: SearchScope = "all";
  private clientCache = new Map<
    string,
    { expires: number; items: SearchSuggestItem[] }
  >();
  private resultsBound = false;

  init() {
    this.form = document.getElementById(
      "navbar-catalog-search-form",
    ) as HTMLFormElement | null;
    this.input = document.getElementById(
      "navbar-catalog-search-input",
    ) as HTMLInputElement | null;
    this.results = document.getElementById("global-search-results");
    this.emptyState = document.getElementById("global-search-empty");
    this.status = document.getElementById("global-search-status");

    if (!this.form || !this.input || this.form.dataset.searchReady === "true") {
      return;
    }

    this.form.dataset.searchReady = "true";
    this.scope = this.resolveDefaultScope();
    this.syncScopeControls();
    this.bindEvents();
  }

  private resolveDefaultScope(): SearchScope {
    const path = window.location.pathname;
    if (path.startsWith("/preorders")) return "preorders";
    if (path.startsWith("/catalog")) return "catalog";
    return "all";
  }

  private syncScopeControls() {
    this.form
      ?.querySelectorAll<HTMLInputElement>('input[name="searchScope"]')
      .forEach((input) => {
        input.checked = input.value === this.scope;
      });
  }

  private bindEvents() {
    this.form?.addEventListener("submit", (event) => {
      event.preventDefault();
      this.submitSearch();
    });

    this.input?.addEventListener("input", () => {
      this.scheduleSuggest(this.input?.value.trim() || "");
    });

    this.input?.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        this.moveActive(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        this.moveActive(-1);
        return;
      }
      if (event.key === "Enter" && this.activeIndex >= 0) {
        event.preventDefault();
        const item = this.filteredItems()[this.activeIndex];
        if (item) window.location.href = item.href;
      }
    });

    this.form
      ?.querySelectorAll<HTMLInputElement>('input[name="searchScope"]')
      .forEach((input) => {
        input.addEventListener("change", () => {
          if (
            input.checked &&
            (input.value === "all" ||
              input.value === "catalog" ||
              input.value === "preorders")
          ) {
            this.scope = input.value;
            this.render();
          }
        });
      });

    if (this.results && !this.resultsBound) {
      this.resultsBound = true;
      this.results.addEventListener("mouseover", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const link = target.closest<HTMLElement>("[data-suggest-index]");
        if (!link) return;
        const index = Number(link.dataset.suggestIndex);
        if (!Number.isFinite(index)) return;
        this.activeIndex = index;
        this.highlightActive();
      });
    }
  }

  private scheduleSuggest(query: string) {
    if (this.debounceTimer) window.clearTimeout(this.debounceTimer);

    if (query.length < MIN_QUERY_LENGTH) {
      this.abortController?.abort();
      this.items = [];
      this.activeIndex = -1;
      this.render();
      return;
    }

    const cacheKey = query.toLocaleLowerCase("es");
    const cached = this.clientCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      this.items = cached.items;
      this.activeIndex = -1;
      this.render();
      return;
    }

    this.debounceTimer = window.setTimeout(() => {
      void this.fetchSuggestions(query);
    }, DEBOUNCE_MS);
  }

  private async fetchSuggestions(query: string) {
    this.abortController?.abort();
    this.abortController = new AbortController();

    try {
      const response = await fetch(
        `/api/search/suggest?q=${encodeURIComponent(query)}`,
        { signal: this.abortController.signal },
      );
      if (!response.ok) throw new Error("Search suggest failed");

      const payload = (await response.json()) as {
        data?: SearchSuggestResponse;
      };
      const data = payload.data;
      if (!data) throw new Error("Invalid suggest payload");

      this.items = data.items;
      this.clientCache.set(query.toLocaleLowerCase("es"), {
        items: data.items,
        expires: Date.now() + CLIENT_CACHE_TTL_MS,
      });
      this.activeIndex = -1;
      this.render();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      this.setStatus("No se pudo cargar sugerencias.");
    }
  }

  private filteredItems(): SearchSuggestItem[] {
    if (this.scope === "catalog") {
      return this.items.filter((item) => item.source === "catalog");
    }
    if (this.scope === "preorders") {
      return this.items.filter((item) => item.source === "preorder");
    }
    return this.items;
  }

  private render() {
    if (!this.results || !this.emptyState) return;

    const query = this.input?.value.trim() || "";
    const items = this.filteredItems();

    if (query.length < MIN_QUERY_LENGTH) {
      this.results.innerHTML = "";
      this.results.classList.add("hidden");
      this.emptyState.classList.add("hidden");
      this.setStatus("Escribe al menos 2 caracteres.");
      return;
    }

    if (items.length === 0) {
      this.results.innerHTML = "";
      this.results.classList.add("hidden");
      this.emptyState.classList.remove("hidden");
      this.setStatus("Sin coincidencias.");
      return;
    }

    this.emptyState.classList.add("hidden");
    this.results.classList.remove("hidden");
    this.results.innerHTML = items
      .map((item, index) => this.renderItem(item, index))
      .join("");
    this.setStatus(`${items.length} resultado${items.length === 1 ? "" : "s"}`);
    this.highlightActive();
  }

  private renderItem(item: SearchSuggestItem, index: number): string {
    const label = `${item.name} - ${sourceSuffix(item.source)}`;
    return `<a href="${escapeHtml(item.href)}" data-suggest-index="${index}" class="block truncate border-l-2 border-transparent px-3 py-2 text-sm text-zinc-300 hover:border-amber-500 hover:bg-zinc-950 hover:text-white" title="${escapeHtml(label)}"><span class="text-white">${escapeHtml(item.name)}</span><span class="text-zinc-500"> — ${escapeHtml(sourceSuffix(item.source))}</span></a>`;
  }

  private moveActive(delta: number) {
    const items = this.filteredItems();
    if (items.length === 0) return;
    this.activeIndex = (this.activeIndex + delta + items.length) % items.length;
    this.highlightActive();
  }

  private highlightActive() {
    this.results
      ?.querySelectorAll<HTMLElement>("[data-suggest-index]")
      .forEach((node) => {
        const active = Number(node.dataset.suggestIndex) === this.activeIndex;
        node.classList.toggle("border-amber-500", active);
        node.classList.toggle("bg-zinc-950", active);
        node.classList.toggle("text-white", active);
      });
  }

  private setStatus(message: string) {
    if (this.status) this.status.textContent = message;
  }

  private sourceCounts() {
    let catalog = 0;
    let preorders = 0;
    for (const item of this.items) {
      if (item.source === "catalog") catalog += 1;
      else preorders += 1;
    }
    return { catalog, preorders };
  }

  private submitSearch() {
    const query = this.input?.value.trim() || "";
    if (!query) return;

    if (this.activeIndex >= 0) {
      const item = this.filteredItems()[this.activeIndex];
      if (item) {
        window.location.href = item.href;
        return;
      }
    }

    if (this.scope === "catalog") {
      this.navigateToListing("catalog");
      return;
    }
    if (this.scope === "preorders") {
      this.navigateToListing("preorders");
      return;
    }

    const { catalog, preorders } = this.sourceCounts();
    if (preorders > catalog) {
      this.navigateToListing("preorders");
      return;
    }
    this.navigateToListing("catalog");
  }

  private navigateToListing(target: "catalog" | "preorders") {
    const query = this.input?.value.trim() || "";
    const path = target === "catalog" ? "/catalog" : "/preorders";
    const url = new URL(path, window.location.origin);
    if (query) url.searchParams.set("q", query);

    const onTargetPage =
      target === "catalog" && window.location.pathname === "/catalog";

    if (onTargetPage) {
      const catalogSearchForm = document.getElementById("catalog-search-form");
      const catalogSearchInput = document.getElementById(
        "catalog-search-input",
      );
      if (
        catalogSearchForm instanceof HTMLFormElement &&
        catalogSearchInput instanceof HTMLInputElement
      ) {
        catalogSearchInput.value = query;
        document.getElementById("catalog-search-modal-close")?.dispatchEvent(
          new Event("click"),
        );
        catalogSearchForm.requestSubmit();
        return;
      }
    }

    window.location.href = `${url.pathname}${url.search}`;
  }
}

const controller = new GlobalSearchController();

const boot = () => controller.init();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

document.addEventListener("astro:page-load", boot);
