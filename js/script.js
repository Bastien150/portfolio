/* Portfolio — Bastien Forest · scripts partagés (aucune dépendance) */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Thème clair / sombre, mémorisé dans localStorage */
  var themeBtn = document.getElementById('theme-toggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeMeta) themeMeta.setAttribute('content', theme === 'light' ? '#f3f2ed' : '#101522');
  }

  applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch (e) { /* stockage indisponible */ }
    });
  }

  /* Menu mobile */
  var header = document.querySelector('.site-header');
  var menuBtn = document.querySelector('.menu-toggle');
  var nav = document.getElementById('primary-nav');

  function setMenu(open) {
    if (!menuBtn || !nav) return;
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuBtn.focus();
      }
    });
    window.matchMedia('(min-width: 960px)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* En-tête discret + retour en haut */
  var toTop = document.getElementById('to-top');

  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (toTop) toTop.classList.toggle('is-visible', y > 700);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* Indicateur de section active */
  var spyLinks = Array.prototype.slice.call(document.querySelectorAll('[data-spy]'));
  var sections = [];

  spyLinks.forEach(function (link) {
    link.getAttribute('data-spy').split(' ').forEach(function (id) {
      var el = document.getElementById(id);
      if (el && sections.indexOf(el) === -1) sections.push(el);
    });
  });

  function setActive(id) {
    spyLinks.forEach(function (link) {
      var match = link.getAttribute('data-spy').split(' ').indexOf(id) !== -1;
      if (match) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  if (sections.length && 'IntersectionObserver' in window) {
    var visible = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { visible[entry.target.id] = entry.isIntersecting; });
      for (var i = 0; i < sections.length; i++) {
        if (visible[sections[i].id]) { setActive(sections[i].id); return; }
      }
    }, { rootMargin: '-35% 0px -55% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* Apparition discrète au défilement */
  var revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* Schéma d'infrastructure interactif */
  var nodes = Array.prototype.slice.call(document.querySelectorAll('.node[data-service]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.svc-panel'));

  function showService(id) {
    nodes.forEach(function (n) {
      n.setAttribute('aria-pressed', String(n.getAttribute('data-service') === id));
    });
    panels.forEach(function (p) { p.hidden = p.id !== 'svc-' + id; });
  }

  if (nodes.length && panels.length) {
    nodes.forEach(function (n) {
      n.addEventListener('click', function () { showService(n.getAttribute('data-service')); });
    });
    showService(nodes[0].getAttribute('data-service'));
  }

  /* Lightbox des captures (élément <dialog>) */
  var triggers = document.querySelectorAll('[data-lightbox]');

  if (triggers.length && typeof HTMLDialogElement === 'function') {
    var dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.setAttribute('aria-label', 'Capture agrandie');
    dialog.innerHTML =
      '<div class="lightbox-inner">' +
      '<button type="button" class="icon-btn lightbox-close" aria-label="Fermer l’image">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<img alt=""><p class="lightbox-cap"></p></div>';
    document.body.appendChild(dialog);

    var lbImg = dialog.querySelector('img');
    var lbCap = dialog.querySelector('.lightbox-cap');

    Array.prototype.forEach.call(triggers, function (btn) {
      btn.addEventListener('click', function () {
        var img = btn.querySelector('img');
        lbImg.src = btn.getAttribute('data-lightbox');
        lbImg.alt = img ? img.alt : '';
        lbCap.textContent = btn.getAttribute('data-caption') || '';
        dialog.showModal();
      });
    });

    dialog.addEventListener('click', function (e) {
      if (e.target === dialog || e.target.closest('.lightbox-close')) dialog.close();
    });
    dialog.addEventListener('close', function () { lbImg.removeAttribute('src'); });
  }

  /* Formulaire de contact */
  var form = document.getElementById('contact-form');

  if (form) {
    var statusEl = document.getElementById('cf-status');
    var submitBtn = document.getElementById('cf-submit');
    var tsField = document.getElementById('cf-ts');
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var openedAt = Date.now();

    if (tsField) tsField.value = String(openedAt);

    var rules = {
      name: function (v) {
        if (!v) return 'Indiquez votre nom.';
        if (v.length < 2) return 'Le nom est trop court.';
        return '';
      },
      email: function (v) {
        if (!v) return 'Indiquez votre adresse e-mail.';
        if (!emailRe.test(v)) return 'Le format de l’adresse e-mail n’est pas valide (exemple : nom@domaine.fr).';
        return '';
      },
      subject: function (v) {
        return v.length > 150 ? 'L’objet ne doit pas dépasser 150 caractères.' : '';
      },
      message: function (v) {
        if (!v) return 'Écrivez votre message.';
        if (v.length < 10) return 'Le message doit contenir au moins 10 caractères.';
        if (v.length > 3000) return 'Le message ne doit pas dépasser 3000 caractères.';
        return '';
      }
    };

    var showError = function (name, msg) {
      var input = form.elements[name];
      var err = document.getElementById('cf-' + name + '-err');
      if (!input || !err) return;
      err.textContent = msg;
      if (msg) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    };

    var check = function (name) {
      var msg = rules[name](form.elements[name].value.trim());
      showError(name, msg);
      return msg === '';
    };

    var setStatus = function (state, text) {
      statusEl.setAttribute('data-state', state);
      statusEl.textContent = text;
    };

    Object.keys(rules).forEach(function (name) {
      form.elements[name].addEventListener('blur', function () { check(name); });
      form.elements[name].addEventListener('input', function () {
        if (this.getAttribute('aria-invalid') === 'true') check(name);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      setStatus('', '');

      var firstInvalid = null;
      Object.keys(rules).forEach(function (name) {
        if (!check(name) && !firstInvalid) firstInvalid = form.elements[name];
      });

      if (firstInvalid) {
        firstInvalid.focus();
        setStatus('error', 'Le formulaire contient des erreurs. Corrigez les champs signalés puis réessayez.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi en cours…';

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' }
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (r) {
          if (r.ok && r.data.ok) {
            form.reset();
            if (tsField) tsField.value = String(Date.now());
            setStatus('success', 'Merci, votre message a bien été envoyé. Je vous répondrai dès que possible.');
          } else {
            if (r.data.errors) {
              Object.keys(r.data.errors).forEach(function (name) { showError(name, r.data.errors[name]); });
            }
            setStatus('error', r.data.message || 'L’envoi a échoué. Vous pouvez m’écrire directement à bastienforest01@gmail.com.');
          }
        })
        .catch(function () {
          setStatus('error', 'Impossible de contacter le serveur. Vous pouvez m’écrire directement à bastienforest01@gmail.com.');
        })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Envoyer le message';
          statusEl.focus();
        });
    });

    /* Retour de contact.php lorsque JavaScript est indisponible */
    var params = new URLSearchParams(window.location.search);
    if (params.get('contact') === 'ok') {
      setStatus('success', 'Merci, votre message a bien été envoyé. Je vous répondrai dès que possible.');
    } else if (params.get('contact') === 'error') {
      setStatus('error', 'L’envoi a échoué. Vérifiez les champs ou écrivez-moi directement à bastienforest01@gmail.com.');
    }
  }
})();
