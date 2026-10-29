let seq = 0;

export function newId(): string {
  seq += 1;
  return `q${Date.now().toString(36)}${seq}${Math.random().toString(36).slice(2, 6)}`;
}
