import COS from "cos-nodejs-sdk-v5";

const COS_SECRET_ID = process.env.TENCENT_COS_SECRET_ID;
const COS_SECRET_KEY = process.env.TENCENT_COS_SECRET_KEY;
const COS_BUCKET = process.env.TENCENT_COS_BUCKET;
const COS_REGION = process.env.TENCENT_COS_REGION;
const COS_PUBLIC_BASE = process.env.TENCENT_COS_PUBLIC_BASE;
const COS_KEY_PREFIX = (process.env.TENCENT_COS_KEY_PREFIX || "volc-ref").trim() || "volc-ref";

const MAX_REMOTE_BYTES = Number(process.env.TENCENT_COS_MAX_BYTES || 8 * 1024 * 1024);
const REMOTE_FETCH_TIMEOUT_MS = Number(process.env.TENCENT_COS_FETCH_TIMEOUT_MS || 12_000);
/** >0 时对参考图对象生成带签名的 GET URL（私有桶必读；见 TENCENT_COS_REFERENCE_PRESIGN_SECONDS） */
const COS_REFERENCE_PRESIGN_SECONDS = Number(
  process.env.TENCENT_COS_REFERENCE_PRESIGN_SECONDS || 0
);

const cos =
  COS_SECRET_ID && COS_SECRET_KEY
    ? new COS({
        SecretId: COS_SECRET_ID,
        SecretKey: COS_SECRET_KEY,
      })
    : null;

/** 未配 COS 时只打一次，避免刷屏 */
let warnedCosNotConfigured = false;

function canUseCos(): boolean {
  if (!cos || !COS_BUCKET || !COS_REGION || !COS_PUBLIC_BASE) {
    return false;
  }
  return true;
}

/** 供 /api/health 使用：不返回任何密钥，仅列出缺失项名 */
export function getCosReferenceProxyStatus(): {
  ready: boolean;
  missing_env: string[];
  presign_seconds: number;
} {
  const missing: string[] = [];
  if (!String(COS_SECRET_ID || "").trim()) missing.push("TENCENT_COS_SECRET_ID");
  if (!String(COS_SECRET_KEY || "").trim()) missing.push("TENCENT_COS_SECRET_KEY");
  if (!String(COS_BUCKET || "").trim()) missing.push("TENCENT_COS_BUCKET");
  if (!String(COS_REGION || "").trim()) missing.push("TENCENT_COS_REGION");
  if (!String(COS_PUBLIC_BASE || "").trim()) missing.push("TENCENT_COS_PUBLIC_BASE");
  return {
    ready: canUseCos(),
    missing_env: missing,
    presign_seconds:
      Number.isFinite(COS_REFERENCE_PRESIGN_SECONDS) && COS_REFERENCE_PRESIGN_SECONDS > 0
        ? Math.min(Math.max(60, Math.floor(COS_REFERENCE_PRESIGN_SECONDS)), 604800)
        : 0,
  };
}

function publicBaseNormalized(): string {
  return String(COS_PUBLIC_BASE || "").replace(/\/+$/, "");
}

/** 虚拟主机风格：https://{Bucket}.cos.{Region}.myqcloud.com/{Key}（及 .tencentcos.cn） */
function parseCosVirtualHostedKey(imageUrl: string): string | null {
  const bucket = String(COS_BUCKET || "").trim();
  const region = String(COS_REGION || "").trim();
  if (!bucket || !region) return null;
  let u: URL;
  try {
    u = new URL(String(imageUrl || "").trim());
  } catch {
    return null;
  }
  const h = u.hostname.toLowerCase();
  const suffixes = [
    `.cos.${region}.myqcloud.com`,
    `.cos.${region}.tencentcos.cn`,
  ];
  for (const suf of suffixes) {
    const s = suf.toLowerCase();
    if (!h.endsWith(s)) continue;
    const hostBucket = h.slice(0, -s.length);
    if (hostBucket !== bucket.toLowerCase()) continue;
    const key = u.pathname
      .replace(/^\/+/, "")
      .split("/")
      .filter(Boolean)
      .map((seg) => decodeURIComponent(seg))
      .join("/");
    return key || null;
  }
  return null;
}

/**
 * 路径风格：https://cos.{Region}.myqcloud.com/{Bucket}/{Key}
 * （与虚拟主机、自定义域名并列；需 TENCENT_COS_BUCKET / REGION 与 URL 一致）
 */
function parseCosPathStyleKey(imageUrl: string): string | null {
  const bucket = String(COS_BUCKET || "").trim();
  const region = String(COS_REGION || "").trim();
  if (!bucket || !region) return null;
  let u: URL;
  try {
    u = new URL(String(imageUrl || "").trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const okHost =
    host === `cos.${region}.myqcloud.com`.toLowerCase() ||
    host === `cos.${region}.tencentcos.cn`.toLowerCase();
  if (!okHost) return null;
  const segments = u.pathname
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map((seg) => decodeURIComponent(seg));
  if (segments.length < 2) return null;
  if (segments[0]!.toLowerCase() !== bucket.toLowerCase()) return null;
  return segments.slice(1).join("/") || null;
}

async function getObjectBufferByKey(key: string): Promise<Buffer | null> {
  if (!cos || !COS_BUCKET || !COS_REGION || !key) return null;
  return await new Promise<Buffer | null>((resolve) => {
    cos!.getObject(
      { Bucket: COS_BUCKET!, Region: COS_REGION!, Key: key },
      (err, data) => {
        if (err) {
          console.warn(
            `[cos] getObject 失败 key=${key.slice(0, 96)}：${
              err instanceof Error ? err.message : String(err)
            }`
          );
          return resolve(null);
        }
        const body = data?.Body as Buffer | Uint8Array | undefined;
        if (Buffer.isBuffer(body)) return resolve(body);
        if (body && typeof body === "object" && body.constructor?.name === "Uint8Array") {
          return resolve(Buffer.from(body as Uint8Array));
        }
        resolve(null);
      }
    );
  });
}

/**
 * 若 imageUrl 为本账号 COS 对象，用 SDK 直读（私有桶公网 403、自定义 UA 被拒时仍可用）。
 * 支持：① 虚拟主机；② 路径风格 cos.{region}.myqcloud.com；③ TENCENT_COS_PUBLIC_BASE 同源。
 */
export async function tryDownloadBufferIfCosPublicUrl(imageUrl: string): Promise<Buffer | null> {
  if (!canUseCos() || !cos || !COS_BUCKET || !COS_REGION) return null;
  const key = parseCosObjectKeyFromHttpUrl(imageUrl);
  if (!key) return null;
  return await getObjectBufferByKey(key);
}

/**
 * 从本账号 COS 公网 URL 解析对象 Key（虚拟主机、路径风格、或与 TENCENT_COS_PUBLIC_BASE 同源）。
 * 供火山引擎等「服务端拉 URL」场景复用。
 */
export function parseCosObjectKeyFromHttpUrl(imageUrl: string): string | null {
  const vh = parseCosVirtualHostedKey(imageUrl);
  if (vh) return vh;

  const pathStyle = parseCosPathStyleKey(imageUrl);
  if (pathStyle) return pathStyle;

  const baseStr = publicBaseNormalized();
  if (!baseStr) return null;
  let img: URL;
  let baseU: URL;
  try {
    img = new URL(String(imageUrl || "").trim());
    baseU = new URL(baseStr);
  } catch {
    return null;
  }
  if (img.origin !== baseU.origin) return null;

  let rel = img.pathname.replace(/^\/+/, "");
  const basePath = baseU.pathname.replace(/^\/+|\/+$/g, "");
  if (basePath) {
    if (rel === basePath) rel = "";
    else if (rel.startsWith(`${basePath}/`)) rel = rel.slice(basePath.length + 1);
    else return null;
  }
  const key = rel
    .split("/")
    .filter(Boolean)
    .map((seg) => decodeURIComponent(seg))
    .join("/");
  return key || null;
}

/** 服务端预签名 GET 有效期：火山专用秒数 → 参考图秒数 → 默认 72h */
function resolveCosPresignExpiresSeconds(): number {
  const volcRaw = process.env.TENCENT_COS_VOLCENGINE_PRESIGN_SECONDS?.trim();
  const refRaw = process.env.TENCENT_COS_REFERENCE_PRESIGN_SECONDS?.trim();
  if (volcRaw && Number.isFinite(Number(volcRaw)) && Number(volcRaw) > 0) {
    return Math.min(604800, Math.max(60, Math.floor(Number(volcRaw))));
  }
  if (refRaw && Number.isFinite(Number(refRaw)) && Number(refRaw) > 0) {
    return Math.min(604800, Math.max(60, Math.floor(Number(refRaw))));
  }
  return 259200;
}

async function cosGetPresignedUrlForKey(key: string, expires: number): Promise<string | null> {
  if (!cos || !COS_BUCKET || !COS_REGION || !key) return null;
  try {
    return await new Promise<string>((resolve, reject) => {
      cos!.getObjectUrl(
        {
          Bucket: COS_BUCKET,
          Region: COS_REGION,
          Key: key,
          Sign: true,
          Expires: expires,
        },
        (err, data) => {
          if (err) return reject(err);
          const u = data?.Url;
          if (typeof u !== "string" || !u.trim()) {
            return reject(new Error("getObjectUrl 未返回 Url"));
          }
          resolve(u.trim());
        }
      );
    });
  } catch (e) {
    console.warn(
      `[cos] getObjectUrl 预签名失败 key=${key.slice(0, 80)}：${
        e instanceof Error ? e.message : String(e)
      }`
    );
    return null;
  }
}

/**
 * 为本桶对象生成预签名 GET（Liblib 图床上传前拉图、服务端拉私有桶等）。
 * 不受 TENCENT_COS_VOLCENGINE_PRESIGN_SECONDS=0 影响（与火山参考图区分）。
 */
export async function presignCosHttpUrlForServerFetch(imageUrl: string): Promise<string | null> {
  if (!canUseCos() || !cos || !COS_BUCKET || !COS_REGION) return null;
  const key = parseCosObjectKeyFromHttpUrl(imageUrl);
  if (!key) return null;
  const expires = resolveCosPresignExpiresSeconds();
  return await cosGetPresignedUrlForKey(key, expires);
}

/**
 * 火山/即梦等会在云端拉取 image_urls，私有桶直链会 403。
 * 在已得到本桶对象 URL 后，再换成带签名的 GET URL。
 * 有效期：TENCENT_COS_VOLCENGINE_PRESIGN_SECONDS → 否则 TENCENT_COS_REFERENCE_PRESIGN_SECONDS → 否则默认 259200（72h）。
 */
export async function presignCosHttpUrlForVolcengineFetch(imageUrl: string): Promise<string | null> {
  const volcRaw = process.env.TENCENT_COS_VOLCENGINE_PRESIGN_SECONDS?.trim();
  if (volcRaw === "0") {
    return null;
  }
  return await presignCosHttpUrlForServerFetch(imageUrl);
}

/**
 * SDK getObject 之后，再用预签名 HTTPS GET 拉取（部分环境 getObject 失败时仍可读）。
 * 用于 Liblib 图床上传前下载等。
 */
export async function tryDownloadCosBufferWithPresignedHttp(
  imageUrl: string,
  maxBytes: number,
  timeoutMs: number
): Promise<Buffer | null> {
  const direct = await tryDownloadBufferIfCosPublicUrl(imageUrl);
  if (direct && direct.byteLength > 0) {
    if (direct.byteLength > maxBytes) return null;
    return direct;
  }

  const signed = await presignCosHttpUrlForServerFetch(imageUrl);
  if (!signed) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(signed, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": "creagic-cos-presign-fetch/1.0",
      },
    });
    if (!r.ok) {
      console.warn(`[cos] 预签名 GET 拉图 HTTP ${r.status}：${signed.slice(0, 120)}…`);
      return null;
    }
    const lenHeader = r.headers.get("content-length");
    if (lenHeader) {
      const n = Number(lenHeader);
      if (Number.isFinite(n) && n > maxBytes) return null;
    }
    const ab = await r.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.byteLength <= 0 || buf.byteLength > maxBytes) return null;
    return buf;
  } catch (e) {
    console.warn(
      `[cos] 预签名 GET 拉图异常：${e instanceof Error ? e.message : String(e)}`
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function presignedGetUrlForKey(key: string): Promise<string | null> {
  if (!cos || !COS_BUCKET || !COS_REGION) return null;
  if (!Number.isFinite(COS_REFERENCE_PRESIGN_SECONDS) || COS_REFERENCE_PRESIGN_SECONDS <= 0) {
    return null;
  }
  const expires = Math.min(
    Math.max(60, Math.floor(COS_REFERENCE_PRESIGN_SECONDS)),
    604800
  );
  try {
    return await new Promise<string>((resolve, reject) => {
      cos!.getObjectUrl(
        {
          Bucket: COS_BUCKET,
          Region: COS_REGION,
          Key: key,
          Sign: true,
          Expires: expires,
        },
        (err, data) => {
          if (err) return reject(err);
          const u = data?.Url;
          if (typeof u !== "string" || !u.trim()) {
            return reject(new Error("getObjectUrl 未返回 Url"));
          }
          resolve(u.trim());
        }
      );
    });
  } catch (e) {
    console.warn(
      `[cos] 预签名 URL 失败，将退回公网直链（私有桶可能 403）：${
        e instanceof Error ? e.message : String(e)
      }`
    );
    return null;
  }
}

function extForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === "image/png") return ".png";
  if (m === "image/jpeg" || m === "image/jpg") return ".jpg";
  if (m === "image/webp") return ".webp";
  if (m === "image/gif") return ".gif";
  return ".bin";
}

function guessImageMimeFromBuffer(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
    return "image/webp";
  }
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return "image/gif";
  }
  return "image/jpeg";
}

/**
 * 解析 data:image URL（允许 `charset` 等参数出现在 `;base64,` 之前，与 FileReader / 部分库输出一致）。
 * 原先仅用 `^data:(image/…);base64,` 会在带 `;charset=utf-8;base64,` 时解析失败，导致参考图无法解码、也无法上传 COS。
 */
export function parseImageDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const raw = String(dataUrl || "").trim();
  if (!raw.toLowerCase().startsWith("data:image/")) return null;
  const idx = raw.toLowerCase().indexOf(";base64,");
  if (idx < 0) return null;
  const meta = raw.slice("data:".length, idx);
  const mime = meta.split(";")[0]?.trim() || "";
  if (!mime.toLowerCase().startsWith("image/")) return null;
  let b64 = raw.slice(idx + ";base64,".length).replace(/\s/g, "");
  if (!b64) return null;
  try {
    const buffer = Buffer.from(b64, "base64");
    if (buffer.byteLength <= 0) return null;
    return { mime, buffer };
  } catch {
    return null;
  }
}

async function uploadBufferToCos(params: {
  buffer: Buffer;
  mime: string;
}): Promise<string> {
  const { buffer, mime } = params;
  const key = `${COS_KEY_PREFIX}/${Date.now()}-${Math.random().toString(36).slice(2)}${extForMime(mime)}`;

  await new Promise<void>((resolve, reject) => {
    cos!.putObject(
      {
        Bucket: COS_BUCKET!,
        Region: COS_REGION!,
        Key: key,
        Body: buffer,
        ContentType: mime,
        StorageClass: "STANDARD",
      },
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

  const signed = await presignedGetUrlForKey(key);
  if (signed) return signed;

  // 按路径段编码，保留 /；勿对整段 Key 做 encodeURIComponent（会把 volc-ref/xxx 变成单段 404）
  const path = key.split("/").map((s) => encodeURIComponent(s)).join("/");
  return `${publicBaseNormalized()}/${path}`;
}

export async function uploadImageDataUrlToCos(dataUrl: string): Promise<string | null> {
  if (!canUseCos()) return null;

  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) return null;

  return await uploadBufferToCos({ buffer: parsed.buffer, mime: parsed.mime });
}

export async function proxyReferenceImageUrlToCos(inputUrl: string): Promise<string | null> {
  const raw = String(inputUrl || "").trim();
  if (!raw) return null;
  if (!canUseCos()) {
    const looksLikeRef =
      raw.startsWith("data:image/") || /^https?:\/\//i.test(raw);
    if (looksLikeRef && !warnedCosNotConfigured) {
      warnedCosNotConfigured = true;
      console.warn(
        "[cos] 参考图未上传存储桶：缺少腾讯云 COS 环境变量（TENCENT_COS_SECRET_ID、TENCENT_COS_SECRET_KEY、" +
          "TENCENT_COS_BUCKET、TENCENT_COS_REGION、TENCENT_COS_PUBLIC_BASE）。将原样把图片地址传给上游。"
      );
    }
    return raw;
  }

  // dataURL：直接上传
  if (raw.toLowerCase().startsWith("data:image/")) {
    const uploaded = await uploadImageDataUrlToCos(raw);
    return uploaded ?? raw;
  }

  // 远程 URL：先尝试本账号 COS（私有桶匿名 fetch 会 403，须 SDK / 预签名）
  if (!/^https?:\/\//i.test(raw)) return raw;

  const cosBuf = await tryDownloadCosBufferWithPresignedHttp(
    raw,
    MAX_REMOTE_BYTES,
    REMOTE_FETCH_TIMEOUT_MS
  );
  if (cosBuf && cosBuf.byteLength > 0) {
    const mime = guessImageMimeFromBuffer(cosBuf);
    return await uploadBufferToCos({ buffer: cosBuf, mime });
  }

  // 已是本桶公网路径且上一步未识别为 COS 时，避免重复上传
  const base = publicBaseNormalized();
  if (base && raw.startsWith(base + "/")) {
    return raw;
  }

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return raw;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(u.toString(), {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // 尽量避免部分站点拒绝空 UA
        "User-Agent": "creagic-cos-proxy/1.0",
        Accept: "image/*,*/*;q=0.8",
      },
    });
    if (!r.ok) {
      console.warn(
        `[cos] 参考图下载失败(${r.status})，未上传 COS：${u.toString().slice(0, 200)}`
      );
      return raw;
    }

    const contentType = String(r.headers.get("content-type") || "").split(";")[0].trim();
    const mime = contentType.startsWith("image/") ? contentType : "image/jpeg";
    const lenHeader = r.headers.get("content-length");
    const len = lenHeader ? Number(lenHeader) : NaN;
    if (Number.isFinite(len) && len > MAX_REMOTE_BYTES) {
      console.warn(
        `[cos] 参考图过大(声明 ${len} bytes > ${MAX_REMOTE_BYTES})，未上传 COS`
      );
      return raw;
    }

    const ab = await r.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.byteLength <= 0) return raw;
    if (buf.byteLength > MAX_REMOTE_BYTES) {
      console.warn(
        `[cos] 参考图过大(${buf.byteLength} bytes > ${MAX_REMOTE_BYTES})，未上传 COS`
      );
      return raw;
    }

    return await uploadBufferToCos({ buffer: buf, mime });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[cos] 参考图拉取/上传异常，未替换为 COS URL：${msg.slice(0, 240)}`);
    return raw;
  } finally {
    clearTimeout(timer);
  }
}

