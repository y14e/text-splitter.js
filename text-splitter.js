export default class {
  constructor(a, options) {
    this.options = {...{ lineBreak: true }, ...options};
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
            const f = a.segment.trim();
            const h = g([b, !f && 'whitespace'].filter(Boolean), f || ' ');
            d.push(h);
            e.push(h);
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
      const INVALID_LINE_START_CHARS = ['!', ')', ',', '-', '.', ':', ';', '?', ']', '}', '‐', '’', '”', '、', '。', '々', '〉', '》', '」', '』', '】', '〕', '〗', '〙', '〞', '〟', 'ゝ', 'ゞ', '゠', '・', 'ヽ', 'ヾ', '！', '）', '，', '．', '：', '；', '？', '］', '｝', '｠'];
      const INVALID_LINE_END_CHARS = ['(', '[', '{', '‘', '“', '〈', '《', '「', '『', '【', '〔', '〖', '〘', '〝', '（', '［', '｛', '｟'];
      let c;
      for (let i = 0; i < d.length; i++) {
        const b = d[i];
        if (b.parentElement === a && c && INVALID_LINE_START_CHARS.some(a => a === b.textContent)) {
          c.textContent += b.textContent;
          c.dataset.word += b.textContent;
          b.remove();
          d.splice(i, 1);
          i--;
        } else {
          c = b;
        }
      }
      d.forEach((b, i) => {
        if (b.parentElement === a && INVALID_LINE_END_CHARS.some(a => a === b.textContent)) {
          let c = d[i + 1];
          while (c && INVALID_LINE_END_CHARS.some(a => a === c.textContent)) {
            b.textContent += c.textContent;
            b.dataset.word += c.dataset.word;
            c.remove();
            d.splice(i + 1, 1);
            c = d[i + 1];
          }
          if (c) {
            c.textContent = b.textContent + c.textContent;
            c.dataset.word = b.dataset.word + c.dataset.word;
            b.remove();
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