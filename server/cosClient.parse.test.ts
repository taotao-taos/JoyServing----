/**
 * node --import tsx --test server/cosClient.parse.test.ts
 */
import assert from "node:assert/strict";
import test from "node:test";
import { parseImageDataUrl } from "./cosClient";

const tinyPngB64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("parseImageDataUrl: 标准 data:image/png;base64,", () => {
  const u = `data:image/png;base64,${tinyPngB64}`;
  const p = parseImageDataUrl(u);
  assert.ok(p);
  assert.equal(p!.mime, "image/png");
  assert.ok(p!.buffer.byteLength > 0);
});

test("parseImageDataUrl: 带 charset 的 data URL（此前会导致无法上传 COS）", () => {
  const u = `data:image/png;charset=UTF-8;base64,${tinyPngB64}`;
  const p = parseImageDataUrl(u);
  assert.ok(p);
  assert.equal(p!.mime, "image/png");
  assert.equal(p!.buffer.byteLength, Buffer.from(tinyPngB64, "base64").byteLength);
});

test("parseImageDataUrl: 非图片 data URL 返回 null", () => {
  assert.equal(parseImageDataUrl("data:text/plain;base64,Zm9v"), null);
});
