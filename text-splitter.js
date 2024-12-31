const NOBR_REGEXP = /[\P{sc=Han}&&\P{sc=Hang}&&\P{sc=Hira}&&\P{sc=Kana}&&\P{sc=Zyyy}&&[\p{L}\u0021-\u002C\u002E-\u003E\u0040\u005B-\u0060\u007B-\u007E\u00A0]]+/gv;
const LBR_PROHIBIT_START_REGEXP = /^[[\p{Pd}--―]\p{Pe}\p{Pf}\p{Po}\u00A0々ぁぃぅぇぉっゃゅょゎゕゖ゛゜ゝゞァィゥェォッャュョヮヵヶーヽヾㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ]|\p{Pi}/v;
const LBR_PROHIBIT_END_REGEXP = /[\p{Pf}\p{Pi}\p{Ps}\p{Sc}]$/u;
const LBR_INSEPARATABLE_REGEXP = /[―‥…]/u;

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
    const a = this.element;
    const b = document.createDocumentFragment();
    const c = a => {
      const b = a.nodeType;
      if (b === 3) {
        const b = a.textContent;
        if (!NOBR_REGEXP.test(b)) {
          return a;
        }
        const c = document.createDocumentFragment();
        let i = 0;
        b.replace(NOBR_REGEXP, (a, j) => {
          const d = document.createElement('span');
          if (j > i) {
            c.appendChild(document.createTextNode(b.slice(i, j)));
          }
          d.dataset._nobr = '';
          d.textContent = a;
          c.appendChild(d);
          i = j + a.length;
        });
        if (i < b.length) {
          c.appendChild(document.createTextNode(b.slice(i)));
        }
        return c;
      }
      const d = a.cloneNode(false);
      if (b === 1) {
        const e = document.createDocumentFragment();
        [...a.childNodes].forEach(a => {
          e.appendChild(c(a));
        });
        d.appendChild(e);
      }
      return d;
    };
    [...a.childNodes].forEach(a => {
      b.appendChild(c(a));
    });
    a.replaceChildren(b);
  }
  split(a, b = this.element) {
    const c = [];
    const d = (a, b) => {
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
      [...b.childNodes].forEach(f => {
        const h = f.nodeType;
        if (h === 3) {
          const d = b.closest('[lang]');
          [...new Intl.Segmenter(d ? d.lang : 'en', a === 'word' && this.defaults.wordSegmenter ? { granularity: 'word' } : {}).segment(f.textContent.replace(/[\r\n\t]/g, '').replace(/\s{2,}/g, ' '))].forEach(b => {
            const d = g([a, b.segment.charCodeAt(0) === 32 && 'whitespace'].filter(Boolean), b.segment || ' ');
            c.push(d);
            e.push(d);
          });
          return;
        }
        if (a === 'word' && h === 1 && f.hasAttribute('data-_nobr')) {
          delete f.dataset._nobr;
          f.dataset.word = f.textContent;
          c.push(f);
          e.push(f);
          return;
        }
        e.push(f);
        if (f.hasChildNodes()) {
          [].push.apply(c, d(a, f));
        }
      });
      e.forEach(a => {
        f.appendChild(a);
      });
      b.replaceChildren(f);
    };
    d(a, b);
    return c;
  }
  lbr(a, b) {
    let c = new Intl.Segmenter();
    let d;
    const e = (f, g, i) => {
      const j = i + 1;
      while (a[j] && g.test(a[j].textContent)) {
        const d = a[j];
        f.dataset[b] = f.textContent += d.textContent;
        d.remove();
        a.splice(j, 1);
      }
    };
    for (let i = 0; i < a.length; i++) {
      const e = a[i];
      const f = [...c.segment(e.textContent)].shift().segment;
      if (d && d.textContent.trim() && LBR_PROHIBIT_START_REGEXP.test(f)) {
        d.dataset[b] = d.textContent += e.textContent;
        e.remove();
        a.splice(i, 1);
        i--;
      } else {
        d = e;
      }
    }
    for (let i = 0; i < a.length; i++) {
      const d = a[i];
      if (LBR_PROHIBIT_END_REGEXP.test(d.textContent)) {
        e(d, LBR_PROHIBIT_END_REGEXP, i);
        const f = a[i + 1];
        if (f && f.textContent.trim()) {
          f.dataset[b] = f.textContent = d.textContent + f.textContent;
          d.remove();
          a.splice(i, 1);
        }
      }
    }
    for (let i = 0; i < a.length; i++) {
      const b = a[i];
      if (LBR_INSEPARATABLE_REGEXP.test(b.textContent)) {
        e(b, LBR_INSEPARATABLE_REGEXP, i);
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