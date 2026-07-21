import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const outputPath = path.join(sourceRoot, 'i18n', 'generated-translations.json');
const locales = ['en', 'pl', 'de'];
const cyrillic = /[А-Яа-яІіЇїЄєҐґ]/;

async function walk(directory) {
  const entries = await fs.readdir(directory, {withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function normalize(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function collectStrings(filePath, source, target) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  function add(value) {
    const normalized = normalize(value);
    if (normalized.length > 1 && cyrillic.test(normalized)) target.add(normalized);
  }

  function visit(node) {
    if (ts.isStringLiteralLike(node) || ts.isJsxText(node)) add(node.text);
    if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) add(node.text);
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

async function translate(text, locale, attempt = 0) {
  const query = new URLSearchParams({client: 'gtx', sl: 'uk', tl: locale, dt: 't', q: text});
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query}`);
  if (!response.ok) {
    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      return translate(text, locale, attempt + 1);
    }
    throw new Error(`Translation failed (${response.status}) for ${locale}: ${text}`);
  }
  const payload = await response.json();
  return payload[0].map((part) => part[0]).join('').trim();
}

async function runPool(items, worker, concurrency = 8) {
  let cursor = 0;
  const runners = Array.from({length: concurrency}, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

const files = await walk(sourceRoot);
const sourceStrings = new Set();
for (const filePath of files) {
  collectStrings(filePath, await fs.readFile(filePath, 'utf8'), sourceStrings);
}

let catalog = {uk: {}};
try {
  catalog = JSON.parse(await fs.readFile(outputPath, 'utf8'));
} catch {}

const strings = [...sourceStrings].sort((a, b) => a.localeCompare(b, 'uk'));
catalog.uk = Object.fromEntries(strings.map((value) => [value, value]));

for (const locale of locales) {
  catalog[locale] ||= {};
  const missing = strings.filter((value) => !catalog[locale][value]);
  let completed = 0;
  console.log(`${locale}: translating ${missing.length} of ${strings.length} strings`);
  await runPool(missing, async (value) => {
    catalog[locale][value] = await translate(value, locale);
    completed += 1;
    if (completed % 25 === 0 || completed === missing.length) {
      console.log(`${locale}: ${completed}/${missing.length}`);
      await fs.writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    }
  });
}

for (const locale of Object.keys(catalog)) {
  catalog[locale] = Object.fromEntries(
    Object.entries(catalog[locale]).filter(([source]) => sourceStrings.has(source))
  );
}

await fs.writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`Saved ${strings.length} UI strings to ${path.relative(root, outputPath)}`);
