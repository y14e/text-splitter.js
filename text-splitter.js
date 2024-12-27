const NOBR_REGEXP = /\b[\u0041-\u024F]+\b/g;
const LINE_BREAKING_RULES_PROHIBIT_START_CHARS = new Set(['!', ')', ',', '-', '.', ':', ';', '?', ']', '}', '‐', '’', '”', '‥', '…', '、', '。', '々', '〉', '》', '」', '』', '】', '〕', '〗', '〙', '〞', '〟', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'っ', 'ゃ', 'ゅ', 'ょ', 'ゎ', 'ゕ', 'ゖ', '゚', 'ゝ', 'ゞ', '゠', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ッ', 'ャ', 'ュ', 'ョ', 'ヮ', 'ヵ', 'ヶ', '・', 'ー', 'ヽ', 'ヾ', 'ㇰ', 'ㇱ', 'ㇲ', 'ㇳ', 'ㇴ', 'ㇵ', 'ㇶ', 'ㇷ', 'ㇸ', 'ㇹ', 'ㇺ', 'ㇻ', 'ㇼ', 'ㇽ', 'ㇾ', 'ㇿ', '！', '）', '，', '．', '：', '；', '？', '］', '｝', '｠']);
const LINE_BREAKING_RULES_PROHIBIT_END_CHARS = new Set(['(', '[', '{', '‘', '“', '〈', '《', '「', '『', '【', '〔', '〖', '〘', '〝', '（', '［', '｛', '｟']);
const LINE_BREAKING_RULES_PROHIBIT_SEPARATE_CHARS = new Set(['―', '‥', '…']);

export default class {
  constructor(element, options) {
    this.element = element;
    this.options = { ...{ concatChar: false, lineBreakingRules: true }, ...options };
    this.concatChar = this.options.concatChar === true;
    this.lineBreakingRules = this.options.lineBreakingRules !== false;
    const a = this.element;
    const b = a.style;
    const c = (a, b) => {
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
          [...new Intl.Segmenter(c ? c.lang : 'en').segment(f.textContent.replace(/[\r\n\t]/g, '').replace(/\s{2,}/g, ' '))].forEach(a => {
            const c = a.segment.trim();
            const f = g([b, !c && 'whitespace'].filter(Boolean), c || ' ');
            d.push(f);
            e.push(f);
          });
          return;
        }
        if (b === 'word' && f.tagName && f.hasAttribute('data-nobr')) {
          f.dataset.word = f.textContent;
          d.push(f);
          e.push(f);
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
    this._nobr();
    const e = c(a, 'word');
    if (this.lineBreakingRules && !this.concatChar) {
      this._lbr(e, 'word');
    }
    const f = c(a, 'char');
    if (this.lineBreakingRules && this.concatChar) {
      this._lbr(f, 'char');
    }

    b.setProperty('--word-length', e.length);
    e.forEach((a, i) => {
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
  _nobr() {
    const a = b => {
      if (b.nodeType === 3) {
        const a = b.textContent;
        if (NOBR_REGEXP.test(a)) {
          const c = document.createDocumentFragment();
          let i = 0;
          a.replace(NOBR_REGEXP, (b, j) => {
            if (j > i) {
              c.appendChild(document.createTextNode(a.slice(i, j)));
            }
            const d = document.createElement('span');
            d.dataset.nobr = '';
            d.textContent = b;
            c.appendChild(d);
            i = j + b.length;
          });
          if (i < a.length) {
            c.appendChild(document.createTextNode(a.slice(i)));
          }
          b.parentNode.replaceChild(c, b);
        }
        return;
      }
      [...b.childNodes].forEach(a);
    };
    [...this.element.childNodes].forEach(a);
  }
  _lbr(a, b) {
    let c;
    const d = (c, d, i) => {
      const j = i + 1;
      while (a[j] && d.has(a[j].textContent)) {
        const d = a[j];
        c.dataset[b] = c.textContent += d.textContent;
        d.remove();
        a.splice(j, 1);
      }
    };
    for (let i = 0; i < a.length; i++) {
      const d = a[i];
      if (c && LINE_BREAKING_RULES_PROHIBIT_START_CHARS.has(d.textContent)) {
        c.dataset[b] = c.textContent += d.textContent;
        d.remove();
        a.splice(i, 1);
        i--;
      } else {
        c = d;
      }
    }
    for (let i = 0; i < a.length; i++) {
      const c = a[i];
      if (LINE_BREAKING_RULES_PROHIBIT_END_CHARS.has(c.textContent)) {
        d(c, LINE_BREAKING_RULES_PROHIBIT_END_CHARS, i);
        const e = a[i + 1];
        if (e) {
          e.dataset[b] = e.textContent = c.textContent + e.textContent;
          c.remove();
          a.splice(i, 1);
        }
      }
    }
    for (let i = 0; i < a.length; i++) {
      const b = a[i];
      if (LINE_BREAKING_RULES_PROHIBIT_SEPARATE_CHARS.has(b.textContent)) {
        d(b, LINE_BREAKING_RULES_PROHIBIT_SEPARATE_CHARS, i);
      }
    }
    if (b === 'char') {
      this.element.querySelectorAll('[data-word]:not([data-whitespace])').forEach(a => {
        a.textContent ? (a.dataset.word = a.textContent) : a.remove();
      });
    }
  }
}