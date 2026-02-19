async function getFileSHA256(file: File): Promise<string> {
  const browserCrypto = globalThis.crypto;

  if (!browserCrypto?.subtle) {
    throw new Error("Web Crypto API is not available in this browser context.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await browserCrypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}

export default getFileSHA256;