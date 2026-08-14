const ID_BYTES = 16;
const ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function createDocumentId() {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_BYTES));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function isDocumentId(value: string) {
  return ID_PATTERN.test(value);
}
