export default class {
  constructor(a, options) {
    this.options = { ...{ lineBreak: true }, ...options };
    this.lineBreak = this.options.lineBreak;
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
          const c = a.closest('[lang]');
          [...new Intl.Segmenter(c ? c.lang : 'en', b === 'word' ? { granularity: 'word' } : {}).segment(f.textContent.replace(/[\r\n\t]/g, '').replace(/\s{2,}/g, ' '))].forEach(a => {
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
    if (this.lineBreak) {
      const INVALID_LINE_START_CHARS = ['!', ')', ',', '-', '.', ':', ';', '?', ']', '}', '‐', '’', '”', '‥', '…', '、', '。', '々', '〉', '》', '」', '』', '】', '〕', '〗', '〙', '〞', '〟', 'ゝ', 'ゞ', '゠', '・', 'ヽ', 'ヾ', '！', '）', '，', '．', '：', '；', '？', '］', '｝', '｠'];
      const INVALID_LINE_END_CHARS = ['(', '[', '{', '‘', '“', '〈', '《', '「', '『', '【', '〔', '〖', '〘', '〝', '（', '［', '｛', '｟'];
      const INVALID_SEPARATE_CHARS = ['―', '‥', '…'];
      let b;
      for (let i = 0; i < d.length; i++) {
        const c = d[i];
        if (c.parentElement === a && b && INVALID_LINE_START_CHARS.some(a => a === c.textContent)) {
          b.dataset.word = b.textContent += c.textContent;
          c.remove();
          d.splice(i, 1);
          i--;
        } else {
          b = c;
        }
      }
      d.forEach((b, i) => {
        if (b.parentElement === a && INVALID_LINE_END_CHARS.some(a => a === b.textContent)) {
          let a = d[i + 1];
          while (a && INVALID_LINE_END_CHARS.some(b => b === a.textContent)) {
            b.dataset.word = b.textContent += a.textContent;
            a.remove();
            d.splice(i + 1, 1);
            a = d[i + 1];
          }
          if (a) {
            a.dataset.word = a.textContent = b.textContent + a.textContent;
            b.remove();
            d.splice(i, 1);
          }
        }
      });
      for (let i = 0; i < d.length; i++) {
        const b = d[i];
        if (b.parentElement === a && INVALID_SEPARATE_CHARS.some(a => a === b.textContent)) {
          const j = i + 1;
          while (d[j] && INVALID_SEPARATE_CHARS.some(a => a === d[j].textContent)) {
            const a = d[j];
            b.dataset.word = b.textContent += a.textContent;
            a.remove();
            d.splice(j, 1);
          }
        }
      }
    }
    //*/
    const f = c(a);
    b.setProperty('--word-length', d.length);
    d.forEach((a, i) => {
      a.style.setProperty('--word-index', i);
      if (!a.hasAttribute('data-whitespace')) {
        const b = document.createElement('span');
        b.style.cssText = 'border:0;clip:rect(0,0,0,0);height:1px;margin:-1px;overflow:hidden;padding:0;position:absolute;user-select:none;white-space:nowrap;width:1px;';
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
  }
}