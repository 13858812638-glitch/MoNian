// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



// 优化分词：过滤虚词、轻量文本分段，超长文本截断
export function simpleSegment(text, maxRead = 8000) {
    // invariant: only user-authored separators create query units.
    // Chinese text is never silently split into n-grams or dictionary tokens.
    return [...new Set(String(text || "").slice(0, maxRead).toLowerCase()
        .split(/[\s,，;；|]+/).map(s => s.trim()).filter(Boolean))];
}


export function decodeReadableEntities(text) {
    return String(text || "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&#(\d+);/g, (_, value) => {
            const codePoint = Number.parseInt(value, 10);
            return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10FFFF
                ? String.fromCodePoint(codePoint)
                : " ";
        })
        .replace(/&#x([0-9a-f]+);/gi, (_, value) => {
            const codePoint = Number.parseInt(value, 16);
            return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10FFFF
                ? String.fromCodePoint(codePoint)
                : " ";
        });
}



export function readableWikiTarget(target) {
    const raw = String(target || "").trim().replace(/\^[^#]+$/, "");
    const parts = raw.split("#");
    const file = (parts.shift() || "").split("/").pop() || "";
    return [file, parts.join(" ").trim()].filter(Boolean).join(" ");
}


export function normalizeReadableText(text) {
    return decodeReadableEntities(text)
        .replace(/[ \t]*\|[ \t]*/g, " ")
        .replace(/\r?\n+/g, " ")
        .replace(/[ \t\f\v]+/g, " ")
        .trim();
}


export function stripReadableLineSyntax(text) {
    return text
        .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
        .replace(/^[ \t]*[-*+][ \t]+\[[ xX\-\/!?]\][ \t]*/gm, "")
        .replace(/^[ \t]*[-*+][ \t]+/gm, "")
        .replace(/^[ \t]*\d+[.)][ \t]+/gm, "")
        .replace(/^[ \t]*([-*_][ \t]*){3,}$/gm, "")
        .replace(/^[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?[ \t]*$/gm, "");
}


// Markdown / Obsidian 搜索与摘要净化入口。
// 搜索匹配、普通摘要与搜索摘要统一基于这一份可读纯文本，避免 offset 与展示口径漂移。
// “笔记字数”有独立语义：代码、引用、批注等用户实际写下的内容也应计入，
// 因此字数统计不再复用这里的降噪结果。
export function cleanMarkdownForSnippet(content) {
    let text = String(content || "").replace(/^\uFEFF/, "");

    // 文件级结构噪音：不属于用户实际阅读正文。
    text = text
        .replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, "\n")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/%%[\s\S]*?%%/g, " ")
        .replace(/^[ \t]*```+[^\n]*\r?\n[\s\S]*?(?:^[ \t]*```+[ \t]*(?:\r?\n|$)|(?![\s\S]))/gm, "\n")
        .replace(/^[ \t]*~~~+[^\n]*\r?\n[\s\S]*?(?:^[ \t]*~~~+[ \t]*(?:\r?\n|$)|(?![\s\S]))/gm, "\n")
        .replace(/\$\$[\s\S]*?\$\$/g, " ")
        .replace(/^[ \t]*\[[^\]]+\]:[ \t]*\S+.*$/gm, " ");

    // Obsidian 嵌入不把附件路径/目标名塞进摘要；普通双链保留用户可见的别名或可读目标。
    text = text
        .replace(/!\[\[[\s\S]*?\]\]/g, " ")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, target, alias) => String(alias || target).trim())
        .replace(/\[\[([^\]]+)\]\]/g, (_, target) => readableWikiTarget(target))
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/<https?:\/\/[^>]+>/gi, " ")
        .replace(/<mailto:[^>]+>/gi, " ")
        .replace(/<[^>]+>/g, " ");

    // 行内代码与脚注/块标识等技术性标记。
    text = text
        .replace(/`+[^`\n]*`+/g, " ")
        .replace(/(?<!\$)\$[^$\n]+\$(?!\$)/g, " ")
        .replace(/\[\^([^\]]+)\]/g, " ")
        .replace(/[ \t]+\^[A-Za-z0-9_-]+(?=\s|$)/gm, " ");

    // 行首 Markdown / Obsidian 结构符号。Callout 只去掉 [!TYPE] 壳，保留用户写的标题。
    text = text
        .replace(/^[ \t]*>[ \t]*\[![^\]]+\][+-]?[ \t]*/gmi, "")
        .replace(/^[ \t]*>[ \t]?/gm, "");
    text = stripReadableLineSyntax(text);

    // 只去格式语法壳，不删除被格式化的真实文字。
    text = text
        .replace(/\*\*([^*\n]+)\*\*/g, "$1")
        .replace(/__([^_\n]+)__/g, "$1")
        .replace(/~~([^~\n]+)~~/g, "$1")
        .replace(/==([^=\n]+)==/g, "$1")
        .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
        .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, "$1")
        .replace(/\\([#*_[\]()>`~|])/g, "$1");

    // 标签只去掉语法壳；裸 URL 在摘要里属于高噪音目标，普通 Markdown 链接的显示文字已在上面保留。
    text = text
        .replace(/(^|\s)#([^\s#]+)/g, "$1$2")
        .replace(/https?:\/\/[^\s)\]>]+/gi, " ");

    // 表格竖线、HTML 实体、换行与多余空白统一成自然语言间隔，绝不把相邻段落直接粘成一个词。
    return normalizeReadableText(text);
}


// 字数统计专用 Markdown / Obsidian 提取器。
// 与摘要降噪不同，这里保留“用户实际写下的内容”，只剥离结构壳：
// - 代码块 / 行内代码：保留代码正文，只去 fence / backtick；
// - 引用 / Callout：保留正文与自定义标题，只去 > / [!TYPE] 壳；
// - 标注：==高亮==、%%批注%%、HTML comment 内容都保留；
// - 数学块 / 行内公式：保留公式里的字母、数字；
// - 脚注定义：保留脚注正文；脚注引用标号本身不计；
// - Frontmatter 仍属于元数据，不计入正文；
// - 嵌入文件不递归展开，避免把其它文件内容重复计入当前笔记。
export function extractCountableTextFromMarkdown(content) {
    let text = String(content || "").replace(/^\uFEFF/, "");

    // Frontmatter：元数据，不属于正文阅读字数。
    text = text.replace(
        /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/,
        "\n"
    );

    // 批注 / 注释：保留用户写下的内容，只去隐藏壳。
    text = text
        .replace(/<!--([\s\S]*?)-->/g, (_, body) => ` ${body || ""} `)
        .replace(/%%([\s\S]*?)%%/g, (_, body) => ` ${body || ""} `);

    // fenced code：只去开 / 闭 fence 行，代码正文完整保留。
    text = text
        .replace(/^[ \t]*(?:`{3,}|~{3,})[^\r\n]*$/gm, " ")
        .replace(/`+([^`\r\n]*?)`+/g, (_, body) => ` ${body || ""} `);

    // 数学公式：只去 $ / $$ 定界符，公式内容参与统计。
    text = text
        .replace(/\$\$([\s\S]*?)\$\$/g, (_, body) => ` ${body || ""} `)
        .replace(/(?<!\$)\$([^$\r\n]+)\$(?!\$)/g, (_, body) => ` ${body || ""} `);

    // 引用型链接定义不显示；脚注定义正文保留。
    text = text
        .replace(/^[ \t]*\[(?!\^)[^\]]+\]:[ \t]*\S+.*$/gm, " ")
        .replace(/^[ \t]*\[\^[^\]]+\]:[ \t]*/gm, "")
        .replace(/\[\^[^\]]+\]/g, " ");

    // Obsidian 嵌入不递归展开；普通双链保留用户可见别名 / 目标。
    text = text
        .replace(/!\[\[[\s\S]*?\]\]/g, " ")
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt) => ` ${alt || ""} `)
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, target, alias) =>
            ` ${String(alias || target || "").trim()} `
        )
        .replace(/\[\[([^\]]+)\]\]/g, (_, target) => ` ${readableWikiTarget(target)} `)
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

    // URL / 邮箱在正文中按一个“串”计数，不拆成 https / domain / tld。
    text = text
        .replace(/<https?:\/\/[^>]+>/gi, " LSURLTOKEN ")
        .replace(/<mailto:[^>]+>/gi, " LSEMAILTOKEN ")
        .replace(/\bhttps?:\/\/[^\s)\]>]+/gi, " LSURLTOKEN ")
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " LSEMAILTOKEN ");

    // HTML 标签只去标签本身，保留标签之间的文字。
    text = text.replace(/<[^>]+>/g, " ");

    // Callout / 引用：只去结构壳，正文完整保留。
    text = text
        .replace(/^[ \t]*>[ \t]*\[![^\]]+\][+-]?[ \t]*/gmi, "")
        .replace(/^[ \t]*>[ \t]?/gm, "");

    // 标题、列表、任务、编号、表格分隔线：去结构符号，保留实际文字。
    text = stripReadableLineSyntax(text);

    // 强调 / 高亮 / 删除线：只去语法壳，内部文字继续计数。
    text = text
        .replace(/\*\*([^*\r\n]+)\*\*/g, "$1")
        .replace(/__([^_\r\n]+)__/g, "$1")
        .replace(/~~([^~\r\n]+)~~/g, "$1")
        .replace(/==([^=\r\n]+)==/g, "$1")
        .replace(/(?<!\*)\*([^*\r\n]+)\*(?!\*)/g, "$1")
        .replace(/(?<!\w)_([^_\r\n]+)_(?!\w)/g, "$1")
        .replace(/\\([#*_[\]()>`~|])/g, "$1");

    // 标签仅去 #；块 ID 属于技术锚点，不计。
    text = text
        .replace(/(^|\s)#([^\s#]+)/g, "$1$2")
        .replace(/[ \t]+\^[A-Za-z0-9_-]+(?=\s|$)/gm, " ");

    return normalizeReadableText(text);
}


// 统一正文“字数”口径：
// - 每个汉字计 1；
// - 一串连续数字计 1（1,356 / 3.14 也各计 1）；
// - 一串连续英文 / 英数字标识计 1（ChatGPT / SKU123 / foo_bar 各计 1）；
// - 其它文字脚本按连续词段计 1；
// - 空白、标点、Markdown 结构符号不计。
export function readableTokenCountFromText(text) {
    const source = String(text || "");
    if (!source) return 0;

    const tokenRe =
        /[\p{Script=Han}]|\d+(?:[.,]\d+)*|[A-Za-z]+(?:[A-Za-z0-9_'’\-]*[A-Za-z0-9])?|[\p{L}\p{M}]+/gu;

    let count = 0;
    while (tokenRe.exec(source)) count++;
    return count;
}
