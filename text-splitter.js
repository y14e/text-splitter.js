const NOBR_REGEXP = /[[[\P{sc=Han}]&&[\P{sc=Hang}]&&[\P{sc=Hira}]&&[\P{sc=Kana}]&&[\P{sc=Zyyy}]&&[\p{L}]]!-,.->@\[-`\{-~\u00A0]+/gv;
const LBR_PROHIBIT_START_REGEXP = /^[[[\p{Pd}]--[―]]\p{Pe}\p{Pf}\p{Po}\u00A0々〵〻ぁぃぅぇぉっゃゅょゎゕゖ゛-ゞァィゥェォッャュョヮヵヶー-ヾㇰ-ㇿ]|\p{Pi}/v;
const LBR_PROHIBIT_END_REGEXP = /[\p{Pf}\p{Pi}\p{Ps}\p{Sc}\u00A0]$/v;
const LBR_INSEPARATABLE_REGEXP = /[―]/v;

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
    if (this.options.lineBreakingRules && !this.options.concatChar) {
      this.lbr('word');
    }
    this.split('char');
    if (this.options.lineBreakingRules && this.options.concatChar) {
      this.lbr('char');
    }
    this.words.forEach((word, index) => {
      word.style.setProperty('--word-index', index);
      if (!word.hasAttribute('data-whitespace')) {
        const alt = document.createElement('span');
        alt.style.cssText = 'border:0;clip:rect(0,0,0,0);height:1px;margin:-1px;overflow:hidden;padding:0;position:absolute;user-select:none;white-space:nowrap;width:1px;';
        alt.textContent = word.textContent;
        word.append(alt);
      }
    });
    this.chars.forEach((char, index) => {
      char.ariaHidden = 'true';
      char.style.setProperty('--char-index', index);
    });
    this.dom.querySelectorAll(':is([data-word], [data-char]):not([data-whitespace])').forEach(element => {
      element.style.cssText += 'display:inline-block;white-space:nowrap;';
    });
    this.element.replaceChildren(...this.dom.childNodes);
    this.element.style.setProperty('--word-length', this.words.length);
    this.element.style.setProperty('--char-length', this.chars.length);
    [...this.element.querySelectorAll(':scope > :not([data-word]) [data-whitespace]')].forEach(whitespace => {
      if (getComputedStyle(whitespace).display !== 'inline') {
        whitespace.innerHTML = '&nbsp;';
      }
    });
  }
  nobr(node = this.dom) {
    if (node.nodeType === 3) {
      const text = node.textContent;
      if (!NOBR_REGEXP.test(text)) {
        return;
      }
      let index = 0;
      text.replace(NOBR_REGEXP, (match, offset) => {
        if (offset > index) {
          node.before(text.slice(index, offset));
        }
        index = offset + match.length;
        const element = document.createElement('span');
        element.dataset._nobr_ = '';
        element.textContent = match;
        node.before(element);
      });
      if (index < text.length) {
        node.before(text.slice(index));
      }
      node.remove();
    } else if (node.hasChildNodes()) {
      [...node.childNodes].forEach(node => {
        this.nobr(node);
      });
    }
  }
  split(by, node = this.dom) {
    const list = this[`${by}s`];
    [...node.childNodes].forEach(node => {
      if (node.nodeType === 3) {
        const segments = [...new Intl.Segmenter(document.documentElement.lang || 'en', by === 'word' && this.options.wordSegmenter ? { granularity: 'word' } : {}).segment(node.textContent.replace(/[\r\n\t]/g, '').replace(/\s{2,}/g, ' '))];
        segments.forEach(segment => {
          const element = document.createElement('span');
          const text = segment.segment || ' ';
          [by, segment.segment.charCodeAt(0) === 32 && 'whitespace'].filter(Boolean).forEach(type => {
            element.dataset[type] = type !== 'whitespace' ? text : '';
          });
          element.textContent = text;
          list.push(element);
          node.before(element);
        });
        node.remove();
      } else if (by === 'word' && node.nodeType === 1 && node.hasAttribute('data-_nobr_')) {
        delete node.dataset._nobr_;
        node.dataset.word = node.textContent;
        list.push(node);
      } else if (node.hasChildNodes()) {
        this.split(by, node);
      }
    });
  }
  lbr(by) {
    const list = this[`${by}s`];
    const _lbr = (item, regexp, index) => {
      const offset = index + 1;
      while (list[offset] && regexp.test(list[offset].textContent)) {
        const next = list[offset];
        item.dataset[by] = item.textContent += next.textContent;
        next.remove();
        list.splice(offset, 1);
      }
    };
    let previous;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (previous && previous.textContent.trim() && LBR_PROHIBIT_START_REGEXP.test([...new Intl.Segmenter().segment(item.textContent)].shift().segment)) {
        previous.dataset[by] = previous.textContent += item.textContent;
        item.remove();
        list.splice(i, 1);
        i--;
      } else {
        previous = item;
      }
    }
    list.forEach((item, index) => {
      if (LBR_PROHIBIT_END_REGEXP.test(item.textContent)) {
        _lbr(item, LBR_PROHIBIT_END_REGEXP, index);
        const next = list[index + 1];
        if (next && next.textContent.trim()) {
          next.dataset[by] = next.textContent = item.textContent + next.textContent;
          item.remove();
          list.splice(index, 1);
        }
      }
    });
    list.forEach((item, index) => {
      if (LBR_INSEPARATABLE_REGEXP.test(item.textContent)) {
        _lbr(item, LBR_INSEPARATABLE_REGEXP, index);
      }
    });
    if (by === 'char') {
      this.dom.querySelectorAll('[data-word]:not([data-whitespace])').forEach(element => {
        if (element.textContent) {
          element.dataset.word = element.textContent;
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