(function () {
  'use strict';

  var CONFETTI_COLORS = ['#f2b45a', '#3d5a80', '#e07a5f', '#7fb77e', '#8d7fd0', '#f4d35e'];
  var CONFETTI_COUNT = 90;
  var TAP_SLOP = 8;          // px of movement still treated as a tap
  var SWIPE_MIN = 60;        // px, or 22% of the card width, whichever is larger
  var FLY_MS = 300;          // keep in sync with .deck-card.flying in the CSS

  var data = null;
  var state = {
    lang: 'en',
    animations: true,
    order: [],        // story indexes; order[0] is the top of the deck
    busy: false,      // a card is flying out
    story: null,      // current story object
    optionOrder: [],  // shuffled option ids for the current story
    wrong: [],        // option ids already answered wrong
    solved: false
  };

  var el = {
    root: document.documentElement,
    back: document.getElementById('back'),
    langs: document.getElementById('langs'),
    animToggle: document.getElementById('anim-toggle'),
    deckView: document.getElementById('deck-view'),
    deck: document.getElementById('deck'),
    prev: document.getElementById('prev'),
    next: document.getElementById('next'),
    storyView: document.getElementById('story-view'),
    image: document.getElementById('story-image'),
    text: document.getElementById('story-text'),
    number: document.getElementById('story-number'),
    options: document.getElementById('options'),
    feedback: document.getElementById('feedback'),
    confetti: document.getElementById('confetti'),
    loadError: document.getElementById('load-error')
  };

  var cards = []; // deck card elements, indexed like data.stories

  // ---------- Helpers ----------

  function t(key) {
    return (data.ui[state.lang] && data.ui[state.lang][key]) || data.ui[data.defaultLanguage][key] || '';
  }

  function tr(field) {
    return field[state.lang] || field[data.defaultLanguage];
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function findOption(id) {
    for (var i = 0; i < state.story.options.length; i++) {
      if (state.story.options[i].id === id) return state.story.options[i];
    }
    return null;
  }

  function mainImage(story) {
    return (story.images && story.images[0]) || null;
  }

  // ---------- UI chrome ----------

  function renderUi() {
    el.root.lang = state.lang;
    var nodes = document.querySelectorAll('[data-ui]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-ui'));
    }
    el.animToggle.setAttribute('aria-label', t('animations'));
    el.back.setAttribute('aria-label', t('back'));
    el.prev.setAttribute('aria-label', t('previous'));
    el.next.setAttribute('aria-label', t('next'));
    document.title = 'Fono — ' + t('chooseStory');

    var buttons = el.langs.querySelectorAll('.lang');
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].setAttribute('aria-pressed', String(buttons[j].dataset.lang === state.lang));
    }
  }

  function renderLangButtons() {
    data.languages.forEach(function (lang) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lang';
      btn.dataset.lang = lang.code;
      btn.title = lang.label;
      btn.setAttribute('aria-label', lang.label);
      var img = document.createElement('img');
      img.src = lang.flag;
      img.alt = '';
      btn.appendChild(img);
      btn.addEventListener('click', function () { setLang(lang.code); });
      el.langs.appendChild(btn);
    });
  }

  // ---------- Deck ----------

  function buildDeck() {
    el.deck.textContent = '';
    cards = data.stories.map(function (story, index) {
      var card = document.createElement('div');
      card.className = 'card card-back deck-card';
      card.setAttribute('role', 'button');

      var inner = document.createElement('div');
      inner.className = 'card-inner';
      var image = mainImage(story);
      if (image) {
        var img = document.createElement('img');
        img.src = image.src;
        img.draggable = false;
        inner.appendChild(img);
      }
      var num = document.createElement('span');
      num.className = 'card-number';
      num.textContent = story.card;
      inner.appendChild(num);
      card.appendChild(inner);

      bindDrag(card, index);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openStory(index);
        }
      });
      el.deck.appendChild(card);
      return card;
    });
    state.order = data.stories.map(function (_, i) { return i; });
    updateDeckLabels();
    layoutDeck();
  }

  function updateDeckLabels() {
    cards.forEach(function (card, index) {
      var story = data.stories[index];
      card.setAttribute('aria-label', story.card + ' — ' + tr(story.title));
      var img = card.querySelector('img');
      var image = mainImage(story);
      if (img && image) img.alt = image.alt ? tr(image.alt) : '';
    });
  }

  function layoutDeck() {
    state.order.forEach(function (storyIndex, pos) {
      var card = cards[storyIndex];
      card.dataset.pos = pos < 3 ? String(pos) : 'rest';
      card.tabIndex = pos === 0 ? 0 : -1;
      card.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
    });
  }

  // Top card goes to the bottom of the deck. direction: -1 = left, 1 = right.
  function sendTopToBack(direction) {
    if (state.busy) return;
    var card = cards[state.order[0]];

    function finish() {
      card.classList.remove('flying', 'dragging');
      card.style.transform = '';
      state.order.push(state.order.shift());
      layoutDeck();
      state.busy = false;
    }

    if (!state.animations) {
      finish();
      return;
    }

    state.busy = true;
    card.classList.remove('dragging');
    card.classList.add('flying');
    card.style.transform = 'translateX(' + (direction * 130) + '%) rotate(' + (direction * 18) + 'deg)';
    // A timer instead of transitionend: it fires even if the transition is skipped.
    setTimeout(finish, FLY_MS + 20);
  }

  function bringBackToTop() {
    if (state.busy) return;
    state.order.unshift(state.order.pop());
    layoutDeck();
  }

  function bindDrag(card, index) {
    var startX = 0, startY = 0, dx = 0, pointerId = null, moved = false;

    card.addEventListener('pointerdown', function (e) {
      if (card.dataset.pos !== '0' || state.busy || pointerId !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      moved = false;
      card.setPointerCapture(pointerId);
    });

    card.addEventListener('pointermove', function (e) {
      if (e.pointerId !== pointerId) return;
      dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > TAP_SLOP && Math.abs(dx) > Math.abs(e.clientY - startY)) {
        moved = true;
        card.classList.add('dragging');
      }
      if (moved) {
        card.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 20) + 'deg)';
      }
    });

    function release(e, cancelled) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      if (!moved) {
        if (!cancelled) openStory(index);
        return;
      }
      var threshold = Math.max(SWIPE_MIN, card.offsetWidth * 0.22);
      if (!cancelled && Math.abs(dx) >= threshold) {
        sendTopToBack(dx < 0 ? -1 : 1);
      } else {
        card.classList.remove('dragging');
        card.style.transform = '';
      }
    }

    card.addEventListener('pointerup', function (e) { release(e, false); });
    card.addEventListener('pointercancel', function (e) { release(e, true); });
  }

  // ---------- Story ----------

  function renderStory() {
    var story = state.story;
    var image = mainImage(story);
    el.image.hidden = !image;
    if (image) {
      el.image.src = image.src;
      el.image.alt = image.alt ? tr(image.alt) : '';
    }
    el.text.textContent = tr(story.text).join(' ');
    el.number.textContent = story.card;
    renderOptions();
    renderFeedback();
  }

  function renderOptions() {
    el.options.textContent = '';
    state.optionOrder.forEach(function (id, index) {
      var option = findOption(id);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option';
      btn.dataset.id = id;

      var letter = document.createElement('span');
      letter.className = 'option-letter';
      letter.setAttribute('aria-hidden', 'true');
      letter.textContent = String.fromCharCode(65 + index);

      var text = document.createElement('span');
      text.textContent = tr(option.text);

      btn.appendChild(letter);
      btn.appendChild(text);

      if (state.wrong.indexOf(id) !== -1) markWrong(btn, false);
      if (state.solved && id === state.story.correctOptionId) markCorrect(btn);
      if (state.solved) btn.disabled = true;

      btn.addEventListener('click', function () { answer(id, btn); });
      el.options.appendChild(btn);
    });
  }

  function renderFeedback() {
    el.feedback.className = 'feedback';
    if (state.solved) {
      el.feedback.textContent = t('correct');
      el.feedback.classList.add('is-correct');
    } else if (state.wrong.length) {
      el.feedback.textContent = t('tryAgain');
      el.feedback.classList.add('is-wrong');
    } else {
      el.feedback.textContent = '';
    }
  }

  function markWrong(btn, animate) {
    btn.classList.remove('is-wrong');
    if (animate) void btn.offsetWidth; // restart the CSS animation
    btn.classList.add('is-wrong');
    btn.disabled = true;
  }

  function markCorrect(btn) {
    btn.classList.add('is-correct');
  }

  function answer(id, btn) {
    if (state.solved || state.wrong.indexOf(id) !== -1) return;

    if (id === state.story.correctOptionId) {
      state.solved = true;
      markCorrect(btn);
      var all = el.options.querySelectorAll('.option');
      for (var i = 0; i < all.length; i++) all[i].disabled = true;
      if (state.animations) launchConfetti();
    } else {
      state.wrong.push(id);
      markWrong(btn, true);
    }
    renderFeedback();
  }

  function openStory(index) {
    var story = data.stories[index];
    state.story = story;
    state.optionOrder = shuffle(story.options.map(function (o) { return o.id; }));
    state.wrong = [];
    state.solved = false;
    clearConfetti();
    renderStory();
    el.deckView.hidden = true;
    el.storyView.hidden = false;
    el.back.hidden = false;
    window.scrollTo(0, 0);
  }

  function closeStory() {
    state.story = null;
    clearConfetti();
    el.storyView.hidden = true;
    el.deckView.hidden = false;
    el.back.hidden = true;
    window.scrollTo(0, 0);
    var top = cards[state.order[0]];
    if (top) top.focus({ preventScroll: true });
  }

  // ---------- Settings ----------

  function setLang(code) {
    state.lang = code;
    renderUi();
    updateDeckLabels();
    if (state.story) renderStory();
  }

  function setAnimations(on) {
    state.animations = on;
    el.animToggle.checked = on;
    el.root.classList.toggle('no-anim', !on);
    if (!on) clearConfetti();
  }

  // ---------- Confetti (JS creates pieces, CSS animates them) ----------

  function launchConfetti() {
    clearConfetti();
    for (var i = 0; i < CONFETTI_COUNT; i++) {
      var piece = document.createElement('span');
      piece.className = 'confetti-piece';
      var w = 6 + Math.random() * 8;
      piece.style.setProperty('--x', (Math.random() * 100) + 'vw');
      piece.style.setProperty('--w', w + 'px');
      piece.style.setProperty('--h', (w * (1.2 + Math.random())) + 'px');
      piece.style.setProperty('--color', CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
      piece.style.setProperty('--delay', (Math.random() * 0.6) + 's');
      piece.style.setProperty('--duration', (2.2 + Math.random() * 1.4) + 's');
      piece.style.setProperty('--drift', ((Math.random() - 0.5) * 200) + 'px');
      piece.style.setProperty('--rot', ((Math.random() - 0.5) * 1440) + 'deg');
      piece.addEventListener('animationend', function (e) { e.target.remove(); });
      el.confetti.appendChild(piece);
    }
  }

  function clearConfetti() {
    el.confetti.textContent = '';
  }

  // ---------- Init ----------

  function init(json) {
    data = json;
    state.lang = data.defaultLanguage;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setAnimations(!reduceMotion);

    renderLangButtons();
    renderUi();
    buildDeck();

    el.back.addEventListener('click', closeStory);
    el.next.addEventListener('click', function () { sendTopToBack(-1); });
    el.prev.addEventListener('click', bringBackToTop);
    el.animToggle.addEventListener('change', function () { setAnimations(el.animToggle.checked); });
    document.addEventListener('keydown', function (e) {
      if (state.story) {
        if (e.key === 'Escape') closeStory();
        return;
      }
      if (e.key === 'ArrowRight') sendTopToBack(-1);
      else if (e.key === 'ArrowLeft') bringBackToTop();
    });
  }

  fetch('data/stories.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(init)
    .catch(function (err) {
      console.error(err);
      el.deckView.hidden = true;
      el.loadError.hidden = false;
    });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) { console.error(err); });
    });
  }
})();
