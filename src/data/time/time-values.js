// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { parseYaml } from "obsidian";


export const GLS_MANAGED_TIME_KEYS = new Set([
    "gls_created_at", "gls_created_source", "gls_body_modified_at", "gls_body_fingerprint",
    "gls_file_modified_at", "gls_file_fingerprint"
]);


export function indexedFileProperties(frontmatter) {
    const properties = frontmatter && typeof frontmatter === "object" && !Array.isArray(frontmatter)
        ? { ...frontmatter } : {};
    delete properties.position;
    for (const internal of GLS_MANAGED_TIME_KEYS) {
        delete properties[internal];
    }
    return properties;
}


// “正文修改时间”只排除文件头部 YAML frontmatter；
// 正文里的标签、格式、空白、代码、Callout 等都属于真实正文变化。
// 这里不复用摘要净化逻辑，避免把用户实际编辑的格式变化误判成“正文未变”。
export function markdownBodyForContentTracking(content) {
    let text = String(content || "")
        .replace(/^\uFEFF/, "")
        .replace(/\r\n?/g, "\n");

    return text.replace(
        /^---[ \t]*\n(?:[\s\S]*?\n)?---[ \t]*(?:\n|$)/,
        ""
    );
}


// 轻量 53-bit 风格双 32-bit 指纹；非加密用途，只用于判断同一文件正文是否变化。
// length 一并进入结果，进一步降低碰撞概率。
export function fastContentFingerprint(text) {
    const source = String(text || "");
    let h1 = 0xdeadbeef ^ source.length;
    let h2 = 0x41c6ce57 ^ source.length;

    for (let i = 0; i < source.length; i++) {
        const ch = source.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
        ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
        ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return `${source.length}:${
        (h2 >>> 0).toString(36)
    }:${
        (h1 >>> 0).toString(36)
    }`;
}


export function markdownBodyFingerprint(content) {
    return fastContentFingerprint(
        markdownBodyForContentTracking(content)
    );
}


// 排除 GLS 自身时间字段；普通属性按值比较，YAML 重排/时间补写不制造业务修改。
export function stableTimeProperties(value, stack = new Set()) {
    if (!value || typeof value !== "object") return JSON.stringify(value) ?? "null";
    try { return JSON.stringify(new Date(Date.prototype.getTime.call(value)).toISOString()); } catch (_) {}
    if (stack.has(value)) throw new Error("时间属性不支持循环 YAML");
    stack.add(value);
    const result = Array.isArray(value)
        ? `[${value.map(item => stableTimeProperties(item, stack)).join(",")}]`
        : `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableTimeProperties(value[key], stack)}`).join(",")}}`;
    stack.delete(value);
    return result;
}


export function markdownTimePayload(content) {
    const text = String(content ?? "").replace(/^\uFEFF/, "");
    const header = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?=\r?\n|$)/.exec(text);
    // 非法 YAML 不可当成“没有时间”，保留上一份有效记录等下次成功读取。
    const parsed = header ? parseYaml(header[1] || "") : {};
    const frontmatter = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    const fingerprint = markdownBodyFingerprint(content);
    const fileFingerprint = fastContentFingerprint(fingerprint + "\n" + stableTimeProperties(indexedFileProperties(frontmatter)));
    return { frontmatter, fingerprint, fileFingerprint };
}


export function binaryTimeFingerprint(data) {
    const bytes = new Uint8Array(data);
    let a = 0x811c9dc5, b = 0x01000193;
    for (const value of bytes) {
        a = Math.imul(a ^ value, 16777619);
        b = Math.imul(b ^ value, 2246822519);
    }
    return `${bytes.length}:${(a >>> 0).toString(36)}:${(b >>> 0).toString(36)}`;
}


// 一个时间决策用于正文与整个文件：有效同步记录可读，本机实写可更新；观察到达不造时钟。
export function resolveTrackedModification({ fingerprint, previousFingerprint, previousAt, previousSource,
    storedFingerprint, storedAt, localAt, initialAt }) {
    const prior = parseGLSDate(previousAt), stored = parseGLSDate(storedAt);
    const changed = Boolean(fingerprint && previousFingerprint && fingerprint !== previousFingerprint);
    const matches = Boolean(fingerprint && storedFingerprint === fingerprint && stored);
    if (parseGLSDate(localAt) && changed) {
        if (matches && stored > prior) return { at: stored, source: "file-yaml" };
        return { at: localAt, source: "local-edit" };
    }
    if (matches && (!prior || !previousSource || stored >= prior)) return { at: stored, source: "file-yaml" };
    if (prior) return { at: prior, source: previousSource || "stored-history" };
    return { at: stored || parseGLSDate(initialAt), source: stored ? "file-yaml" : "initial-value" };
}


export const CONTENT_TIME_CACHE_VERSION = 3;
 // V265：创建/正文/文件修改的最终值一起持久化；仍读 V1/V2。
export const GLS_METADATA_DEFAULT_DIRECTORY = "GLS-元数据";

export const GLS_METADATA_HISTORY_VERSION = 1;


// 只允许仓库内普通文件夹：不接受绝对路径、上级跳转或 .obsidian 配置目录。
// 路径在真正写入前再次验证；不允许把元数据放在被 GLS 搜索的业务目录根层。
export function parseGLSDate(value) {
    let parsed = 0;
    if (typeof value === "number") parsed = value;
    else if (typeof value === "string" && value.trim()) parsed = Date.parse(value);
    else if (value && typeof value === "object") {
        try { parsed = Date.prototype.getTime.call(value); } catch (_) { return 0; }
    }
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 8640000000000000 ? parsed : 0;
}


export function isGLSTimeSidecarPath(path) {
    return /(?:^|\/)(?:(?:recent-opened-|content-times-|file-times-)[a-zA-Z0-9_-]+|content-time-cache)\.json$/.test(String(path || ""));
}


export function normalizeGLSMetadataDirectory(rawPath) {
    const raw = String(rawPath || "").trim().replace(/\\/g, "/");
    if (!raw || raw.startsWith("/") || /^[a-z]:\//i.test(raw)
        || /[<>:\"|?*\x00-\x1f]/.test(raw)) return null;
    const parts = raw.split("/");
    if (parts.some(part => !part.trim() || part === "." || part === ".." || part.startsWith("."))) return null;
    const result = parts.join("/");
    if (parts[0].toLowerCase() === ".obsidian" || parts[0] === ".") return null;
    return result;
}
