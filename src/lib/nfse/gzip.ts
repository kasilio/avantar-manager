import { gunzipSync, gzipSync } from "node:zlib";

/** Formato exigido pela API da Sefin Nacional pro XML da DPS: GZip + base64. */
export function gzipBase64(texto: string): string {
  return gzipSync(Buffer.from(texto, "utf8")).toString("base64");
}

export function ungzipBase64(base64: string): string {
  return gunzipSync(Buffer.from(base64, "base64")).toString("utf8");
}
