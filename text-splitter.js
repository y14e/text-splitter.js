const NOBR_REGEXP = /\b[\p{Script=Latin}\u0021-\u002C\u002E-\u003E\u0040\u005B-\u0060\u007B-\u007E]+\b/gu;
const LBR_PROHIBIT_START_CHARS = new Set(['!', ')', ',', '-', '.', ':', ';', '?', ']', '}', '‐', '’', '”', '‥', '…', '、', '。', '々', '〉', '》', '」', '』', '】', '〕', '〗', '〙', '〞', '〟', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'っ', 'ゃ', 'ゅ', 'ょ', 'ゎ', 'ゕ', 'ゖ', '゚', 'ゝ', 'ゞ', '゠', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ッ', 'ャ', 'ュ', 'ョ', 'ヮ', 'ヵ', 'ヶ', '・', 'ー', 'ヽ', 'ヾ', 'ㇰ', 'ㇱ', 'ㇲ', 'ㇳ', 'ㇴ', 'ㇵ', 'ㇶ', 'ㇷ', 'ㇸ', 'ㇹ', 'ㇺ', 'ㇻ', 'ㇼ', 'ㇽ', 'ㇾ', 'ㇿ', '！', '）', '，', '．', '：', '；', '？', '］', '｝', '｠']);
const LBR_PROHIBIT_END_CHARS = new Set(['(', '[', '{', '‘', '“', '〈', '《', '「', '『', '【', '〔', '〖', '〘', '〝', '（', '［', '｛', '｟']);
const LBR_INSEPARATABLE_CHARS = new Set(['―', '‥', '…']);

class TextSplitter {
  constructor(element, options) {
    this.element = element;
    this.defaults = {
      concatChar: false,
      lineBreakingRules: true,
      wordSegmenter: false,
      ...options
    };
    this.originalHTML = this.element.innerHTML;
    const a = this.element;
    const b = a.style;
    this.nobr();
    const c = this.split('word');
    if (this.defaults.lineBreakingRules && !this.defaults.concatChar) {
      this.lbr(c, 'word');
    }
    const d = this.split('char');
    if (this.defaults.lineBreakingRules && this.defaults.concatChar) {
      this.lbr(d, 'char');
    }
    b.setProperty('--word-length', c.length);
    c.forEach((a, i) => {
      a.style.setProperty('--word-index', i);
      if (!a.hasAttribute('data-whitespace')) {
        const b = document.createElement('span');
        b.style.cssText = 'border:0;clip:rect(0,0,0,0);height:1px;margin:-1px;overflow:hidden;padding:0;position:absolute;user-select:none;white-space:nowrap;width:1px;';
        b.textContent = a.textContent;
        a.appendChild(b);
      }
    });
    b.setProperty('--char-length', d.length);
    d.forEach((a, i) => {
      a.ariaHidden = 'true';
      a.style.setProperty('--char-index', i);
    });
    a.querySelectorAll(':is([data-word], [data-char]):not([data-whitespace])').forEach(a => {
      a.style.display = 'inline-block';
    });
    [...a.querySelectorAll('[data-char][data-whitespace]')].filter(a => getComputedStyle(a).display !== 'inline').forEach(a => {
      a.innerHTML = '&nbsp;';
    });
  }
  nobr() {
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
            d.dataset._nobr = '';
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
  split(a, b = this.element) {
    const c = [];
    const d = [];
    const e = document.createDocumentFragment();
    const f = (a, b) => {
      const c = document.createElement('span');
      a.forEach(a => {
        c.dataset[a] = a !== 'whitespace' ? b : '';
      });
      c.textContent = b;
      return c;
    };
    [...b.childNodes].forEach(e => {
      if (e.nodeType === 3) {
        const g = b.closest('[lang]');
        [...new Intl.Segmenter(g ? g.lang : 'en', a === 'word' && this.defaults.wordSegmenter ? { granularity: 'word' } : {}).segment(e.textContent.replace(/[\r\n\t]/g, '').replace(/\s{2,}/g, ' '))].forEach(b => {
          const e = b.segment.trim();
          const g = f([a, !e && 'whitespace'].filter(Boolean), e || ' ');
          c.push(g);
          d.push(g);
        });
        return;
      }
      if (a === 'word' && e.tagName && e.hasAttribute('data-_nobr')) {
        delete e.dataset._nobr;
        e.dataset.word = e.textContent;
        c.push(e);
        d.push(e);
        return;
      }
      c.push(e);
      if (e.hasChildNodes()) {
        [].push.apply(d, this.split(a, e));
      }
    });
    c.forEach(a => {
      e.appendChild(a);
    });
    b.textContent = '';
    b.appendChild(e);
    return d;
  }
  lbr(a, b) {
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
      if (c && LBR_PROHIBIT_START_CHARS.has(d.textContent)) {
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
      if (LBR_PROHIBIT_END_CHARS.has(c.textContent)) {
        d(c, LBR_PROHIBIT_END_CHARS, i);
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
      if (LBR_INSEPARATABLE_CHARS.has(b.textContent)) {
        d(b, LBR_INSEPARATABLE_CHARS, i);
      }
    }
    if (b === 'char') {
      this.element.querySelectorAll('[data-word]:not([data-whitespace])').forEach(a => {
        a.textContent ? (a.dataset.word = a.textContent) : a.remove();
      });
    }
  }
  revert() {
    const a = this.element;
    const b = a.style;
    b.removeProperty('--word-length');
    b.removeProperty('--char-length');
    a.innerHTML = this.originalHTML;
  }
}

export default TextSplitter;