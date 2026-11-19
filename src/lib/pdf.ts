/**
 * 画像だけのPDFを作る（外部のライブラリを使わない）。
 * 1ページに1枚の画像を、用紙いっぱいに貼る。画像は RGB を Flate（zlib）で圧縮したもの。
 */

const MM_TO_PT = 72 / 25.4;

export interface PdfPage {
  /** 用紙の大きさ mm */
  widthMm: number;
  heightMm: number;
  /** 画像の大きさ px */
  pxW: number;
  pxH: number;
  /** RGB（1画素3バイト）を deflate で圧縮したもの */
  rgbDeflated: Uint8Array;
}

/** RGBA の画素列から、不透明な RGB の画素列を取り出す */
export function rgbaToRgb(rgba: Uint8ClampedArray | Uint8Array): Uint8Array {
  const n = rgba.length / 4;
  const out = new Uint8Array(n * 3);
  for (let i = 0, j = 0, k = 0; i < n; i++, j += 4, k += 3) {
    out[k] = rgba[j];
    out[k + 1] = rgba[j + 1];
    out[k + 2] = rgba[j + 2];
  }
  return out;
}

/** zlib 形式で圧縮する（PDF の FlateDecode はこの形式） */
export async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const num = (n: number) => n.toFixed(2);

export function buildPdf(pages: PdfPage[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = []; // オブジェクト番号 n（1始まり）の位置は offsets[n - 1]
  let length = 0;
  const push = (b: Uint8Array) => {
    chunks.push(b);
    length += b.length;
  };
  const text = (s: string) => push(enc.encode(s));

  // 2行目の非ASCII文字は、PDFを「バイナリを含むファイル」として扱わせるための目印
  text('%PDF-1.4\n');
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  const object = (n: number, body: string, stream?: Uint8Array) => {
    offsets[n - 1] = length;
    text(`${n} 0 obj\n${body}\n`);
    if (stream) {
      text('stream\n');
      push(stream);
      text('\nendstream\n');
    }
    text('endobj\n');
  };

  // 1: カタログ、2: ページの一覧、以降はページごとに「ページ・内容・画像」の3つ
  const pageObj = (i: number) => 3 + i * 3;
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageObj(i)} 0 R`).join(' ')}] /Count ${pages.length} >>`);

  pages.forEach((p, i) => {
    const w = p.widthMm * MM_TO_PT;
    const h = p.heightMm * MM_TO_PT;
    const page = pageObj(i);
    const content = enc.encode(`q ${num(w)} 0 0 ${num(h)} 0 0 cm /Im0 Do Q`);
    object(
      page,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(w)} ${num(h)}] ` +
        `/Resources << /XObject << /Im0 ${page + 2} 0 R >> >> /Contents ${page + 1} 0 R >>`,
    );
    object(page + 1, `<< /Length ${content.length} >>`, content);
    object(
      page + 2,
      `<< /Type /XObject /Subtype /Image /Width ${p.pxW} /Height ${p.pxH} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter /FlateDecode /Length ${p.rgbDeflated.length} >>`,
      p.rgbDeflated,
    );
  });

  const xrefAt = length;
  const count = offsets.length + 1;
  text(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (const o of offsets) text(`${String(o).padStart(10, '0')} 00000 n \n`);
  text(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}
