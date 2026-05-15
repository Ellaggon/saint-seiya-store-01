class PreorderFilters {
  private sortSelect: HTMLSelectElement | null = null;

  constructor() {
    this.sortSelect = document.getElementById(
      "preorder-sort-select",
    ) as HTMLSelectElement | null;

    this.sortSelect?.addEventListener("change", () => {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("sort", this.sortSelect?.value || "created-desc");
      nextUrl.searchParams.delete("page");
      window.location.href = nextUrl.href;
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PreorderFilters();
});
