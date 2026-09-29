(function () {
  var header = document.querySelector("header");
  var nav = document.getElementById("siteNav");
  var toggle = document.getElementById("navToggle");
  var backdrop = document.getElementById("navBackdrop");
  var label = toggle ? toggle.querySelector(".nav-toggle-label") : null;
  var note = document.getElementById("drawerNote");
  var progress = document.getElementById("scrollProgress");
  var copy = document.getElementById("copyLink");
  var compact = window.matchMedia("(max-width: 1400px)");
  var phone = window.matchMedia("(max-width: 860px)");
  var lastFocus = null;
  var toastTimer = 0;

  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".nav-links a[href^='#']:not(.nav-cta)")
  );
  var sections = navLinks
    .map(function (link) {
      return document.querySelector(link.getAttribute("href"));
    })
    .filter(function (section, index, list) {
      return section && list.indexOf(section) === index;
    });

  function inView(el) {
    var box = el.getBoundingClientRect();
    return box.top < window.innerHeight * 0.92 && box.bottom > 40;
  }

  var seen = new WeakSet();
  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add("is-in");
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  function watch(el) {
    if (!el || seen.has(el)) return;
    seen.add(el);
    if (inView(el)) el.classList.add("is-in");
    revealObserver.observe(el);
  }

  function arm(scope) {
    var root = scope && scope.querySelectorAll ? scope : document;
    var itemSel = ".ep-card, .guest-card, .offer-card, .testi-card, .stat-box, .topic-list li, .event-row, .hero-grid > div";
    var items = [];
    if (root.matches && root.matches(itemSel)) items.push(root);
    root.querySelectorAll(itemSel).forEach(function (el) {
      items.push(el);
    });
    items.forEach(function (el) {
      el.classList.add("reveal-item");
      var peers = el.parentElement ? el.parentElement.querySelectorAll(itemSel) : [];
      var index = Array.prototype.indexOf.call(peers, el);
      if (index < 0) index = 0;
      el.style.setProperty("--d", Math.min(index, 5) * 70 + "ms");
      watch(el);
    });
    var blocks = [];
    if (root.matches && root.matches(".reveal")) blocks.push(root);
    root.querySelectorAll(".reveal").forEach(function (el) {
      blocks.push(el);
    });
    blocks.forEach(watch);
    root.querySelectorAll("img").forEach(bindZoom);
  }

  document.querySelectorAll(".reveal").forEach(watch);
  arm(document);

  var mo = new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        arm(node);
      });
      var host = record.target.closest ? record.target.closest("[data-msg]") : null;
      if (!host && record.target.matches && record.target.matches("[data-msg]")) host = record.target;
      if (host) {
        var text = host.textContent.trim();
        if (text) showToast(text);
      }
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });

  function setOpen(open) {
    document.body.classList.toggle("nav-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (label) label.textContent = open ? "Close" : "Menu";
    if (backdrop) backdrop.hidden = !open;
    if (nav) nav.inert = compact.matches && !open;
    if (open) {
      lastFocus = document.activeElement;
      var first = nav.querySelector("a, button");
      if (first) first.focus();
    } else if (lastFocus && lastFocus.focus) {
      lastFocus.focus();
    }
  }

  function syncInert() {
    if (!nav) return;
    nav.inert = compact.matches && !document.body.classList.contains("nav-open");
    if (!compact.matches) setOpen(false);
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      setOpen(!document.body.classList.contains("nav-open"));
    });
  }
  if (backdrop) backdrop.addEventListener("click", function () { setOpen(false); });
  if (nav) {
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });
  }
  compact.addEventListener("change", syncInert);
  syncInert();

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (lightbox && !lightbox.hidden) {
        closeLightbox();
        return;
      }
      if (document.body.classList.contains("nav-open")) setOpen(false);
      return;
    }
    if (event.key !== "Tab" || !document.body.classList.contains("nav-open") || !nav) return;
    var focusable = Array.prototype.slice.call(
      nav.querySelectorAll("a, button")
    ).filter(function (el) { return !el.hasAttribute("disabled"); });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function setActive(id) {
    navLinks.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + id);
    });
    document.querySelectorAll(".section-dots a").forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + id);
    });
    if (note) {
      var current = navLinks.filter(function (link) {
        return link.getAttribute("href") === "#" + id;
      })[0];
      note.textContent = current ? "You are here · " + current.textContent.trim() : "You are here";
    }
  }

  if (sections.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(function (section) { spy.observe(section); });
  }

  var dots = document.createElement("nav");
  dots.className = "section-dots";
  dots.setAttribute("aria-label", "On this page");
  sections.forEach(function (section) {
    var link = document.createElement("a");
    link.href = "#" + section.id;
    var match = navLinks.filter(function (item) {
      return item.getAttribute("href") === "#" + section.id;
    })[0];
    link.textContent = match ? match.textContent.trim() : section.id;
    dots.appendChild(link);
  });
  document.body.appendChild(dots);

  var top = document.createElement("button");
  top.type = "button";
  top.className = "to-top";
  top.setAttribute("aria-label", "Back to top");
  top.textContent = "↑";
  top.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  document.body.appendChild(top);

  var dock = document.createElement("a");
  dock.className = "mobile-dock";
  dock.href = "#work-with-me";
  dock.textContent = "Work with me";
  document.body.appendChild(dock);

  var toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 4200);
  }

  var lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.hidden = true;
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Photo");
  lightbox.innerHTML = '<button type="button" class="lightbox-close">Close</button><figure><img alt=""><figcaption></figcaption></figure>';
  document.body.appendChild(lightbox);
  var lightboxImage = lightbox.querySelector("img");
  var lightboxCaption = lightbox.querySelector("figcaption");

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function openLightbox(img) {
    lastFocus = document.activeElement;
    lightboxImage.src = img.currentSrc || img.src;
    lightboxImage.alt = img.alt || "";
    lightboxCaption.textContent = img.alt || "";
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightbox.querySelector(".lightbox-close").focus();
  }

  lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", function (event) {
    if (event.target === lightbox) closeLightbox();
  });

  function bindZoom(img) {
    if (!img || img.dataset.zoom || img.classList.contains("bg-photo") || img.closest(".lightbox")) return;
    img.dataset.zoom = "1";
    if (!img.closest("button")) {
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      if (img.alt) img.setAttribute("aria-label", "Enlarge photo: " + img.alt);
    }
  }

  document.querySelectorAll("img").forEach(bindZoom);

  document.addEventListener("click", function (event) {
    var card = event.target.closest(".offer-card");
    if (card && card.parentElement) {
      card.parentElement.querySelectorAll(".offer-card").forEach(function (item) {
        item.classList.toggle("is-picked", item === card);
      });
    }
    var img = event.target.closest(".hero-photo-frame img, .photo-frame img, .podcast-banner img, .guest-photo img, .book-cover-frame img");
    if (img) openLightbox(img);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    var img = event.target.closest(".hero-photo-frame img, .photo-frame img, .podcast-banner img, .book-cover-frame img");
    if (!img) return;
    event.preventDefault();
    openLightbox(img);
  });

  document.querySelectorAll(".faq-list summary").forEach(function (summary) {
    summary.addEventListener("click", function () {
      var item = summary.parentElement;
      if (item.open) return;
      document.querySelectorAll(".faq-list details").forEach(function (other) {
        if (other !== item) other.open = false;
      });
    });
  });

  if (copy) {
    copy.addEventListener("click", function () {
      var active = navLinks.filter(function (link) { return link.classList.contains("active"); })[0];
      var url = location.origin + location.pathname + (active ? active.getAttribute("href") : "");
      var done = function () { showToast("Link copied."); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(function () {
          copyFallback(url);
          done();
        });
      } else {
        copyFallback(url);
        done();
      }
    });
  }

  function copyFallback(url) {
    var field = document.createElement("textarea");
    field.value = url;
    document.body.appendChild(field);
    field.select();
    try { document.execCommand("copy"); } catch (error) { /* clipboard unavailable */ }
    field.remove();
  }

  var work = document.getElementById("work-with-me");
  var footer = document.querySelector("footer");

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    var height = document.documentElement.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle("is-scrolled", y > 12);
    if (progress) progress.style.transform = "scaleX(" + (height > 0 ? y / height : 0) + ")";
    top.classList.toggle("is-on", y > 700);
    var heroBox = document.querySelector(".hero");
    var pastHero = !heroBox || heroBox.getBoundingClientRect().bottom < 140;
    var workBox = work ? work.getBoundingClientRect() : null;
    var footBox = footer ? footer.getBoundingClientRect() : null;
    var overWork = workBox && workBox.top < window.innerHeight * 0.72 && workBox.bottom > 80;
    var overEnd = footBox && footBox.top < window.innerHeight * 0.8;
    var showDock = phone.matches && pastHero && !overWork && !overEnd;
    dock.classList.toggle("is-on", showDock);
    document.body.classList.toggle("has-dock", showDock);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
})();
