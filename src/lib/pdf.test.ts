import { describe, expect, it } from 'vitest';
import { safeFileName } from './download';
import { buildPdf, deflate, rgbaToRgb, type PdfPage } from './pdf';

const latin1 = (b: Uint8Array) => new TextDecoder('latin1').decode(b);

/** zlib を元に戻す */
async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function page(w: number, h: number, fill: number[]): Promise<PdfPage> {
  const rgb = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) rgb.set(fill, i * 3);
  return { widthMm: 210, heightMm: 297, pxW: w, pxH: h, rgbDeflated: await deflate(rgb) };
}

describe('rgbaToRgb', () => {
  it('透明度を捨てて、RGB だけにする', () => {
    expect([...rgbaToRgb(new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 0]))]).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('buildPdf', () => {
  it('ヘッダー・ページ数・用紙の大きさ（pt）が入る', async () => {
    const pdf = buildPdf([await page(4, 4, [255, 255, 255]), await page(4, 4, [0, 0, 0])]);
    const s = latin1(pdf);
    expect(s.startsWith('%PDF-1.4')).toBe(true);
    expect(s.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(s).toContain('/Count 2');
    // A4 = 595.28 × 841.89 pt
    expect(s).toContain('/MediaBox [0 0 595.28 841.89]');
  });

  it('xref の位置が、実際のオブジェクトの位置と一致する', async () => {
    const pdf = buildPdf([await page(3, 2, [10, 20, 30])]);
    const s = latin1(pdf);
    const xrefAt = Number(/startxref\n(\d+)\n/.exec(s)![1]);
    expect(s.slice(xrefAt, xrefAt + 4)).toBe('xref');
    const entries = [...s.slice(xrefAt).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    // 1:カタログ 2:ページ一覧 3:ページ 4:内容 5:画像
    expect(entries).toHaveLength(5);
    entries.forEach((at, i) => expect(s.slice(at, at + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
    expect(s).toContain('/Size 6');
  });

  it('画像は、圧縮した RGB をそのまま元に戻せる', async () => {
    const p = await page(3, 2, [10, 20, 30]);
    const pdf = buildPdf([p]);
    const s = latin1(pdf);
    expect(s).toContain('/Width 3 /Height 2');
    expect(s).toContain(`/Length ${p.rgbDeflated.length}`);
    // 画像の本体を取り出して、元の画素に戻る
    const start = s.indexOf('stream\n', s.indexOf('/Subtype /Image')) + 'stream\n'.length;
    const body = pdf.slice(start, start + p.rgbDeflated.length);
    expect([...(await inflate(body))]).toEqual(Array.from({ length: 6 }, () => [10, 20, 30]).flat());
  });
});

describe('safeFileName', () => {
  it('使えない文字を _ にして、空なら代わりの名前にする', () => {
    expect(safeFileName('国語/小テスト:1', '解答用紙')).toBe('国語_小テスト_1');
    expect(safeFileName('  ', '解答用紙')).toBe('解答用紙');
  });
});
