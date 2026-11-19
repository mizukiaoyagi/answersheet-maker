import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Sheet } from '../components/Sheet';
import { paperDims } from './constants';
import { safeFileName, saveBlob } from './download';
import { buildLayout, type Mode, type PageLayout } from './layout';
import { buildPdf, deflate, rgbaToRgb, type PdfPage } from './pdf';
import type { Question, TestMeta } from './types';

/** 画像にするときの細かさ（1インチあたりの画素数）。印刷・スキャンに十分な細かさ */
const DPI = 300;
/** 画像1枚の画素数の上限。これを超える用紙は、細かさを下げる（ブラウザの上限を超えないため） */
const MAX_PIXELS = 16_000_000;
const CSS_PX_PER_MM = 96 / 25.4;
const MODE_LABEL: Record<Mode, string> = { sheet: '解答用紙', model: '模範解答' };

/** 用紙の見た目に関わる CSS だけを、読み込み済みの CSS から取り出す（画像にする側では、画面の CSS を使えないため） */
const SHEET_SELECTOR = /\.(sheet|sheet-grid|sheet-line|sheet-cell|v-text)(?![\w-])/;
function sheetCss(): string {
  const out: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const r of Array.from(rules)) {
      if (r instanceof CSSStyleRule && SHEET_SELECTOR.test(r.selectorText)) out.push(r.cssText);
    }
  }
  return out.join('\n');
}

/** 用紙1枚ぶんを、画面と同じ部品で組み立てて、XHTML の文字列にする */
function sheetMarkup(page: PageLayout, meta: TestMeta, mode: Mode): string {
  const host = document.createElement('div');
  const root = createRoot(host);
  flushSync(() => root.render(<Sheet page={page} meta={meta} mode={mode} />));
  const xml = new XMLSerializer().serializeToString(host.firstElementChild!);
  root.unmount();
  return xml;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('用紙を画像にできませんでした'));
    img.src = src;
  });
}

/** 用紙1ページを、画像（RGB の画素列を圧縮したもの）にする */
async function rasterize(page: PageLayout, meta: TestMeta, mode: Mode): Promise<PdfPage> {
  const paper = paperDims(meta.paper, meta.orientation);
  const cssW = paper.w * CSS_PX_PER_MM;
  const cssH = paper.h * CSS_PX_PER_MM;

  // 用紙は SVG の foreignObject に入れて、ブラウザに文字（縦書きを含む）や罫線を描かせる
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cssW}" height="${cssH}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${paper.w}mm;height:${paper.h}mm;background:#fff;overflow:hidden">` +
    `<style><![CDATA[${sheetCss()}\n.sheet{box-shadow:none}]]></style>` +
    sheetMarkup(page, meta, mode) +
    `</div></foreignObject></svg>`;
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);

  const perMm = DPI / 25.4;
  const shrink = Math.min(1, Math.sqrt(MAX_PIXELS / (paper.w * perMm * paper.h * perMm)));
  const pxW = Math.round(paper.w * perMm * shrink);
  const pxH = Math.round(paper.h * perMm * shrink);
  const canvas = document.createElement('canvas');
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('画像を作れませんでした');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, pxW, pxH);
  ctx.drawImage(img, 0, 0, pxW, pxH);

  // ブラウザによっては、foreignObject を描いた画像は読み出せない（SecurityError）
  const rgba = ctx.getImageData(0, 0, pxW, pxH).data;
  return {
    widthMm: paper.w,
    heightMm: paper.h,
    pxW,
    pxH,
    rgbDeflated: await deflate(rgbaToRgb(rgba)),
  };
}

/** 解答用紙（または模範解答）を PDF にして、その場でダウンロードさせる */
export async function downloadPdf(meta: TestMeta, questions: Question[], mode: Mode): Promise<void> {
  const layout = buildLayout(meta, questions);
  const pages: PdfPage[] = [];
  for (const page of layout.pages) pages.push(await rasterize(page, meta, mode));
  const pdf = buildPdf(pages);

  const label = MODE_LABEL[mode];
  const title = meta.title.trim();
  const name = safeFileName(title ? `${title}_${label}` : label, label);
  saveBlob(new Blob([pdf as BlobPart], { type: 'application/pdf' }), `${name}.pdf`);
}
