// ── Sidebar toggle ────────────────────────────────────────────────────
const sidebar = document.querySelector(".sidebar");
const overlay = document.querySelector(".sidebar-overlay");
const menuToggle = document.querySelector(".menu-toggle");

function openSidebar() {
  sidebar?.classList.add("open");
  overlay?.classList.add("open");
}

function closeSidebar() {
  sidebar?.classList.remove("open");
  overlay?.classList.remove("open");
}

menuToggle?.addEventListener("click", openSidebar);
overlay?.addEventListener("click", closeSidebar);

// ── Active nav link ───────────────────────────────────────────────────
(function markActiveLink() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-link").forEach((el) => {
    const href = el.getAttribute("href") || "";
    const hrefFile = href.split("/").pop();
    if (hrefFile === path) {
      el.classList.add("active");
    }
  });
})();

// ── Copy buttons ──────────────────────────────────────────────────────
document.querySelectorAll(".code-wrapper").forEach((wrapper) => {
  const btn = wrapper.querySelector(".copy-btn");
  const pre = wrapper.querySelector("pre");
  if (!btn || !pre) return;
  btn.addEventListener("click", async () => {
    const text = pre.textContent || "";
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("copied");
    }, 2000);
  });
});

// ── Smooth scroll for anchor links ───────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    const target = document.querySelector(anchor.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      closeSidebar();
    }
  });
});
