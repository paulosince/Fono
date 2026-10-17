(function () {
  'use strict';

  var CONFETTI_COLORS = ['#f2b45a', '#2f7f86', '#e67a7a', '#7fb77e', '#8d7fd0', '#f4d35e'];
  var CONFETTI_COUNT = 90;

  var data = null;
  var state = {
    lang: 'en',
    animations: true,
    story: null,      // current story object
    order: [],        // shuffled option ids for the current story
    wrong: [],        // option ids already answered wrong
    solved: false
  };

  var el = {
    root: document.documentElement,
    back: document.getElementById('back'),
    langs: document.getElementById('langs'),
    animToggle: document.getElementById('anim-toggle'),
    listView: document.getElementById('list-view'),
    storyView: document.getElementById('story-view'),
    grid: document.getElementById('story-grid'),
    title: document.getElementById('story-title'),
    images: document.getElementById('story-images'),
    text: document.getElementById('story-text'),
    options: document.getElementById('options'),
    feedback: document.getElementById('feedback'),
    confetti: document.getElementById('confetti'),
    loadError: document.getElementById('load-error')
  };

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

  // ---------- Rendering ----------

  function renderUi() {
    el.root.lang = state.lang;
    var nodes = document.querySelectorAll('[data-ui]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-ui'));
    }
    el.animToggle.setAttribute('aria-label', t('animations'));
    el.back.setAttribute('aria-label', t('back'));
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

  function renderList() {
    el.grid.textContent = '';
    data.stories.forEach(function (story) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'story-card';

      var num = document.createElement('span');
      num.className = 'story-card-number';
      num.textContent = story.card;

      var title = document.createElement('span');
      title.className = 'story-card-title';
      title.textContent = tr(story.title);

      btn.appendChild(num);
      btn.appendChild(title);
      btn.addEventListener('click', function () { openStory(story); });
      li.appendChild(btn);
      el.grid.appendChild(li);
    });
  }

  function renderStory() {
    var story = state.story;
    el.title.textContent = tr(story.title);

    el.images.textContent = '';
    (story.images || []).forEach(function (image) {
      var img = document.createElement('img');
      img.src = image.src;
      img.alt = image.alt ? tr(image.alt) : '';
      img.loading = 'lazy';
      el.images.appendChild(img);
    });

    el.text.textContent = '';
    tr(story.text).forEach(function (paragraph) {
      var p = document.createElement('p');
      p.textContent = paragraph;
      el.text.appendChild(p);
    });

    renderOptions();
    renderFeedback();
  }

  function renderOptions() {
    el.options.textContent = '';
    state.order.forEach(function (id, index) {
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
      if (state.solved && id === state.story.correctOptionId) markCorrect(btn, false);
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

  // ---------- Actions ----------

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

  function openStory(story) {
    state.story = story;
    state.order = shuffle(story.options.map(function (o) { return o.id; }));
    state.wrong = [];
    state.solved = false;
    clearConfetti();
    renderStory();
    el.listView.hidden = true;
    el.storyView.hidden = false;
    el.back.hidden = false;
    window.scrollTo(0, 0);
  }

  function closeStory() {
    state.story = null;
    clearConfetti();
    el.storyView.hidden = true;
    el.listView.hidden = false;
    el.back.hidden = true;
    window.scrollTo(0, 0);
  }

  function setLang(code) {
    state.lang = code;
    renderUi();
    renderList();
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
    renderList();

    el.back.addEventListener('click', closeStory);
    el.animToggle.addEventListener('change', function () { setAnimations(el.animToggle.checked); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.story) closeStory();
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
      el.listView.hidden = true;
      el.loadError.hidden = false;
    });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) { console.error(err); });
    });
  }
})();
