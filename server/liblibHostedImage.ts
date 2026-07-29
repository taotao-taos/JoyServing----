import { parseImageDataUrl, tryDownloadCosBufferWithPresignedHttp } from "./cosClient";

/**
 * 《LiblibAI-API文件上传》：本模块只实现 ①②，③ 在 aiHandlers 里用返回的图床 URL 调 Comfy 工作流（原业务流不变）。
 *
 * ① 调用 Liblib 文件上传接口：POST /api/generate/upload/signature（AK 签名与开放平台一致），
 *    body { name, extension }，见飞书文档；name≤100、extension∈jpg|png|jpeg、单图≤10M。
 * ② 将图片 POST 到签名返回的 postUrl（表单域顺序见实现，file 须最后），即上传到 Liblib 图床。
 * ③ 使用图床地址 `postUrl + "/" + key` 作为 LoadImage.inputs.image，再走原有 trySubmitLiblibComfyJob 等工作流生图逻辑。
 *
 * 外链直链直接填 Comfy 易触发 200000，故服务端先拉图再 ①②。
 * 若源图为腾讯云 COS 私桶（匿名 403），可配置 TENCENT_COS_*，由 cosClient 用 SDK/预签名拉图（仍只上传到 Liblib，不经 COS 业务中转）。
 */
import { createHmac, randomBytes } from "node:crypto";

/** 文档：图片不能超过 10M */
const LIBLIB_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const LIBLIB_NAME_MAX_LEN = 100;
const FETCH_TIMEOUT_MS = 45_000;

function buildLiblibSignedUrl(
  baseRaw: string,
  pathWithQuery: string,
  accessKey: string,
  secretKey: string
): string {
  const base = baseRaw.replace(/\/+$/, "");
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  const timestamp = Date.now();
  const signatureNonce = randomBytes(8).toString("hex");
  const raw = `${path}&${timestamp}&${signatureNonce}`;
  const signature = createHmac("sha1", secretKey)
    .update(raw)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const sep = path.includes("?") ? "&" : "?";
  return `${base}${path}${sep}AccessKey=${encodeURIComponent(
    accessKey
  )}&Signature=${encodeURIComponent(signature)}&Timestamp=${timestamp}&SignatureNonce=${encodeURIComponent(
    signatureNonce
  )}`;
}

type UploadSignFields = {
  key: string;
  policy: string;
  postUrl: string;
  xossDate: string;
  xossExpires: number;
  xossSignature: string;
  xossCredential: string;
  xossSignatureVersion: string;
};

function pickSignData(data: Record<string, unknown>): UploadSignFields | null {
  const key = String(data.key ?? "");
  const policy = String(data.policy ?? "");
  const postUrl = String(data.postUrl ?? "");
  const xossDate = String(
    data.xOssDate ?? data.xossDate ?? data["x-oss-date"] ?? ""
  );
  const xossExpires = Number(data.xOssExpires ?? data.xossExpires ?? data["x-oss-expires"] ?? 0);
  const xossSignature = String(
    data.xOssSignature ?? data.xossSignature ?? data["x-oss-signature"] ?? ""
  );
  const xossCredential = String(
    data.xOssCredential ?? data.xossCredential ?? data["x-oss-credential"] ?? ""
  );
  const xossSignatureVersion = String(
    data.xOssSignatureVersion ?? data.xossSignatureVersion ?? data["x-oss-signature-version"] ?? ""
  );
  if (!key || !policy || !postUrl || !xossSignature || !xossDate) return null;
  return {
    key,
    policy,
    postUrl,
    xossDate,
    xossExpires: Number.isFinite(xossExpires) ? xossExpires : 3600,
    xossSignature,
    xossCredential,
    xossSignatureVersion,
  };
}

function isLiblibHostedImageUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return (
      h.includes("liblibai-online") ||
      h.endsWith("liblib.cloud") ||
      h.includes("liblibai-airship-temp") ||
      h.includes("aliyuncs.com")
    );
  } catch {
    return false;
  }
}

/** 文档：extension 仅 jpg、png、jpeg；其它格式在拉图阶段即报错 */
function extFromContentType(ct: string): string {
  const m = ct.split(";")[0].trim().toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("jpeg")) return "jpeg";
  if (m.includes("jpg")) return "jpg";
  return "";
}

function filenameFromUrlPath(url: string, fallbackExt: string): string {
  let ext = fallbackExt;
  try {
    const path = new URL(url).pathname;
    const hit = /\.(png|jpe?g)$/i.exec(path);
    if (hit) ext = hit[1]!.toLowerCase() === "jpeg" ? "jpeg" : hit[1]!.toLowerCase();
  } catch {
    /* ignore */
  }
  return `in_${Date.now()}.${ext}`;
}

/** 文档：signature 的 extension 与上传 file 扩展名须一致；仅 jpg / png / jpeg */
function parseLiblibUploadNameAndExtension(filename: string): {
  name: string;
  extension: "jpg" | "png" | "jpeg";
  multipartFilename: string;
} {
  const trimmed = filename.trim();
  const dot = trimmed.lastIndexOf(".");
  const extRaw = (dot >= 0 ? trimmed.slice(dot + 1) : "").toLowerCase();
  let base = dot >= 0 ? trimmed.slice(0, dot) : trimmed;
  let extension: "jpg" | "png" | "jpeg";
  if (extRaw === "jpg") extension = "jpg";
  else if (extRaw === "jpeg") extension = "jpeg";
  else if (extRaw === "png") extension = "png";
  else {
    throw new Error(
      `Liblib 上传仅支持 jpg、png、jpeg（见官方文档），请先导出为该格式（当前 .${extRaw || "无扩展名"}）`
    );
  }
  base = base.replace(/[^\w\u0080-\uFFFF\-_.]/g, "_").slice(0, LIBLIB_NAME_MAX_LEN) || "upload";
  const multipartFilename =
    extension === "jpeg" ? `${base}.jpeg` : `${base}.${extension}`;
  return { name: base, extension, multipartFilename };
}

function buildLiblibHostedObjectUrl(postUrl: string, objectKey: string): string {
  const base = postUrl.replace(/\/+$/, "");
  const key = objectKey.replace(/^\/+/, "");
  return `${base}/${key}`;
}

async function fetchUrlLoose(
  url: string,
  signal: AbortSignal,
  browserLike: boolean
): Promise<Response> {
  const origin = (() => {
    try {
      return new URL(url).origin + "/";
    } catch {
      return "";
    }
  })();
  return fetch(url, {
    method: "GET",
    signal,
    redirect: "follow",
    headers: browserLike
      ? {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          ...(origin ? { Referer: origin } : {}),
        }
      : {
          Accept: "image/*,*/*;q=0.8",
          "User-Agent": "creagic-liblib-hosted-upload/1.0",
        },
  });
}

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; filename: string }> {
  const trimmedUrl = url.trim();
  if (/^data:image\//i.test(trimmedUrl)) {
    const parsed = parseImageDataUrl(trimmedUrl);
    if (!parsed || parsed.buffer.byteLength <= 0) {
      throw new Error("data:image 解析失败（需为 base64）");
    }
    if (parsed.buffer.byteLength > LIBLIB_UPLOAD_MAX_BYTES) {
      throw new Error(`图片过大（>${Math.round(LIBLIB_UPLOAD_MAX_BYTES / 1024 / 1024)}MB，文档上限 10MB）`);
    }
    const ext = extFromContentType(parsed.mime);
    if (!ext) {
      throw new Error("Liblib 图床仅支持 PNG/JPG（data:image 请使用 png 或 jpeg）");
    }
    return { buffer: parsed.buffer, filename: `in_${Date.now()}.${ext}` };
  }

  /** 本账号 COS 私链：匿名 403 时 SDK getObject 或预签名 GET 可读，再上传 Liblib */
  const cosBuf = await tryDownloadCosBufferWithPresignedHttp(
    trimmedUrl,
    LIBLIB_UPLOAD_MAX_BYTES,
    FETCH_TIMEOUT_MS
  );
  if (cosBuf && cosBuf.byteLength > 0) {
    let ext = "";
    try {
      const path = new URL(trimmedUrl).pathname;
      const hit = /\.(png|jpe?g)$/i.exec(path);
      if (hit) ext = hit[1]!.toLowerCase() === "jpeg" ? "jpeg" : hit[1]!.toLowerCase();
    } catch {
      /* ignore */
    }
    if (!ext) ext = "png";
    return { buffer: cosBuf, filename: filenameFromUrlPath(trimmedUrl, ext) };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let r = await fetchUrlLoose(trimmedUrl, controller.signal, false);
    if (!r.ok && (r.status === 403 || r.status === 401)) {
      r = await fetchUrlLoose(trimmedUrl, controller.signal, true);
    }
    if (!r.ok) {
      throw new Error(
        `拉取源图失败（HTTP ${r.status}）。请使用公网可直连的 https，或改用 data:image；若为腾讯云 COS 私桶请配置 TENCENT_COS_SECRET_ID/KEY、BUCKET、REGION 与 TENCENT_COS_PUBLIC_BASE（或与链接同源的自定义域名）。其它外链请检查防盗链。`
      );
    }
    const lenHeader = r.headers.get("content-length");
    if (lenHeader) {
      const n = Number(lenHeader);
      if (Number.isFinite(n) && n > LIBLIB_UPLOAD_MAX_BYTES) {
        throw new Error(`图片过大（>${Math.round(LIBLIB_UPLOAD_MAX_BYTES / 1024 / 1024)}MB，文档上限 10MB）`);
      }
    }
    const ab = await r.arrayBuffer();
    const buffer = Buffer.from(ab);
    if (buffer.byteLength <= 0) throw new Error("图片内容为空");
    if (buffer.byteLength > LIBLIB_UPLOAD_MAX_BYTES) {
      throw new Error(`图片过大（>${Math.round(LIBLIB_UPLOAD_MAX_BYTES / 1024 / 1024)}MB，文档上限 10MB）`);
    }

    let ext = "";
    try {
      const path = new URL(trimmedUrl).pathname;
      const hit = /\.(png|jpe?g)$/i.exec(path);
      if (hit) ext = hit[1]!.toLowerCase() === "jpeg" ? "jpeg" : hit[1]!.toLowerCase();
    } catch {
      /* ignore */
    }
    if (!ext) {
      ext = extFromContentType(r.headers.get("content-type") || "");
    }
    if (!ext) {
      throw new Error(
        "无法从 URL/Content-Type 判断为 PNG/JPG；Liblib 上传仅支持 jpg、png、jpeg，请换链或先导出"
      );
    }
    return { buffer, filename: filenameFromUrlPath(trimmedUrl, ext) };
  } finally {
    clearTimeout(timer);
  }
}

function liblibBizCodeOk(code: unknown): boolean {
  if (code === undefined || code === null) return true;
  const n = typeof code === "number" ? code : Number(String(code).trim());
  if (!Number.isFinite(n)) return true;
  return n === 0 || n === 10000 || n === 20000;
}

/**
 * 执行上述 ①②：得到 Liblib 图床 https URL，供后续 Comfy generateParams 使用（不负责提交工作流）。
 */
export async function ensureLiblibHostedImageUrl(args: {
  sourceUrl: string;
  accessKey: string;
  secretKey: string;
  baseUrl: string;
}): Promise<{ ok: true; url: string } | { ok: false; err: string }> {
  const trimmed = args.sourceUrl.trim();
  if (!trimmed) return { ok: false, err: "图片地址为空" };

  if (isLiblibHostedImageUrl(trimmed)) {
    return { ok: true, url: trimmed };
  }

  const ak = args.accessKey.trim();
  const sk = args.secretKey.trim();
  if (!ak || !sk) {
    return {
      ok: false,
      err: "需配置 LIBLIB_COMFY_ACCESS_KEY 与 LIBLIB_COMFY_SECRET_KEY，才能将图片上传到 Liblib 图床后再跑 Comfy",
    };
  }

  let buffer: Buffer;
  let filename: string;
  try {
    const got = await fetchImageBuffer(trimmed);
    buffer = got.buffer;
    filename = got.filename;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, err: `准备上传 Liblib 图床前：${msg}` };
  }

  let namePart: string;
  let extension: "jpg" | "png" | "jpeg";
  let multipartFilename: string;
  try {
    const meta = parseLiblibUploadNameAndExtension(filename);
    namePart = meta.name;
    extension = meta.extension;
    multipartFilename = meta.multipartFilename;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, err: msg };
  }

  try {
    const base = args.baseUrl.replace(/\/+$/, "");
    const signUrl = buildLiblibSignedUrl(base, "/api/generate/upload/signature", ak, sk);

    const signRes = await fetch(signUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: namePart, extension }),
    });
    const signText = await signRes.text();
    if (!signRes.ok) {
      return { ok: false, err: `申请上传签名失败（HTTP ${signRes.status}）：${signText.slice(0, 240)}` };
    }
    let signJson: unknown = {};
    try {
      signJson = signText ? JSON.parse(signText) : {};
    } catch {
      return { ok: false, err: `上传签名返回非 JSON：${signText.slice(0, 240)}` };
    }
    const root = signJson as Record<string, unknown>;
    if (!liblibBizCodeOk(root.code)) {
      const msg =
        (typeof root.msg === "string" && root.msg.trim()) ||
        (typeof root.message === "string" && root.message.trim()) ||
        `业务码 ${String(root.code)}`;
      return { ok: false, err: `Liblib 上传签名被拒绝：${msg}` };
    }
    const data = root.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, err: "上传签名返回缺少 data" };
    }
    const signData = pickSignData(data as Record<string, unknown>);
    if (!signData) {
      return { ok: false, err: "上传签名字段不完整（key/policy/postUrl/signature）" };
    }

    const blob = new Blob([new Uint8Array(buffer)], {
      type: extension === "png" ? "image/png" : "image/jpeg",
    });
    /** 文档与 Java 示例：key → policy → x-oss-* → file 且 file 必须为最后一项 */
    const formData = new FormData();
    formData.append("key", signData.key);
    formData.append("policy", signData.policy);
    formData.append("x-oss-date", signData.xossDate);
    formData.append("x-oss-expires", String(signData.xossExpires));
    formData.append("x-oss-signature", signData.xossSignature);
    formData.append("x-oss-credential", signData.xossCredential);
    formData.append("x-oss-signature-version", signData.xossSignatureVersion);
    formData.append("file", blob, multipartFilename);

    const up = await fetch(signData.postUrl, { method: "POST", body: formData });
    if (!up.ok) {
      const t = await up.text();
      return { ok: false, err: `上传到 Liblib 存储失败（HTTP ${up.status}）：${t.slice(0, 400)}` };
    }

    const hosted = buildLiblibHostedObjectUrl(signData.postUrl, signData.key);
    if (!/^https?:\/\//i.test(hosted)) {
      return { ok: false, err: "Liblib 图床 URL 拼接失败" };
    }
    return { ok: true, url: hosted };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, err: `上传到 Liblib 图床失败：${msg}` };
  }
}
