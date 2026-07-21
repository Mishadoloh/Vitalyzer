'use client';

import {useEffect} from 'react';

const translatedAttributes = ['aria-label', 'placeholder', 'title', 'alt'] as const;
const blockedTags = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE']);
const domainReplacements: Record<string, Record<string, string>> = {
  en: {
    'Підтримка форми': 'Weight maintenance',
    'Схуднення': 'Weight loss',
    'Набір маси': 'Muscle gain',
    'Спортивний результат': 'Performance',
    'Тренування': 'Workouts',
    'тренування': 'workouts',
    'Білок': 'Protein',
    'білок': 'protein',
    'Білки': 'Protein',
    'Харчування': 'Nutrition',
    'харчування': 'nutrition',
    'Загальний прогрес': 'Overall progress',
    'Цілі й прогрес': 'Goals and progress',
    'Активна серія': 'Active streak',
    'Найкращий день': 'Best day'
  },
  pl: {
    'Підтримка форми': 'Utrzymanie wagi',
    'Схуднення': 'Redukcja wagi',
    'Набір маси': 'Budowanie masy',
    'Спортивний результат': 'Wyniki sportowe',
    'Тренування': 'Treningi',
    'тренування': 'treningi',
    'Білок': 'Białko',
    'білок': 'białko',
    'Білки': 'Białko',
    'Харчування': 'Odżywianie',
    'харчування': 'odżywianie',
    'Загальний прогрес': 'Ogólny postęp',
    'Цілі й прогрес': 'Cele i postęp',
    'Активна серія': 'Aktywna seria',
    'Найкращий день': 'Najlepszy dzień'
  },
  de: {
    'Підтримка форми': 'Gewicht halten',
    'Схуднення': 'Gewichtsabnahme',
    'Набір маси': 'Muskelaufbau',
    'Спортивний результат': 'Leistungssteigerung',
    'Тренування': 'Training',
    'тренування': 'Training',
    'Білок': 'Protein',
    'білок': 'Protein',
    'Білки': 'Protein',
    'Харчування': 'Ernährung',
    'харчування': 'Ernährung',
    'Загальний прогрес': 'Gesamtfortschritt',
    'Цілі й прогрес': 'Ziele und Fortschritt',
    'Активна серія': 'Aktive Serie',
    'Найкращий день': 'Bester Tag'
  }
};
const shortReplacements: Record<string, Record<string, string>> = {
  en: {
    'Г': 'G', 'с': 's', 'з': 'of', 'із': 'of', 'і': 'and', 'й': 'and', 'та': 'and',
    'кг': 'kg', 'год': 'h', 'ккал': 'kcal', 'г': 'g', 'дн': 'days', 'днів': 'days',
    'рекорд': 'record', 'приблизно': 'approximately', 'тренувань': 'workouts',
    'Ціль': 'Goal', 'сну': 'sleep', 'Середнє': 'Average', 'Заповнено': 'Filled'
  },
  pl: {
    'Г': 'G', 'с': 's', 'з': 'z', 'із': 'z', 'і': 'i', 'й': 'i', 'та': 'i',
    'кг': 'kg', 'год': 'godz.', 'ккал': 'kcal', 'г': 'g', 'дн': 'dni', 'днів': 'dni',
    'рекорд': 'rekord', 'приблизно': 'około', 'тренувань': 'treningów',
    'Ціль': 'Cel', 'сну': 'snu', 'Середнє': 'Średnia', 'Заповнено': 'Wypełniono'
  },
  de: {
    'Г': 'G', 'с': 'Sek.', 'з': 'von', 'із': 'von', 'і': 'und', 'й': 'und', 'та': 'und',
    'кг': 'kg', 'год': 'Std.', 'ккал': 'kcal', 'г': 'g', 'дн': 'Tage', 'днів': 'Tage',
    'рекорд': 'Rekord', 'приблизно': 'etwa', 'тренувань': 'Trainingseinheiten',
    'Ціль': 'Ziel', 'сну': 'Schlaf', 'Середнє': 'Durchschnitt', 'Заповнено': 'Ausgefüllt'
  }
};

function normalized(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function preserveOuterWhitespace(source: string, translated: string) {
  const leading = source.match(/^\s*/)?.[0] ?? '';
  const trailing = source.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translated}${trailing}`;
}

export default function RuntimeTranslator({
  locale,
  dictionary
}: {
  locale: string;
  dictionary: Record<string, string>;
}) {
  useEffect(() => {
    if (locale === 'uk') return;
    const effectiveDictionary = {...dictionary, ...(domainReplacements[locale] ?? {})};
    const fragments = Object.entries(effectiveDictionary)
      .filter(([source, translation]) => source.length >= 2 && source !== translation)
      .sort(([left], [right]) => right.length - left.length);
    const shortDictionary = shortReplacements[locale] ?? {};

    const translateValue = (value: string) => {
      const key = normalized(value);
      if (!key) return value;
      const exact = effectiveDictionary[key];
      if (exact) return preserveOuterWhitespace(value, exact);

      let translated = value;
      for (const [source, replacement] of fragments) {
        if (translated.includes(source)) translated = translated.replaceAll(source, replacement);
      }
      if (/[А-Яа-яІіЇїЄєҐґ]/.test(translated)) {
        translated = translated.replace(/[А-Яа-яІіЇїЄєҐґ]+/g, (word) => shortDictionary[word] ?? word);
      }
      return translated;
    };

    const isBlocked = (element: Element | null) => {
      if (!element) return false;
      return blockedTags.has(element.tagName) || Boolean(element.closest('[data-no-translate]'));
    };

    const translateElement = (element: Element) => {
      if (isBlocked(element)) return;
      for (const attribute of translatedAttributes) {
        const value = element.getAttribute(attribute);
        if (!value) continue;
        const translated = translateValue(value);
        if (translated !== value) element.setAttribute(attribute, translated);
      }
    };

    const translateNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (isBlocked(parent) || parent?.tagName === 'TEXTAREA' || !node.textContent) return;
        const translated = translateValue(node.textContent);
        if (translated !== node.textContent) node.textContent = translated;
        return;
      }
      if (!(node instanceof Element)) return;
      translateElement(node);
      for (const child of node.childNodes) translateNode(child);
    };

    translateNode(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') translateNode(mutation.target);
        else if (mutation.type === 'attributes' && mutation.target instanceof Element) translateElement(mutation.target);
        else for (const node of mutation.addedNodes) translateNode(node);
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...translatedAttributes]
    });
    return () => observer.disconnect();
  }, [dictionary, locale]);

  return null;
}
