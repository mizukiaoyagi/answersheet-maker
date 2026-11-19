/** ファイル名に使えない文字を「_」にする。空のときは fallback */
export function safeFileName(name: string, fallback: string): string {
  return (name.trim() || fallback).replace(/[\\/:*?"<>|]/g, '_');
}

/** Blob を、その場でダウンロードさせる */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
