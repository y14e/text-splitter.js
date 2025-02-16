const NOBR_REGEXP = /[[[\P{scx=Han}]&&[\P{scx=Hang}]&&[\P{scx=Hira}]&&[\P{scx=Kana}]&&[\p{L}]]!-,.->@\[-`\{-~\u00A0]+/gv;
const LBR_PROHIBIT_START_REGEXP = /^[[[\p{Pd}]--[―]]\p{Pe}\p{Pf}\p{Po}\u00A0々〵〻ぁぃぅぇぉっゃゅょゎゕゖ゛-ゞァィゥェォッャュョヮヵヶー-ヾㇰ-ㇿ]|\p{Pi}/v;
const LBR_PROHIBIT_END_REGEXP = /[\p{Pf}\p{Pi}\p{Ps}\p{Sc}\u00A0]$/u;
const LBR_INSEPARATABLE_REGEXP = /[―]/u;

type TextSplitterOptions = {
  concatChar: boolean;
  lineBreakingRules: boolean;
  wordSegmenter: boolean;
};

class TextSplitter {
  element: HTMLElement;
  options: Required<TextSplitterOptions>;
  original: string;
  dom: HTMLElement;
  words: HTMLElement[];
  chars: HTMLElement[];

  constructor(element: HTMLElement, options?: TextSplitterOptions) {
    this.element = element;
    this.options = {
      concatChar: false,
      lineBreakingRules: true,
      wordSegmenter: false,
      ...options,
    };
    this.original = this.element.innerHTML;
    this.dom = this.element.cloneNode(true) as HTMLElement;
    this.words = [];
    this.chars = [];
    this.initialize();
  }

  private initialize(): void {
    this.nobr();
    this.split('word');
    if (this.options.lineBreakingRules && !this.options.concatChar) this.lbr('word');
    this.split('char');
    if (this.options.lineBreakingRules && this.options.concatChar) this.lbr('char');
    this.words.forEach((word, i) => {
      word.setAttribute('translate', 'no');
      word.style.setProperty('--word-index', String(i));
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
      char.style.setProperty('--char-index', String(i));
    });
    this.dom.querySelectorAll(':is([data-word], [data-char]):not([data-whitespace])').forEach(element => {
      (element as HTMLElement).style.setProperty('display', 'inline-block');
      (element as HTMLElement).style.setProperty('white-space', 'nowrap');
    });
    this.element.replaceChildren(...this.dom.childNodes);
    this.element.style.setProperty('--word-length', String(this.words.length));
    this.element.style.setProperty('--char-length', String(this.chars.length));
    [...this.element.querySelectorAll(':scope > :not([data-word]) [data-char][data-whitespace]')].forEach(whitespace => {
      if (window.getComputedStyle(whitespace).getPropertyValue('display') !== 'inline') whitespace.innerHTML = '&nbsp;';
    });
  }

  private nobr(node = this.dom): void {
    if (node.nodeType === 3) {
      const text = node.textContent!;
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
      [...node.childNodes].forEach(node => this.nobr(node as HTMLElement));
    }
  }

  private split(by: 'word' | 'char', node = this.dom): void {
    const list = this[`${by}s` as 'words' | 'chars'];
    [...node.childNodes].forEach(node => {
      if (node.nodeType === 3) {
        const segments = [...new Intl.Segmenter(((node.parentNode as HTMLElement).closest('[lang]') as HTMLElement)?.getAttribute('lang') || document.documentElement.getAttribute('lang') || 'en', by === 'word' && this.options.wordSegmenter ? { granularity: 'word' } : {}).segment(node.textContent!.replace(/[\r\n\t]/g, '').replace(/\s{2,}/g, ' '))];
        segments.forEach(segment => {
          const element = document.createElement('span');
          const text = segment.segment || ' ';
          [by, segment.segment.charCodeAt(0) === 32 && 'whitespace'].filter(Boolean).forEach(type => element.setAttribute(`data-${type}`, type !== 'whitespace' ? text : ''));
          element.textContent = text;
          list.push(element);
          node.before(element);
        });
        node.remove();
      } else if (by === 'word' && node.nodeType === 1 && (node as HTMLElement).hasAttribute('data-_nobr_')) {
        (node as HTMLElement).removeAttribute('data-_nobr_');
        (node as HTMLElement).setAttribute('data-word', node.textContent!);
        list.push(node as HTMLElement);
      } else if (node.hasChildNodes()) {
        this.split(by, node as HTMLElement);
      }
    });
  }

  private lbr(by: 'word' | 'char'): void {
    const list = this[`${by}s` as 'words' | 'chars'];
    let previous = null;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (previous && previous.textContent!.trim() && LBR_PROHIBIT_START_REGEXP.test([...new Intl.Segmenter((item.closest('[lang]') as HTMLElement)?.getAttribute('lang') || document.documentElement.getAttribute('lang') || 'en').segment(item.textContent!)].shift()!.segment)) {
        previous.setAttribute(`data-${by}`, (previous.textContent += item.textContent!));
        item.remove();
        list.splice(i, 1);
        i--;
      } else {
        previous = item;
      }
    }
    const concatNext = (item: HTMLElement, regexp: RegExp, index: number): void => {
      const offset = index + 1;
      let next = list[offset];
      while (next && regexp.test(next.textContent!)) {
        item.setAttribute(`data-${by}`, (item.textContent! += next.textContent));
        next.remove();
        list.splice(offset, 1);
        next = list[offset];
      }
    };
    list.forEach((item, i) => {
      if (LBR_PROHIBIT_END_REGEXP.test(item.textContent!)) {
        concatNext(item, LBR_PROHIBIT_END_REGEXP, i);
        const next = list[i + 1];
        if (next && next.textContent!.trim()) {
          next.setAttribute(`data-${by}`, (next.textContent = item.textContent! + next.textContent));
          item.remove();
          list.splice(i, 1);
        }
      }
    });
    list.forEach((item, i) => {
      if (LBR_INSEPARATABLE_REGEXP.test(item.textContent!)) concatNext(item, LBR_INSEPARATABLE_REGEXP, i);
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

  revert(): void {
    this.element.style.removeProperty('--word-length');
    this.element.style.removeProperty('--char-length');
    this.element.innerHTML = this.original;
  }
}

export default TextSplitter;
