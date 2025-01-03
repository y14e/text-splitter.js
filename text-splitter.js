const NOBR_REGEXP = /[[[\P{sc=Han}]&&[\P{sc=Hang}]&&[\P{sc=Hira}]&&[\P{sc=Kana}]&&[\P{sc=Zyyy}]&&[\p{L}]]\u0021-\u002C\u002E-\u003E\u0040\u005B-\u0060\u007B-\u007E\u00A0]+/gv;
const LBR_PROHIBIT_START_REGEXP = /^[[[\p{Pd}]--[―]]\p{Pe}\p{Pf}\p{Po}\u00A0々ぁぃぅぇぉっゃゅょゎゕゖ゛゜ゝゞァィゥェォッャュョヮヵヶーヽヾㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ]|\p{Pi}/v;
const LBR_PROHIBIT_END_REGEXP = /[\p{Pf}\p{Pi}\p{Ps}\p{Sc}\u00A0]$/v;
const LBR_INSEPARATABLE_REGEXP = /[―‥…]/v;

class TextSplitter {
  constructor(element, options) {
    this.element = element;
    this.options = {
      concatChar: false,
      lineBreakingRules: true,
      wordSegmenter: false,
      ...options,
    };
    this.words = [];
    this.chars = [];
    this.originalHTML = this.element.innerHTML;
    this.initialize();
  }
  initialize() {
    this.nobr();
    this.words = this.split('word');
    if (this.options.lineBreakingRules && !this.options.concatChar) {
      this.lbr(this.words, 'word');
    }
    this.chars = this.split('char');
    if (this.options.lineBreakingRules && this.options.concatChar) {
      this.lbr(this.chars, 'char');
    }
    this.element.style.setProperty('--word-length', this.words.length);
    this.words.forEach((word, index) => {
      word.style.setProperty('--word-index', index);
      if (!word.hasAttribute('data-whitespace')) {
        const alternative = document.createElement('span');
        alternative.style.cssText = 'border:0;clip:rect(0,0,0,0);height:1px;margin:-1px;overflow:hidden;padding:0;position:absolute;user-select:none;white-space:nowrap;width:1px;';
        alternative.textContent = word.textContent;
        word.appendChild(alternative);
      }
    });
    this.element.style.setProperty('--char-length', this.chars.length);
    this.chars.forEach((char, index) => {
      char.ariaHidden = 'true';
      char.style.setProperty('--char-index', index);
    });
    this.element.querySelectorAll(':is([data-word], [data-char]):not([data-whitespace])').forEach(element => {
      element.style.display = 'inline-block';
    });
    [...this.element.querySelectorAll('[data-char][data-whitespace]')].forEach(element => {
      if (getComputedStyle(element).display !== 'inline') {
        element.innerHTML = '&nbsp;';
      }
    });
  }
  nobr() {
    const _nobr = node => {
      if (node.nodeType === 3) {
        const text = node.textContent;
        if (!NOBR_REGEXP.test(text)) {
          return node;
        }
        const fragment = document.createDocumentFragment();
        let index = 0;
        text.replace(NOBR_REGEXP, (match, offset) => {
          if (offset > index) {
            fragment.appendChild(document.createTextNode(text.slice(index, offset)));
          }
          index = offset + match.length;
          const element = document.createElement('span');
          element.dataset._nobr = '';
          element.textContent = match;
          fragment.appendChild(element);
        });
        if (index < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(index)));
        }
        return fragment;
      }
      const clone = node.cloneNode(false);
      if (node.nodeType === 1) {
        [...node.childNodes].forEach(node => {
          clone.appendChild(_nobr(node));
        });
      }
      return clone;
    };
    const fragment = document.createDocumentFragment();
    [...this.element.childNodes].forEach(node => {
      fragment.appendChild(_nobr(node));
    });
    this.element.replaceChildren(fragment);
  }
  split(by) {
    const list = [];
    const _split = (by, node) => {
      const fragment = document.createDocumentFragment();
      [...node.childNodes].forEach(node => {
        if (node.nodeType === 3) {
          [...new Intl.Segmenter(document.documentElement.lang || 'en', by === 'word' && this.options.wordSegmenter ? { granularity: 'word' } : {}).segment(node.textContent.replace(/[\r\n\t]/g, '').replace(/\s{2,}/g, ' '))].forEach(segment => {
            const element = document.createElement('span');
            const text = segment.segment || ' ';
            [by, segment.segment.charCodeAt(0) === 32 && 'whitespace'].filter(Boolean).forEach(type => {
              element.dataset[type] = type !== 'whitespace' ? text : '';
            });
            element.textContent = text;
            list.push(element);
            fragment.appendChild(element);
          });
          return;
        }
        if (by === 'word' && node.nodeType === 1 && node.hasAttribute('data-_nobr')) {
          delete node.dataset._nobr;
          node.dataset.word = node.textContent;
          list.push(node);
          fragment.appendChild(node);
          return;
        }
        fragment.appendChild(node);
        if (node.hasChildNodes()) {
          _split(by, node);
        }
      });
      node.replaceChildren(fragment);
    };
    _split(by, this.element);
    return list;
  }
  lbr(list, by) {
    const _lbr = (item, regexp, index) => {
      const offset = index + 1;
      while (list[offset] && regexp.test(list[offset].textContent)) {
        const next = list[offset];
        item.dataset[by] = item.textContent += next.textContent;
        next.remove();
        list.splice(offset, 1);
      }
    };
    let last;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (last && last.textContent.trim() && LBR_PROHIBIT_START_REGEXP.test([...new Intl.Segmenter().segment(item.textContent)].shift().segment)) {
        last.dataset[by] = last.textContent += item.textContent;
        item.remove();
        list.splice(i, 1);
        i--;
      } else {
        last = item;
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
      this.element.querySelectorAll('[data-word]:not([data-whitespace])').forEach(element => {
        if (element.textContent) {
          element.dataset.word = element.textContent;
        } else {
          element.remove();
        }
      });
    }
  }
  revert() {
    ['--word-length', '--char-length'].forEach(property => {
      this.element.style.removeProperty(property);
    });
    this.element.innerHTML = this.originalHTML;
  }
}

export default TextSplitter;