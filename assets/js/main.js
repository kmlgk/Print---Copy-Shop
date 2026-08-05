/* ============================================================
   Sharpline Print & Copy Co. — site-wide JS
   Theme + RTL toggles, injected header/footer, mobile drawer,
   smart-scroll header, scroll reveal (GSAP), toasts, form helpers.
   No build step. No backend. Works from file:// (no fetch/includes).
   ============================================================ */

(function () {
  "use strict";

  /* ---------------- Public nav model ---------------- */
  var NAV_LINKS = [
    { label: "Home", dropdown: [
        { href: "index.html", label: "Home 1" },
        { href: "home-2.html", label: "Home 2" }
      ] },
    { href: "services.html", label: "Services" },
    { href: "pricing.html", label: "Pricing" },
    { href: "gallery.html", label: "Gallery" },
    { href: "about.html", label: "About" },
    { href: "contact.html", label: "Contact" }
  ];

  function currentFile() {
    var p = window.location.pathname.split("/").pop();
    return p === "" ? "index.html" : p;
  }

  /* ---------------- Theme ---------------- */
  var THEME_KEY = "sharpline-theme";
  var DIR_KEY = "sharpline-dir";

  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function setTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
    updateThemeIcons(mode);
  }
  function updateThemeIcons(mode) {
    document.querySelectorAll("[data-theme-icon-sun]").forEach(function (el) {
      el.classList.toggle("hidden", mode === "dark");
    });
    document.querySelectorAll("[data-theme-icon-moon]").forEach(function (el) {
      el.classList.toggle("hidden", mode !== "dark");
    });
  }

  function getStoredDir() {
    try { return localStorage.getItem(DIR_KEY); } catch (e) { return null; }
  }
  function setDir(dir) {
    /* The mobile drawer and dashboard sidebar each have a different closed-
       position transform for ltr vs rtl. Flipping `dir` while their normal
       transition is active makes the (still-closed) panel visibly slide
       across the whole screen — freeze the transition for one paint so the
       hidden position updates instantly instead of animating through view. */
    var panels = [document.getElementById("mobile-drawer"), document.getElementById("dash-sidebar")];
    panels.forEach(function (el) { if (el) el.classList.add("dir-switching"); });

    document.documentElement.setAttribute("dir", dir);
    try { localStorage.setItem(DIR_KEY, dir); } catch (e) {}
    document.querySelectorAll("[data-dir-label]").forEach(function (el) {
      el.textContent = dir === "rtl" ? "LTR" : "RTL";
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        panels.forEach(function (el) { if (el) el.classList.remove("dir-switching"); });
      });
    });
  }

  /* ---------------- Icons (inline SVG strings) ---------------- */
  var ICONS = {
    sun: '<svg data-theme-icon-sun class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    moon: '<svg data-theme-icon-moon class="w-5 h-5 hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>',
    globe: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"/></svg>',
    menu: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    printer: '<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    user: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 16 0v1"/></svg>',
    arrowUp: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'
  };

  /* ---------------- Header ---------------- */
  function buildHeader() {
    var host = document.getElementById("site-header");
    if (!host) return;
    var active = currentFile();

    var linksHtml = NAV_LINKS.map(function (l) {
      if (l.dropdown) {
        var groupActive = l.dropdown.some(function (d) { return d.href === active; });
        var defaultHref = l.dropdown[0].href;
        var itemsHtml = l.dropdown.map(function (d) {
          var itemActive = d.href === active;
          return '<a href="' + d.href + '" role="menuitem" class="block px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-dim)]"' +
            (itemActive ? ' aria-current="page" style="color:var(--c-blue-600)"' : '') + '>' + d.label + '</a>';
        }).join("");
        return '<div class="nav-dropdown">' +
          '<a href="' + defaultHref + '" class="nav-link px-1 py-2 text-sm text-[var(--text)] hover:text-[var(--c-blue-600)] inline-flex items-center gap-1"' +
            (groupActive ? ' aria-current="page"' : '') + '>' + l.label +
            '<svg class="nav-dropdown-chevron w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' +
          '</a>' +
          '<div class="nav-dropdown-panel" role="menu" aria-label="Home pages">' + itemsHtml + '</div>' +
        '</div>';
      }
      var isActive = l.href === active;
      return '<a href="' + l.href + '" class="nav-link px-1 py-2 text-sm text-[var(--text)] hover:text-[var(--c-blue-600)]"' +
        (isActive ? ' aria-current="page"' : '') + '>' + l.label + '</a>';
    }).join("");

    var mobileLinksHtml = NAV_LINKS.map(function (l) {
      if (l.dropdown) {
        return l.dropdown.map(function (d) {
          var itemActive = d.href === active;
          return '<a href="' + d.href + '" class="block py-3 px-4 rounded-lg text-base font-medium hover:bg-[var(--bg-dim)]"' +
            (itemActive ? ' aria-current="page" style="color:var(--c-blue-600)"' : '') + '>' + d.label + '</a>';
        }).join("");
      }
      var isActive = l.href === active;
      return '<a href="' + l.href + '" class="block py-3 px-4 rounded-lg text-base font-medium hover:bg-[var(--bg-dim)]"' +
        (isActive ? ' aria-current="page" style="color:var(--c-blue-600)"' : '') + '>' + l.label + '</a>';
    }).join("");

    host.innerHTML =
      '<a href="#main-content" class="skip-link">Skip to main content</a>' +
      '<div class="border-b" style="border-color:var(--border)">' +
        '<div class="container-shop flex items-center justify-between h-8 text-[11px] font-mono tracking-wide" style="color:var(--text-muted)">' +
          '<span class="turnaround-pill hidden sm:inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-[var(--c-blue-600)] animate-pulse"></span> Today\'s turnaround: <strong style="color:var(--text)">24&nbsp;hrs</strong></span>' +
          '<span class="hidden md:inline">Mon&ndash;Sat 8:00&ndash;20:00 &middot; <a href="contact.html" class="underline hover:text-[var(--c-blue-600)]">14 Ludgate Row, Springfield</a></span>' +
          '<a href="tel:+15551230199" class="ms-auto sm:ms-0">+1 (555) 123-0199</a>' +
        '</div>' +
      '</div>' +
      '<div class="container-shop flex items-center justify-between gap-4 py-3">' +
        '<a href="index.html" class="flex items-center gap-2 shrink-0 font-display text-xl sm:text-2xl tracking-wide" aria-label="Sharpline Print and Copy Co. home">' +
          '<span class="inline-flex items-center justify-center w-10 h-10 rounded-md text-white" style="background:var(--c-blue-600)">' + ICONS.printer + '</span>' +
          '<span>SHARPLINE</span>' +
        '</a>' +
        '<nav class="hidden lg:flex items-center gap-6 flex-1 justify-center" aria-label="Primary">' + linksHtml + '</nav>' +
        '<div class="hidden lg:flex items-center gap-2 shrink-0">' +
          '<button type="button" id="theme-toggle" class="p-2 rounded-md hover:bg-[var(--bg-dim)]" aria-label="Toggle dark mode">' + ICONS.sun + ICONS.moon + '</button>' +
          '<button type="button" id="dir-toggle" class="p-2 rounded-md hover:bg-[var(--bg-dim)] flex items-center gap-1 text-xs font-mono" aria-label="Toggle text direction">' + ICONS.globe + '<span data-dir-label>RTL</span></button>' +
          '<a href="login.html" class="p-2 rounded-md hover:bg-[var(--bg-dim)]" aria-label="Account login">' + ICONS.user + '</a>' +
          '<a href="dashboard-new-order.html" class="btn btn-primary btn-sm ms-1">Start a Print Job</a>' +
        '</div>' +
        '<button type="button" id="mobile-menu-btn" class="lg:hidden p-2 rounded-md hover:bg-[var(--bg-dim)]" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-drawer">' + ICONS.menu + '</button>' +
      '</div>';

    var drawerHost = document.getElementById("mobile-drawer-root");
    if (drawerHost) {
      drawerHost.innerHTML =
        '<div id="mobile-drawer-backdrop" class="fixed inset-0 bg-black/50 z-[70] opacity-0 pointer-events-none" tabindex="-1"></div>' +
        '<div id="mobile-drawer" class="closed fixed top-0 bottom-0 end-0 z-[80] w-full bg-[var(--bg-elevated)] shadow-2xl flex flex-col" role="dialog" aria-modal="true" aria-label="Mobile navigation">' +
          '<div class="flex items-center justify-between p-4 border-b" style="border-color:var(--border)">' +
            '<span class="font-display text-lg">MENU</span>' +
            '<button type="button" id="mobile-drawer-close" class="p-2 rounded-md hover:bg-[var(--bg-dim)]" aria-label="Close menu">' + ICONS.close + '</button>' +
          '</div>' +
          '<nav class="flex-1 overflow-y-auto p-3" aria-label="Mobile">' + mobileLinksHtml + '</nav>' +
          '<div class="p-4 border-t space-y-3" style="border-color:var(--border)">' +
            '<div class="flex items-center gap-2">' +
              '<button type="button" id="theme-toggle-mobile" class="btn btn-outline btn-sm flex-1">' + ICONS.sun + ICONS.moon + ' <span class="ms-1">Theme</span></button>' +
              '<button type="button" id="dir-toggle-mobile" class="btn btn-outline btn-sm flex-1">' + ICONS.globe + ' <span data-dir-label class="ms-1">RTL</span></button>' +
            '</div>' +
            '<a href="login.html" class="btn btn-ghost btn-sm w-full">' + ICONS.user + ' <span class="ms-1">My Account</span></a>' +
            '<a href="dashboard-new-order.html" class="btn btn-primary btn-sm w-full">Start a Print Job</a>' +
          '</div>' +
        '</div>';
    }

    updateThemeIcons(document.documentElement.getAttribute("data-theme") || "light");
    var dirLabel = (document.documentElement.getAttribute("dir") || "ltr") === "rtl" ? "LTR" : "RTL";
    document.querySelectorAll("[data-dir-label]").forEach(function (el) { el.textContent = dirLabel; });

    wireHeaderEvents();
    syncHeaderHeight();
  }

  /* Fixed header has no document-flow height, so #main-content needs matching
     padding-top — measured live since header height varies by breakpoint
     (utility strip / turnaround pill visibility) and by font-load reflow. */
  function syncHeaderHeight() {
    var header = document.getElementById("site-header");
    var main = document.getElementById("main-content");
    if (!header || !main) return;
    main.style.paddingTop = header.offsetHeight + "px";
  }

  function wireHeaderEvents() {
    var themeBtns = [document.getElementById("theme-toggle"), document.getElementById("theme-toggle-mobile")];
    themeBtns.forEach(function (btn) {
      if (!btn) return;
      btn.addEventListener("click", function () {
        var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
        setTheme(cur === "dark" ? "light" : "dark");
      });
    });

    var dirBtns = [document.getElementById("dir-toggle"), document.getElementById("dir-toggle-mobile")];
    dirBtns.forEach(function (btn) {
      if (!btn) return;
      btn.addEventListener("click", function () {
        var cur = document.documentElement.getAttribute("dir") === "rtl" ? "rtl" : "ltr";
        setDir(cur === "rtl" ? "ltr" : "rtl");
      });
    });

    var menuBtn = document.getElementById("mobile-menu-btn");
    var drawer = document.getElementById("mobile-drawer");
    var backdrop = document.getElementById("mobile-drawer-backdrop");
    var closeBtn = document.getElementById("mobile-drawer-close");

    function openDrawer() {
      if (!drawer) return;
      drawer.classList.remove("closed");
      backdrop.classList.remove("opacity-0", "pointer-events-none");
      menuBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    }
    function closeDrawer() {
      if (!drawer) return;
      drawer.classList.add("closed");
      backdrop.classList.add("opacity-0", "pointer-events-none");
      menuBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      menuBtn.focus();
    }
    if (menuBtn) menuBtn.addEventListener("click", openDrawer);
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    if (backdrop) backdrop.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer && !drawer.classList.contains("closed")) closeDrawer();
    });

    /* Fixed header stays pinned always; just toggle the scrolled (shadow) state */
    var header = document.getElementById("site-header");
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      if (header) header.classList.toggle("scrolled", y > 8);
      var btt = document.getElementById("back-to-top");
      if (btt) btt.classList.toggle("show", y > 480);
    }, { passive: true });
  }

  /* ---------------- Footer ---------------- */
  function buildFooter() {
    var host = document.getElementById("site-footer");
    if (!host) return;
    var year = new Date().getFullYear();
    host.innerHTML =
      '<div class="torn-top" style="background:var(--ink-900); color:#e7e6df;">' +
        '<div class="container-shop pb-10">' +
          '<div class="grid gap-10 md:grid-cols-2 lg:grid-cols-4">' +
            '<div>' +
              '<a href="index.html" class="flex items-center gap-2 font-display text-xl mb-3 text-white">' +
                '<span class="inline-flex items-center justify-center w-9 h-9 rounded-md" style="background:var(--c-blue-600)">' + ICONS.printer + '</span> SHARPLINE' +
              '</a>' +
              '<p class="text-sm leading-relaxed" style="color:#a8acb8">Neighborhood print &amp; copy shop for documents, banners, business cards and photo prints &mdash; precise work, same-day when you need it.</p>' +
              '<div class="flex gap-3 mt-4">' +
                '<a href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook" class="w-9 h-9 rounded-full flex items-center justify-center border border-white/15 hover:border-white/40">f</a>' +
                '<a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram" class="w-9 h-9 rounded-full flex items-center justify-center border border-white/15 hover:border-white/40">ig</a>' +
                '<a href="https://linkedin.com" target="_blank" rel="noopener" aria-label="LinkedIn" class="w-9 h-9 rounded-full flex items-center justify-center border border-white/15 hover:border-white/40">in</a>' +
              '</div>' +
            '</div>' +
            '<div>' +
              '<h3 class="font-display text-sm tracking-widest mb-4 text-white">EXPLORE</h3>' +
              '<ul class="space-y-2 text-sm">' +
                '<li><a href="services.html" class="hover:text-white">Services</a></li>' +
                '<li><a href="pricing.html" class="hover:text-white">Pricing</a></li>' +
                '<li><a href="gallery.html" class="hover:text-white">Gallery</a></li>' +
                '<li><a href="about.html" class="hover:text-white">About Us</a></li>' +
                '<li><a href="contact.html" class="hover:text-white">Contact</a></li>' +
              '</ul>' +
            '</div>' +
            '<div>' +
              '<h3 class="font-display text-sm tracking-widest mb-4 text-white">MY ACCOUNT</h3>' +
              '<ul class="space-y-2 text-sm">' +
                '<li><a href="login.html" class="hover:text-white">Login</a></li>' +
                '<li><a href="register.html" class="hover:text-white">Create Account</a></li>' +
                '<li><a href="dashboard-new-order.html" class="hover:text-white">Upload &amp; Print</a></li>' +
                '<li><a href="dashboard-orders.html" class="hover:text-white">Track an Order</a></li>' +
              '</ul>' +
            '</div>' +
            '<div>' +
              '<h3 class="font-display text-sm tracking-widest mb-4 text-white">VISIT THE SHOP</h3>' +
              '<ul class="space-y-2 text-sm">' +
                '<li>14 Ludgate Row, Springfield, IL 62701</li>' +
                '<li>Mon&ndash;Sat: 8:00 AM &ndash; 8:00 PM</li>' +
                '<li>Sun: 10:00 AM &ndash; 4:00 PM</li>' +
                '<li><a href="tel:+15551230199" class="hover:text-white">+1 (555) 123-0199</a></li>' +
                '<li><a href="mailto:orders@sharplineprint.com" class="hover:text-white">orders@sharplineprint.com</a></li>' +
              '</ul>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="border-t border-white/10 py-5 text-xs">' +
          '<div class="container-shop flex flex-col sm:flex-row items-center justify-between gap-2" style="color:#8b8f9c">' +
            '<span>&copy; <span data-year>' + year + '</span> Sharpline Print &amp; Copy Co. All rights reserved.</span>' +
            '<span>Crafted for fast, precise printing.</span>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- Dashboard shell (sidebar + topbar) ---------------- */
  var DASH_NAV = [
    { page: "overview", href: "dashboard.html", label: "Overview", icon: '<path d="M3 3h8v8H3zM13 3h8v5h-8zM13 12h8v9h-8zM3 15h8v6H3z"/>' },
    { page: "new-order", href: "dashboard-new-order.html", label: "New Print Job", icon: '<path d="M12 5v14M5 12h14"/>' },
    { page: "orders", href: "dashboard-orders.html", label: "My Orders", icon: '<path d="M4 6h16M4 12h16M4 18h10"/>' }
  ];

  function buildDashboardShell() {
    if (document.body.getAttribute("data-area") !== "dashboard") return;
    var page = document.body.getAttribute("data-page") || "";
    var pageTitle = document.body.getAttribute("data-page-title") || "Dashboard";

    var navItems = DASH_NAV.map(function (item) {
      var active = item.page === page;
      return '<a href="' + item.href + '" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors"' +
        (active ? ' aria-current="page" style="background:var(--c-blue-600);color:#fff"' : ' style="color:var(--text)"') +
        ' onmouseover="if(!this.hasAttribute(\'aria-current\'))this.style.background=\'var(--bg-dim)\'" onmouseout="if(!this.hasAttribute(\'aria-current\'))this.style.background=\'\'">' +
        '<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + item.icon + '</svg>' +
        '<span>' + item.label + '</span></a>';
    }).join("");

    var sidebarInner =
      '<div class="h-16 flex items-center gap-2 px-5 border-b shrink-0" style="border-color:var(--border)">' +
        '<a href="index.html" class="flex items-center gap-2 font-display text-lg" aria-label="Sharpline home">' +
          '<span class="inline-flex items-center justify-center w-8 h-8 rounded-md text-white" style="background:var(--c-blue-600)">' + ICONS.printer.replace('class="w-7 h-7"', 'class="w-4 h-4"') + '</span> SHARPLINE' +
        '</a>' +
        '<button type="button" id="dash-sidebar-close" class="lg:hidden ms-auto p-2 rounded-md hover:bg-[var(--bg-dim)]" aria-label="Close menu">' + ICONS.close + '</button>' +
      '</div>' +
      '<nav class="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Dashboard">' + navItems + '</nav>' +
      '<div class="p-4 border-t space-y-3" style="border-color:var(--border)">' +
        '<a href="index.html" class="text-sm flex items-center gap-2 hover:text-[var(--c-blue-600)]" style="color:var(--text-muted)">&larr; Back to website</a>' +
        '<button type="button" data-logout class="btn btn-outline btn-sm w-full">Log out</button>' +
      '</div>';

    var sidebarHost = document.getElementById("dash-sidebar-root");
    if (sidebarHost) {
      sidebarHost.innerHTML =
        '<div id="dash-sidebar-backdrop" class="fixed inset-0 bg-black/50 z-[70] opacity-0 pointer-events-none lg:hidden" tabindex="-1"></div>' +
        '<aside id="dash-sidebar" class="closed fixed top-0 bottom-0 start-0 z-[80] w-72 flex flex-col bg-[var(--bg-elevated)] border-e" style="border-color:var(--border)">' + sidebarInner + '</aside>';
    }

    var topbarHost = document.getElementById("dash-topbar-root");
    if (topbarHost) {
      topbarHost.innerHTML =
        '<a href="#main-content" class="skip-link">Skip to main content</a>' +
        '<div class="sticky top-0 z-40 h-16 flex items-center gap-3 px-4 sm:px-6 border-b" style="background:var(--header-bg);backdrop-filter:blur(14px);border-color:var(--border)">' +
          '<button type="button" id="dash-sidebar-open" class="lg:hidden p-2 rounded-md hover:bg-[var(--bg-dim)]" aria-label="Open menu" aria-controls="dash-sidebar" aria-expanded="false">' + ICONS.menu + '</button>' +
          '<h1 class="font-display text-lg sm:text-xl truncate">' + pageTitle + '</h1>' +
          '<div class="ms-auto flex items-center gap-1 sm:gap-2">' +
            '<button type="button" id="theme-toggle" class="p-2 rounded-md hover:bg-[var(--bg-dim)]" aria-label="Toggle dark mode">' + ICONS.sun + ICONS.moon + '</button>' +
            '<button type="button" id="dir-toggle" class="p-2 rounded-md hover:bg-[var(--bg-dim)] hidden sm:flex items-center gap-1 text-xs font-mono" aria-label="Toggle text direction">' + ICONS.globe + '<span data-dir-label>RTL</span></button>' +
            '<div class="w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold text-white ms-1" style="background:var(--c-magenta-500)" data-account-initials>GC</div>' +
          '</div>' +
        '</div>';
    }

    updateThemeIcons(document.documentElement.getAttribute("data-theme") || "light");
    var dirLabel = (document.documentElement.getAttribute("dir") || "ltr") === "rtl" ? "LTR" : "RTL";
    document.querySelectorAll("[data-dir-label]").forEach(function (el) { el.textContent = dirLabel; });

    wireHeaderEvents();

    var sOpen = document.getElementById("dash-sidebar-open");
    var sClose = document.getElementById("dash-sidebar-close");
    var sidebar = document.getElementById("dash-sidebar");
    var sBackdrop = document.getElementById("dash-sidebar-backdrop");
    function openSidebar() {
      sidebar.classList.remove("closed");
      sBackdrop.classList.remove("opacity-0", "pointer-events-none");
      if (sOpen) sOpen.setAttribute("aria-expanded", "true");
    }
    function closeSidebar() {
      sidebar.classList.add("closed");
      sBackdrop.classList.add("opacity-0", "pointer-events-none");
      if (sOpen) sOpen.setAttribute("aria-expanded", "false");
    }
    if (sOpen) sOpen.addEventListener("click", openSidebar);
    if (sClose) sClose.addEventListener("click", closeSidebar);
    if (sBackdrop) sBackdrop.addEventListener("click", closeSidebar);
  }

  /* ---------------- Back to top button ---------------- */
  function buildBackToTop() {
    var host = document.getElementById("back-to-top-root");
    if (!host) return;
    host.innerHTML = '<button type="button" id="back-to-top" class="back-to-top btn btn-primary !rounded-full !p-3" aria-label="Back to top">' + ICONS.arrowUp + '</button>';
    document.getElementById("back-to-top").addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth") });
    });
  }

  /* ---------------- Toast ---------------- */
  window.showToast = function (message) {
    var host = document.getElementById("toast-root");
    if (!host) return;
    host.innerHTML = '<div class="toast" role="status" aria-live="polite">' + message + '</div>';
    var el = host.querySelector(".toast");
    requestAnimationFrame(function () { el.classList.add("show"); });
    setTimeout(function () { el.classList.remove("show"); }, 3200);
  };

  /* ---------------- Scroll reveal (native IntersectionObserver) ----------------
     Progressive enhancement only — see the .js-reveal-active gate in style.css.
     No external library, so nothing to fail to load and nothing that can drift
     out of sync with lazy-loaded images the way a pre-calculated scroll-position
     trigger can. A hard timeout guarantees everything ends up visible regardless. */
  function initReveal() {
    var els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;
    var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) return;

    document.documentElement.classList.add("js-reveal-active");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });

    setTimeout(function () {
      els.forEach(function (el) { el.classList.add("is-visible"); });
    }, 4000);
  }

  /* ---------------- Count-up stats (vanilla, IntersectionObserver) ---------------- */
  function initCountUp() {
    var els = document.querySelectorAll("[data-countup]");
    if (!els.length) return;
    var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function run(el) {
      var target = parseFloat(el.getAttribute("data-countup"));
      var suffix = el.getAttribute("data-countup-suffix") || "";
      var decimals = el.getAttribute("data-countup-decimals") ? parseInt(el.getAttribute("data-countup-decimals"), 10) : 0;
      if (reduced) { el.textContent = target.toFixed(decimals) + suffix; return; }
      var start = null, duration = 1400;
      function step(ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); }
        });
      }, { threshold: 0.5 });
      els.forEach(function (el) { io.observe(el); });
      // Safety net: guarantee every stat eventually shows its real number,
      // even if it never crosses the 50% visibility threshold (e.g. a very
      // short section, or a user who never scrolls past it).
      setTimeout(function () {
        io.disconnect();
        els.forEach(function (el) { if (el.textContent.trim() === "0" || el.textContent.trim() === "0" + (el.getAttribute("data-countup-suffix") || "")) run(el); });
      }, 4000);
    } else {
      els.forEach(run);
    }
  }

  /* ---------------- Typed hero (optional) ---------------- */
  function initTyped() {
    var target = document.getElementById("typed-target");
    if (!target || typeof Typed === "undefined") return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var strings = JSON.parse(target.getAttribute("data-strings") || "[]");
    if (!strings.length) return;
    new Typed("#typed-target", { strings: strings, typeSpeed: 42, backSpeed: 22, backDelay: 1400, loop: true, smartBackspace: true });
  }

  /* ---------------- Generic form validation ---------------- */
  window.validateForm = function (form) {
    var valid = true;
    form.querySelectorAll("[data-validate]").forEach(function (field) {
      var rule = field.getAttribute("data-validate");
      var errorEl = form.querySelector('[data-error-for="' + field.name + '"]');
      var value = field.value.trim();
      var fieldValid = true;

      if (rule.indexOf("required") !== -1 && !value) fieldValid = false;
      if (fieldValid && rule.indexOf("email") !== -1 && value) {
        fieldValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }
      if (fieldValid && rule.indexOf("phone") !== -1 && value) {
        fieldValid = /^[+]?[\d\s()-]{7,20}$/.test(value);
      }
      var minMatch = rule.match(/min:(\d+)/);
      if (fieldValid && minMatch && value) fieldValid = value.length >= parseInt(minMatch[1], 10);
      var maxMatch = rule.match(/max:(\d+)/);
      if (fieldValid && maxMatch && value) fieldValid = value.length <= parseInt(maxMatch[1], 10);

      field.setAttribute("aria-invalid", fieldValid ? "false" : "true");
      if (errorEl) errorEl.classList.toggle("hidden", fieldValid);
      field.classList.toggle("!border-[var(--c-magenta-500)]", !fieldValid);
      if (!fieldValid) valid = false;
    });
    return valid;
  };

  /* ---------------- Init ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    buildHeader();
    buildFooter();
    buildDashboardShell();
    buildBackToTop();
    document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    initReveal();
    initTyped();
    initCountUp();

    /* The browser's native #hash scroll-on-load happens before the JS-built
       fixed header exists and before #main-content gets its padding-top, so a
       direct link like services.html#business-cards lands in the wrong spot
       once that layout shift happens. Re-settle it once our layout is final. */
    if (window.location.hash) {
      var target = document.querySelector(window.location.hash);
      if (target) requestAnimationFrame(function () { target.scrollIntoView(); });
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(syncHeaderHeight, 150);
    });
    window.addEventListener("load", syncHeaderHeight);

    document.querySelectorAll("[data-tabs]").forEach(function (tabGroup) {
      var buttons = tabGroup.querySelectorAll("[data-tab-trigger]");
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var target = btn.getAttribute("data-tab-trigger");
          buttons.forEach(function (b) {
            var active = b === btn;
            b.setAttribute("aria-selected", active ? "true" : "false");
            b.classList.toggle("is-active-tab", active);
          });
          tabGroup.querySelectorAll("[data-tab-panel]").forEach(function (panel) {
            panel.classList.toggle("hidden", panel.getAttribute("data-tab-panel") !== target);
          });
        });
      });
    });

    document.querySelectorAll("[data-toggle-password]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var input = document.getElementById(btn.getAttribute("data-toggle-password"));
        if (!input) return;
        var isHidden = input.type === "password";
        input.type = isHidden ? "text" : "password";
        btn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
        btn.textContent = isHidden ? "Hide" : "Show";
      });
    });

    document.querySelectorAll("[data-qty-control]").forEach(function (wrap) {
      var input = wrap.querySelector("input[type=number]");
      wrap.querySelectorAll("[data-qty-step]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var step = parseInt(btn.getAttribute("data-qty-step"), 10);
          var min = parseInt(input.min, 10) || 1;
          var max = parseInt(input.max, 10) || 9999;
          var next = (parseInt(input.value, 10) || min) + step;
          input.value = Math.min(max, Math.max(min, next));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
    });

  });

  /* Apply persisted theme/dir immediately (in case inline head snippet missed something) */
  var storedTheme = getStoredTheme();
  if (storedTheme) document.documentElement.setAttribute("data-theme", storedTheme);
  var storedDir = getStoredDir();
  if (storedDir) document.documentElement.setAttribute("dir", storedDir);
})();
