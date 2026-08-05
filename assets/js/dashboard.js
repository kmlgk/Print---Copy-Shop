/* ============================================================
   Sharpline Print & Copy Co. — customer dashboard logic
   Mock "backend" via localStorage: auth flag, orders (jobs),
   upload capture (metadata only), live price estimate, reorder.
   ============================================================ */

(function () {
  "use strict";

  var AUTH_KEY = "sharpline-auth";
  var ORDERS_KEY = "sharpline-orders";

  var SERVICES = {
    documents: { label: "Document Printing", base: 0.18, unit: "page" },
    "business-cards": { label: "Business Cards", base: 24.99, unit: "box of 100" },
    banners: { label: "Banners & Signs", base: 44.0, unit: "banner" },
    photos: { label: "Photo Prints", base: 0.42, unit: "print" }
  };

  var STATUS_FLOW = ["received", "processing", "printing", "ready", "picked_up"];
  var STATUS_META = {
    received: { label: "Order Received", percent: 15 },
    processing: { label: "Processing", percent: 40 },
    printing: { label: "Printing", percent: 70 },
    ready: { label: "Ready for Pickup", percent: 100 },
    picked_up: { label: "Picked Up", percent: 100 }
  };

  /* ---------------- Auth (mock) ---------------- */
  function getAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch (e) { return null; }
  }
  function setAuth(user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  }
  function ensureAuth() {
    var user = getAuth();
    if (!user) {
      user = { name: "Guest Customer", email: "guest@sharplineprint.com", guest: true };
      setAuth(user);
    }
    return user;
  }
  function logout() {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = "login.html";
  }

  /* ---------------- Orders (mock) ---------------- */
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function generateJobId(date) {
    var d = date || new Date();
    var rand = Math.floor(1000 + Math.random() * 8999);
    return "SP-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + rand;
  }
  function addDays(date, days) {
    var d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
  function formatDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  function formatDateTime(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  function getOrders() {
    try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; } catch (e) { return []; }
  }
  function saveOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  function seedOrders() {
    if (getOrders().length) return;
    var now = new Date();
    var seed = [
      {
        service: "documents", fileName: "Q3-board-report.pdf", fileSize: "3.1 MB",
        specs: { paperSize: "A4", color: "Full Color", sides: "Double-sided", binding: "Spiral Bound", copies: 5, turnaround: "Standard" },
        status: "ready", createdOffsetDays: -3, total: 38.25
      },
      {
        service: "business-cards", fileName: "sarah-chen-card-artwork.ai", fileSize: "1.8 MB",
        specs: { paperSize: "3.5x2 in", color: "Full Color", sides: "Double-sided", binding: "Matte Finish", copies: 2, turnaround: "Standard" },
        status: "printing", createdOffsetDays: -1, total: 49.98
      },
      {
        service: "banners", fileName: "grand-opening-banner.png", fileSize: "12.4 MB",
        specs: { paperSize: "3ft x 6ft", color: "Full Color", sides: "Single-sided", binding: "Grommets", copies: 1, turnaround: "Rush" },
        status: "processing", createdOffsetDays: 0, total: 96.0
      },
      {
        service: "photos", fileName: "family-reunion-2026.zip", fileSize: "48.2 MB",
        specs: { paperSize: "4x6 in", color: "Full Color", sides: "Single-sided", binding: "Glossy Finish", copies: 40, turnaround: "Standard" },
        status: "picked_up", createdOffsetDays: -9, total: 16.8
      }
    ];
    var orders = seed.map(function (o) {
      var created = addDays(now, o.createdOffsetDays);
      return {
        id: generateJobId(created),
        service: o.service,
        fileName: o.fileName,
        fileSize: o.fileSize,
        specs: o.specs,
        status: o.status,
        createdAt: created.toISOString(),
        eta: addDays(created, o.specs.turnaround === "Rush" ? 0 : 2).toISOString(),
        total: o.total,
        notes: ""
      };
    });
    saveOrders(orders);
  }

  /* Lightly auto-advance non-final orders so the tracker feels alive across visits */
  function simulateProgress() {
    var orders = getOrders();
    var changed = false;
    var now = Date.now();
    orders.forEach(function (o) {
      if (o.status === "ready" || o.status === "picked_up") return;
      var ageHours = (now - new Date(o.createdAt).getTime()) / 36e5;
      var idx = STATUS_FLOW.indexOf(o.status);
      var threshold = o.specs && o.specs.turnaround === "Rush" ? 2 : 6;
      if (ageHours > threshold * (idx + 1) && idx < STATUS_FLOW.length - 2) {
        o.status = STATUS_FLOW[idx + 1];
        changed = true;
      }
    });
    if (changed) saveOrders(orders);
  }

  function calculateEstimate(serviceKey, specs) {
    var svc = SERVICES[serviceKey];
    if (!svc) return 0;
    var copies = Math.max(1, parseInt(specs.copies, 10) || 1);
    var price = svc.base * copies;
    if (specs.color === "Full Color") price *= 1.0; else price *= 0.55;
    if (specs.sides === "Double-sided") price *= 0.92;
    var bindingFees = { "Spiral Bound": 3.5, "Stapled": 0.5, "Hardcover": 9, "Grommets": 6, "Matte Finish": 4, "Glossy Finish": 2, "None": 0 };
    price += bindingFees[specs.binding] || 0;
    if (specs.turnaround === "Rush") price *= 1.5;
    return Math.max(price, svc.base);
  }

  /* ---------------- Status badge / icon markup ---------------- */
  function statusBadge(status) {
    var meta = STATUS_META[status] || STATUS_META.received;
    return '<span class="status-badge status-' + status + '"><span class="w-1.5 h-1.5 rounded-full bg-current"></span>' + meta.label + '</span>';
  }

  function serviceLabel(key) {
    return (SERVICES[key] && SERVICES[key].label) || key;
  }

  /* ---------------- Render: recent orders (dashboard overview) ---------------- */
  function renderRecent(containerId, limit) {
    var host = document.getElementById(containerId);
    if (!host) return;
    var orders = getOrders().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).slice(0, limit || 3);
    if (!orders.length) {
      host.innerHTML = emptyState();
      return;
    }
    host.innerHTML = orders.map(orderRowHtml).join("");
    wireReorderButtons(host);
  }

  /* ---------------- Render: full orders list with filter ---------------- */
  function renderOrdersList(containerId) {
    var host = document.getElementById(containerId);
    if (!host) return;
    function paint(filter) {
      var orders = getOrders().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
      if (filter && filter !== "all") orders = orders.filter(function (o) { return o.status === filter; });
      host.innerHTML = orders.length ? orders.map(orderRowHtml).join("") : emptyState();
      wireReorderButtons(host);
    }
    paint("all");
    document.querySelectorAll("[data-order-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("[data-order-filter]").forEach(function (b) { b.classList.toggle("is-active-tab", b === btn); });
        paint(btn.getAttribute("data-order-filter"));
      });
    });
  }

  function emptyState() {
    return '<div class="ticket-card items-center text-center p-10">' +
      '<p class="font-display text-lg mb-2">NO JOBS YET</p>' +
      '<p class="text-sm mb-4" style="color:var(--text-muted)">Upload a file to start your first print job.</p>' +
      '<a href="dashboard-new-order.html" class="btn btn-primary btn-sm">Start a Print Job</a></div>';
  }

  function orderRowHtml(o) {
    var meta = STATUS_META[o.status] || STATUS_META.received;
    return '<div class="ticket-card sm:flex-row sm:items-center gap-4 p-5" data-order-row="' + o.id + '">' +
      '<div class="flex-1 min-w-0">' +
        '<div class="flex flex-wrap items-center gap-2 mb-1">' +
          '<span class="font-mono text-xs px-2 py-0.5 rounded" style="background:var(--bg-dim)">' + o.id + '</span>' +
          statusBadge(o.status) +
        '</div>' +
        '<a href="dashboard-order-details.html?id=' + encodeURIComponent(o.id) + '" class="font-display text-base sm:text-lg hover:text-[var(--c-blue-600)] block truncate">' + serviceLabel(o.service) + ' &mdash; ' + o.fileName + '</a>' +
        '<p class="text-xs mt-1" style="color:var(--text-muted)">Placed ' + formatDate(o.createdAt) + ' &middot; ' + o.specs.copies + ' &times; ' + o.specs.paperSize + ' &middot; ' + o.specs.color + '</p>' +
        '<div class="print-progress mt-3 max-w-xs"><span style="width:' + meta.percent + '%"></span></div>' +
      '</div>' +
      '<div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:text-right shrink-0">' +
        '<span class="price-tag text-lg">$' + o.total.toFixed(2) + '</span>' +
        '<div class="flex gap-2">' +
          '<a href="dashboard-order-details.html?id=' + encodeURIComponent(o.id) + '" class="btn btn-outline btn-sm">Track</a>' +
          '<button type="button" class="btn btn-secondary btn-sm" data-reorder="' + o.id + '">Reorder</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function wireReorderButtons(scope) {
    (scope || document).querySelectorAll("[data-reorder]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-reorder");
        reorder(id);
      });
    });
  }

  function reorder(orderId) {
    var orders = getOrders();
    var original = orders.find(function (o) { return o.id === orderId; });
    if (!original) return;
    var created = new Date();
    var clone = {
      id: generateJobId(created),
      service: original.service,
      fileName: original.fileName,
      fileSize: original.fileSize,
      specs: Object.assign({}, original.specs),
      status: "received",
      createdAt: created.toISOString(),
      eta: addDays(created, original.specs.turnaround === "Rush" ? 0 : 2).toISOString(),
      total: original.total,
      notes: "Reorder of " + original.id + " — using file already on file (no re-upload needed).",
      reorderOf: original.id
    };
    orders.unshift(clone);
    saveOrders(orders);
    if (window.showToast) window.showToast("Reordered " + serviceLabel(original.service) + " — new job " + clone.id + " created using your file on file.");
    setTimeout(function () { window.location.href = "dashboard-order-details.html?id=" + encodeURIComponent(clone.id); }, 900);
  }

  /* ---------------- Render: single order detail + timeline ---------------- */
  function renderOrderDetails(containerId) {
    var host = document.getElementById(containerId);
    if (!host) return;
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id");
    var orders = getOrders();
    var order = orders.find(function (o) { return o.id === id; }) || orders[0];
    if (!order) {
      host.innerHTML = emptyState();
      return;
    }
    var idx = STATUS_FLOW.indexOf(order.status === "picked_up" ? "ready" : order.status);
    var steps = ["received", "processing", "printing", "ready"];
    var timeline = steps.map(function (s, i) {
      var done = i <= idx;
      var meta = STATUS_META[s];
      return '<div class="flex-1 flex flex-col items-center text-center relative">' +
        '<div class="w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold z-10" style="background:' + (done ? "var(--c-blue-600)" : "var(--bg-dim)") + ';color:' + (done ? "#fff" : "var(--text-muted)") + ';border:2px solid ' + (done ? "var(--c-blue-600)" : "var(--border)") + '">' + (i + 1) + '</div>' +
        '<span class="text-xs mt-2 font-medium" style="color:' + (done ? "var(--text)" : "var(--text-muted)") + '">' + meta.label + '</span>' +
      '</div>';
    }).join('<div class="step-line flex-1 mt-4 -mx-2"></div>');

    host.innerHTML =
      '<div class="flex flex-wrap items-start justify-between gap-4 mb-6">' +
        '<div>' +
          '<div class="flex items-center gap-2 mb-2"><span class="font-mono text-xs px-2 py-1 rounded" style="background:var(--bg-dim)">' + order.id + '</span>' + statusBadge(order.status) + '</div>' +
          '<h1 class="font-display text-2xl sm:text-3xl">' + serviceLabel(order.service) + '</h1>' +
          '<p class="text-sm mt-1" style="color:var(--text-muted)">' + order.fileName + ' &middot; ' + order.fileSize + '</p>' +
        '</div>' +
        '<div class="text-end">' +
          '<span class="price-tag text-2xl block">$' + order.total.toFixed(2) + '</span>' +
          '<button type="button" class="btn btn-secondary btn-sm mt-2" data-reorder="' + order.id + '">Reorder this job</button>' +
        '</div>' +
      '</div>' +
      '<div class="ticket-card p-6 mb-6">' +
        '<div class="flex items-center">' + timeline + '</div>' +
        (order.status === "ready" ? '<p class="text-sm mt-5 p-3 rounded-lg" style="background:var(--status-ready,#d5f5e3); background:rgba(21,115,71,.12); color:#157347"><strong>Ready for pickup</strong> at 14 Ludgate Row, Springfield. Bring your job code ' + order.id + '.</p>' : '<p class="text-sm mt-5" style="color:var(--text-muted)">Estimated ready by <strong style="color:var(--text)">' + formatDate(order.eta) + '</strong>.</p>') +
      '</div>' +
      '<div class="grid sm:grid-cols-2 gap-6">' +
        '<div class="info-panel">' +
          '<h2 class="font-display text-base mb-4">JOB SPECIFICATIONS</h2>' +
          '<dl class="text-sm space-y-2">' +
            specRow("Paper / Size", order.specs.paperSize) +
            specRow("Color", order.specs.color) +
            specRow("Sides", order.specs.sides) +
            specRow("Finishing", order.specs.binding) +
            specRow("Copies", order.specs.copies) +
            specRow("Turnaround", order.specs.turnaround) +
          '</dl>' +
        '</div>' +
        '<div class="info-panel">' +
          '<h2 class="font-display text-base mb-4">ORDER INFO</h2>' +
          '<dl class="text-sm space-y-2">' +
            specRow("Placed on", formatDateTime(order.createdAt)) +
            specRow("Job code", order.id) +
            (order.reorderOf ? specRow("Reorder of", order.reorderOf) : "") +
            specRow("Pickup location", "14 Ludgate Row, Springfield") +
          '</dl>' +
          (order.notes ? '<p class="text-xs mt-4 italic" style="color:var(--text-muted)">' + order.notes + '</p>' : "") +
        '</div>' +
      '</div>';
    wireReorderButtons(host);
  }

  function specRow(label, value) {
    return '<div class="flex justify-between gap-4 py-1.5 border-b" style="border-color:var(--border)"><dt style="color:var(--text-muted)">' + label + '</dt><dd class="font-medium text-end">' + value + '</dd></div>';
  }

  /* ---------------- New order form wiring ---------------- */
  function initNewOrderForm() {
    var form = document.getElementById("new-order-form");
    if (!form) return;
    var presetService = new URLSearchParams(window.location.search).get("service");
    if (presetService && SERVICES[presetService]) form.service.value = presetService;
    var fileInput = document.getElementById("file-input");
    var uploadZone = document.getElementById("upload-zone");
    var fileNameEl = document.getElementById("file-name-display");
    var estimateEl = document.getElementById("price-estimate");
    var selectedFile = null;

    function refreshEstimate() {
      var specs = {
        paperSize: form.paperSize.value,
        color: form.color.value,
        sides: form.sides.value,
        binding: form.binding.value,
        copies: form.copies.value,
        turnaround: form.querySelector('input[name="turnaround"]:checked') ? form.querySelector('input[name="turnaround"]:checked').value : "Standard"
      };
      var est = calculateEstimate(form.service.value, specs);
      if (estimateEl) estimateEl.textContent = "$" + est.toFixed(2);
      return { specs: specs, est: est };
    }

    ["change", "input"].forEach(function (evt) {
      form.addEventListener(evt, function (e) {
        if (e.target.matches("select, input[type=number], input[name=turnaround]")) refreshEstimate();
      });
    });
    refreshEstimate();

    function handleFiles(files) {
      if (!files || !files.length) return;
      selectedFile = files[0];
      var sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(1);
      fileNameEl.textContent = selectedFile.name + " (" + sizeMb + " MB)";
      fileNameEl.classList.remove("hidden");
      document.getElementById("upload-placeholder").classList.add("hidden");
      form.setAttribute("data-file-attached", "true");
      var errorEl = form.querySelector('[data-error-for="file"]');
      if (errorEl) errorEl.classList.add("hidden");
    }

    if (uploadZone) {
      uploadZone.addEventListener("click", function () { fileInput.click(); });
      uploadZone.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });
      ["dragenter", "dragover"].forEach(function (evt) {
        uploadZone.addEventListener(evt, function (e) { e.preventDefault(); uploadZone.classList.add("dragover"); });
      });
      ["dragleave", "drop"].forEach(function (evt) {
        uploadZone.addEventListener(evt, function (e) { e.preventDefault(); uploadZone.classList.remove("dragover"); });
      });
      uploadZone.addEventListener("drop", function (e) { handleFiles(e.dataTransfer.files); });
    }
    if (fileInput) fileInput.addEventListener("change", function (e) { handleFiles(e.target.files); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var formValid = window.validateForm(form);
      var fileErrorEl = form.querySelector('[data-error-for="file"]');
      if (!selectedFile) {
        if (fileErrorEl) fileErrorEl.classList.remove("hidden");
        formValid = false;
      }
      if (!formValid) {
        if (window.showToast) window.showToast("Please fix the highlighted fields.");
        return;
      }
      var result = refreshEstimate();
      var created = new Date();
      var order = {
        id: generateJobId(created),
        service: form.service.value,
        fileName: selectedFile.name,
        fileSize: (selectedFile.size / (1024 * 1024)).toFixed(1) + " MB",
        specs: result.specs,
        status: "received",
        createdAt: created.toISOString(),
        eta: addDays(created, result.specs.turnaround === "Rush" ? 0 : 2).toISOString(),
        total: result.est,
        notes: form.notes.value.trim()
      };
      var orders = getOrders();
      orders.unshift(order);
      saveOrders(orders);
      if (window.showToast) window.showToast("Job " + order.id + " submitted — we’ll email you when it’s ready.");
      setTimeout(function () { window.location.href = "dashboard-order-details.html?id=" + encodeURIComponent(order.id); }, 900);
    });
  }

  /* ---------------- Account chrome (name, stats) ---------------- */
  function paintAccountChrome() {
    var user = ensureAuth();
    document.querySelectorAll("[data-account-name]").forEach(function (el) { el.textContent = user.name; });
    document.querySelectorAll("[data-account-email]").forEach(function (el) { el.textContent = user.email; });
    var initials = user.name.split(" ").map(function (p) { return p[0]; }).join("").slice(0, 2).toUpperCase();
    document.querySelectorAll("[data-account-initials]").forEach(function (el) { el.textContent = initials; });
    var logoutBtns = document.querySelectorAll("[data-logout]");
    logoutBtns.forEach(function (btn) { btn.addEventListener("click", logout); });
  }

  function paintStats() {
    var orders = getOrders();
    var active = orders.filter(function (o) { return o.status !== "ready" && o.status !== "picked_up"; }).length;
    var ready = orders.filter(function (o) { return o.status === "ready"; }).length;
    var total = orders.length;
    var spend = orders.reduce(function (s, o) { return s + o.total; }, 0);
    setText("stat-active", active);
    setText("stat-ready", ready);
    setText("stat-total", total);
    setText("stat-spend", "$" + spend.toFixed(2));
  }
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

  /* ---------------- Auth forms (login / register) ---------------- */
  function initAuthForms() {
    var loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!window.validateForm(loginForm)) return;
        var email = loginForm.email.value.trim();
        var name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
        setAuth({ name: name || "Customer", email: email });
        if (window.showToast) window.showToast("Welcome back! Redirecting to your dashboard…");
        setTimeout(function () { window.location.href = "dashboard.html"; }, 600);
      });
    }
    var registerForm = document.getElementById("register-form");
    if (registerForm) {
      registerForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var valid = window.validateForm(registerForm);
        var pwErrorEl = registerForm.querySelector('[data-error-for="confirmPassword"]');
        if (registerForm.password.value !== registerForm.confirmPassword.value) {
          if (pwErrorEl) pwErrorEl.classList.remove("hidden");
          valid = false;
        } else if (pwErrorEl) pwErrorEl.classList.add("hidden");
        var termsBox = registerForm.querySelector('input[type="checkbox"]');
        if (termsBox && !termsBox.checked) {
          valid = false;
          if (window.showToast) window.showToast("Please agree to the terms of service to continue.");
        }
        if (!valid) return;
        setAuth({ name: registerForm.fullName.value.trim(), email: registerForm.email.value.trim() });
        if (window.showToast) window.showToast("Account created! Redirecting to your dashboard…");
        setTimeout(function () { window.location.href = "dashboard.html"; }, 600);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initAuthForms();
    if (document.body.getAttribute("data-area") !== "dashboard") return;
    seedOrders();
    simulateProgress();
    paintAccountChrome();
    paintStats();
    renderRecent("recent-orders", 3);
    renderOrdersList("orders-list");
    renderOrderDetails("order-details");
    initNewOrderForm();
  });

  window.SharplineDashboard = { reorder: reorder, getOrders: getOrders };
})();
