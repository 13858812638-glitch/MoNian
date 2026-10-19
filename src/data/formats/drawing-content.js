// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



export function canvasNodeCountFromContent(content) {
    try {
        const data = JSON.parse(String(content || ""));
        return Array.isArray(data?.nodes) ? data.nodes.length : 0;
    } catch (_) {
        return 0;
    }
}


export const LZ_BASE64_ALPHABET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

export const LZ_BASE64_INDEX = new Map(
    [...LZ_BASE64_ALPHABET].map((char, index) => [char, index])
);


// Excalidraw 的 compressed-json 使用 LZString.compressToBase64。
// 这里只保留只读解压所需的最小解码器，避免把计数能力绑定到 Excalidraw 插件生命周期。
export function decompressLzBase64(input) {
    const source = String(input || "").replace(/\s+/g, "");
    if (!source) return null;

    const nextValue = index => {
        const value = LZ_BASE64_INDEX.get(source.charAt(index));
        return Number.isFinite(value) ? value : 0;
    };
    const data = { val: nextValue(0), position: 32, index: 1 };
    const dictionary = [];
    const result = [];
    let enlargeIn = 4;
    let dictSize = 4;
    let numBits = 3;

    for (let index = 0; index < 3; index += 1) {
        dictionary[index] = String(index);
    }

    const readBits = bitCount => {
        let bits = 0;
        let power = 1;
        const maxPower = Math.pow(2, bitCount);
        while (power !== maxPower) {
            const resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
                data.position = 32;
                data.val = nextValue(data.index++);
            }
            if (resb > 0) bits |= power;
            power <<= 1;
        }
        return bits;
    };

    let initial = readBits(2);
    let character = "";
    if (initial === 0) character = String.fromCharCode(readBits(8));
    else if (initial === 1) character = String.fromCharCode(readBits(16));
    else if (initial === 2) return "";
    else return null;

    dictionary[3] = character;
    let word = character;
    result.push(character);

    while (true) {
        if (data.index > source.length) return null;

        let code = readBits(numBits);
        if (code === 0) {
            dictionary[dictSize++] = String.fromCharCode(readBits(8));
            code = dictSize - 1;
            enlargeIn -= 1;
        } else if (code === 1) {
            dictionary[dictSize++] = String.fromCharCode(readBits(16));
            code = dictSize - 1;
            enlargeIn -= 1;
        } else if (code === 2) {
            return result.join("");
        }

        if (enlargeIn === 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits += 1;
        }

        let entry = dictionary[code];
        if (entry === undefined) {
            if (code !== dictSize) return null;
            entry = word + word.charAt(0);
        }

        result.push(entry);
        dictionary[dictSize++] = word + entry.charAt(0);
        enlargeIn -= 1;
        word = entry;

        if (enlargeIn === 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits += 1;
        }
    }
}


export function excalidrawSceneFromContent(content) {
    const source = String(content || "");
    const trimmed = source.trim();

    // 兼容 legacy .excalidraw 纯 JSON。
    if (trimmed.startsWith("{")) {
        try {
            const scene = JSON.parse(trimmed);
            if (Array.isArray(scene?.elements)) return scene;
        } catch (_) {
            // 继续尝试 Markdown Drawing block。
        }
    }

    const heading = source.match(/^#{1,2}\s+Drawing\s*$/im);
    const drawingSource = heading
        ? source.slice((heading.index || 0) + heading[0].length)
        : source;
    const block = drawingSource.match(
        /```(json|compressed-json)\s*\r?\n([\s\S]*?)```/i
    );
    if (!block) return null;

    let jsonText = block[2].trim();
    if (String(block[1]).toLowerCase() === "compressed-json") {
        jsonText = decompressLzBase64(jsonText);
    }
    if (!jsonText) return null;

    try {
        const scene = JSON.parse(jsonText);
        return Array.isArray(scene?.elements) ? scene : null;
    } catch (_) {
        return null;
    }
}


export function excalidrawElementCountFromContent(content) {
    const scene = excalidrawSceneFromContent(content);
    if (!scene) return null;
    return scene.elements.reduce(
        (count, element) => count + (element && element.isDeleted !== true ? 1 : 0),
        0
    );
}
