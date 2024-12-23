// split-text [20241223b]
const initializeSplitText = a => {
  const b = a.style;
  const c = (a, b = 'char') => {
    const d = [];
    const e = [];
    const f = document.createDocumentFragment();
    const g = (a, b) => {
      const c = document.createElement('span');
      a.forEach(a => {
        c.dataset[a] = a !== 'whitespace' ? b : '';
      });
      c.textContent = b;
      return c;
    };
    [...a.childNodes].forEach(f => {
      if (f.nodeType === 3) {
        [...new Intl.Segmenter(a.closest('[lang]')?.getAttribute('lang') || 'en', b === 'word' ? { granularity: 'word' } : {}).segment(f.textContent.replace(/[\r\n\t]/g, '').replace(/\s{2,}/g, ' '))].forEach(a => {
          const c = a.segment.trim();
          const f = g([b, !c && 'whitespace'].filter(Boolean), c || ' ');
          d.push(f);
          e.push(f);
        });
        return;
      }
      d.push(f);
      if (f.hasChildNodes()) {
        [].push.apply(e, c(f, b));
      }
    });
    d.forEach(a => {
      f.appendChild(a);
    });
    a.textContent = '';
    a.appendChild(f);
    return e;
  }
  let d = c(a, 'word');
  //* Apply line break rule (Kinsoku)
  if (!a.hasAttribute('data-no-line-break-rule')) {
    const INVALID_LINE_START_CHARS = ['!', ')', ',', '-', '.', ':', ';', '?', ']', '}', '‐', '’', '”', '、', '。', '々', '〉', '》', '」', '』', '】', '〕', '〗', '〙', '〞', '〟', 'ゝ', 'ゞ', '゠', '・', 'ヽ', 'ヾ', '！', '）', '，', '．', '：', '；', '？', '］', '｝', '｠'];
    const INVALID_LINE_END_CHARS = ['(', '[', '{', '‘', '“', '〈', '《', '「', '『', '【', '〔', '〖', '〘', '〝', '（', '［', '｛', '｟'];
    let b;
    for (let i = 0; i < d.length; i++) {
      const a = d[i];
      if (a.parentElement.matches('[data-split-text]') && b && INVALID_LINE_START_CHARS.some(b => {
        return b === a.textContent;
      })) {
        b.textContent += a.textContent;
        b.dataset.word += a.textContent;
        a.remove();
        d.splice(i, 1);
        i--;
      } else {
        b = a;
      }
    }
    d.forEach((a, i) => {
      if (a.parentElement.matches('[data-split-text]') && INVALID_LINE_END_CHARS.some(b => {
        return b === a.textContent;
      })) {
        let b = d[i + 1];
        while (b && INVALID_LINE_END_CHARS.some(a => {
          return a === b.textContent;
        })) {
          a.textContent += b.textContent;
          a.dataset.word += b.dataset.word;
          b.remove();
          d.splice(i + 1, 1);
          b = d[i + 1];
        }
        if (b) {
          b.textContent = a.textContent + b.textContent;
          b.dataset.word = a.dataset.word + b.dataset.word;
          a.remove();
          d.splice(i, 1);
        }
      }
    });
  }
  //*/
  const f = c(a);
  b.setProperty('--word-length', d.length);
  d.forEach((a, i) => {
    a.style.setProperty('--word-index', i);
    if (!a.hasAttribute('data-whitespace')) {
      const b = document.createElement('span');
      b.style.cssText = `
        border: 0;
        clip: rect(0, 0, 0, 0);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        user-select: none; // Optional
        white-space: nowrap;
        width: 1px;
      `;
      b.textContent = a.textContent;
      a.appendChild(b);
    }
  });
  b.setProperty('--char-length', f.length);
  f.forEach((a, i) => {
    a.ariaHidden = 'true';
    a.style.setProperty('--char-index', i);
  });
  a.querySelectorAll(':is([data-word], [data-char]):not([data-whitespace])').forEach(a => {
    a.style.display = 'inline-block';
  });
  a.querySelectorAll('[data-char][data-whitespace]').forEach(a => {
    if (getComputedStyle(a).display !== 'inline') {
      a.innerHTML = '&nbsp;';
    }
  });
};
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-split-text]').forEach(a => {
    initializeSplitText(a);
  });
});