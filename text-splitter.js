const NOBR_REGEXP = /[[[\P{scx=Han}]&&[\P{scx=Hang}]&&[\P{scx=Hira}]&&[\P{scx=Kana}]&&[\p{L}]]!-,.->@\[-`\{-~\u00A0]+/gv;
const LBR_PROHIBIT_START_REGEXP = /^[[[\p{Pd}]--[―]]\p{Pe}\p{Pf}\p{Po}\u00A0々〵〻ぁぃぅぇぉっゃゅょゎゕゖ゛-ゞァィゥェォッャュョヮヵヶー-ヾㇰ-ㇿ]|\p{Pi}/v;
const LBR_PROHIBIT_END_REGEXP = /[\p{Pf}\p{Pi}\p{Ps}\p{Sc}\u00A0]$/u;
const LBR_INSEPARATABLE_REGEXP = /[―]/u;

class TextSplitter {
  constructor(element, options) {
    this.element = element;
    this.options = {
      concatChar: false,
      lineBreakingRules: true,
      wordSegmenter: false,
      ...options,
    };
    this.original = this.element.innerHTML;
    this.dom = this.element.cloneNode(true);
    this.words = [];
    this.chars = [];
    this.initialize();
  }

  initialize() {
    this.nobr();
    this.split('word');
    if (this.options.lineBreakingRules && !this.options.concatChar) this.lbr('word');
    this.split('char');
    if (this.options.lineBreakingRules && this.options.concatChar) this.lbr('char');
    this.words.forEach((word, i) => {
      word.setAttribute('translate', 'no');
      word.style.setProperty('--word-index', i);
      if (!word.hasAttribute('data-whitespace')) {
        const alt = document.createElement('span');
        alt.style.cssText += `
          border: 0;
          clip: rect(0, 0, 0, 0);
          height: 1px;
          margin: -1px;
          overflow: hidden;
          padding: 0;
          position: absolute;
          user-select: none;
          white-space: nowrap;
          width: 1px;
        `;
        alt.textContent = word.textContent;
        word.append(alt);
      }
    });
    this.chars.forEach((char, i) => {
      char.setAttribute('aria-hidden', 'true');
      char.style.setProperty('--char-index', i);
    });
    this.dom.querySelectorAll(':is([data-word], [data-char]):not([data-whitespace])').forEach(element => {
      element.style.setProperty('display', 'inline-block');
      element.style.setProperty('white-space', 'nowrap');
    });
    this.element.replaceChildren(...this.dom.childNodes);
    this.element.style.setProperty('--word-length', this.words.length);
    this.element.style.setProperty('--char-length', this.chars.length);
    [...this.element.querySelectorAll(':scope > :not([data-word]) [data-char][data-whitespace]')].forEach(whitespace => {
      if (window.getComputedStyle(whitespace).getPropertyValue('display') !== 'inline') whitespace.innerHTML = '&nbsp;';
    });
  }

  nobr(node = this.dom) {
    if (node.nodeType === 3) {
      const text = node.textContent;
      const matches = [...text.matchAll(NOBR_REGEXP)];
      if (matches.length === 0) return;
      let index = 0;
      matches.forEach(match => {
        const offset = match.index;
        if (offset > index) node.before(text.slice(index, offset));
        const element = document.createElement('span');
        element.setAttribute('data-_nobr_', '');
        const matched = match[0];
        element.textContent = matched;
        node.before(element);
        index = offset + matched.length;
      });
      if (index < text.length) node.before(text.slice(index));
      node.remove();
    } else if (node.hasChildNodes()) {
      [...node.childNodes].forEach(node => this.nobr(node));
    }
  }

  split(by, node = this.dom) {
    const list = this[`${by}s`];
    [...node.childNodes].forEach(node => {
      if (node.nodeType === 3) {
        const segments = [...new Intl.Segmenter(node.parentNode.closest('[lang]')?.getAttribute('lang') || document.documentElement.getAttribute('lang') || 'en', by === 'word' && this.options.wordSegmenter ? { granularity: 'word' } : {}).segment(node.textContent.replace(/[\r\n\t]/g, '').replace(/\s{2,}/g, ' '))];
        segments.forEach(segment => {
          const element = document.createElement('span');
          const text = segment.segment || ' ';
          [by, segment.segment.charCodeAt(0) === 32 && 'whitespace'].filter(Boolean).forEach(type => element.setAttribute(`data-${type}`, type !== 'whitespace' ? text : ''));
          element.textContent = text;
          list.push(element);
          node.before(element);
        });
        node.remove();
      } else if (by === 'word' && node.nodeType === 1 && node.hasAttribute('data-_nobr_')) {
        node.removeAttribute('data-_nobr_');
        node.setAttribute('data-word', node.textContent);
        list.push(node);
      } else if (node.hasChildNodes()) {
        this.split(by, node);
      }
    });
  }

  lbr(by) {
    const list = this[`${by}s`];
    let previous = null;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (previous && previous.textContent.trim() && LBR_PROHIBIT_START_REGEXP.test([...new Intl.Segmenter(item.closest('[lang]')?.getAttribute('lang') || document.documentElement.getAttribute('lang') || 'en').segment(item.textContent)].shift().segment)) {
        previous.setAttribute(`data-${by}`, (previous.textContent += item.textContent));
        item.remove();
        list.splice(i, 1);
        i--;
      } else {
        previous = item;
      }
    }
    const concatNext = (item, regexp, index) => {
      const offset = index + 1;
      let next = list[offset];
      while (next && regexp.test(next.textContent)) {
        item.setAttribute(`data-${by}`, (item.textContent += next.textContent));
        next.remove();
        list.splice(offset, 1);
        next = list[offset];
      }
    };
    list.forEach((item, i) => {
      if (LBR_PROHIBIT_END_REGEXP.test(item.textContent)) {
        concatNext(item, LBR_PROHIBIT_END_REGEXP, i);
        const next = list[i + 1];
        if (next && next.textContent.trim()) {
          next.setAttribute(`data-${by}`, (next.textContent = item.textContent + next.textContent));
          item.remove();
          list.splice(i, 1);
        }
      }
    });
    list.forEach((item, i) => {
      if (LBR_INSEPARATABLE_REGEXP.test(item.textContent)) concatNext(item, LBR_INSEPARATABLE_REGEXP, i);
    });
    if (by === 'char') {
      this.dom.querySelectorAll('[data-word]:not([data-whitespace])').forEach(element => {
        if (element.textContent) {
          element.setAttribute('data-word', element.textContent);
        } else {
          element.remove();
        }
      });
    }
  }

  revert() {
    this.element.style.removeProperty('--word-length');
    this.element.style.removeProperty('--char-length');
    this.element.innerHTML = this.original;
  }
}

export default TextSplitter;
