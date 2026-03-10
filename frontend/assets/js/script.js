const yearEl = document.getElementById("current-year");

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}
