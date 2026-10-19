// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { parseMetadataPropertyInput } from "../../data/properties/property-types.js";
import { PRESENT_PROPERTY_VALUE, isSpecialPropertyValue, rawSampleForPropertyValue } from "../../data/properties/property-values.js";
import { NO_TAGS_FILTER_VALUE } from "../../data/tags/tag-values.js";
import { normalizeVaultFolderPath } from "../../utils/vault-paths.js";
import { Notice, TFile, TFolder } from "obsidian";
// Instance method owner. `this` is the unchanged SearchCreateController instance. No additional state store.
export const SearchCreateController_payload_methods = {


    _sanitizeTitle(rawQuery) {
        const title = rawQuery.replace(/[\\/:*?"<>|#^[\]]/g, " ").replace(/\s+/g, " ").trim();
        if (!title) new Notice(`「${rawQuery}」含非法字符，无法用作文件名`);
        return title;
    },


    _resolveFolder(type) {
        const selectedFolders = [...(this._draft().filterState?.folders || [])];
        if (selectedFolders.length !== 1) return "";
        const selected = selectedFolders[0];
        return selected === "/" ? "" : normalizeVaultFolderPath(selected);
    },


    _effectiveFolder(type = this._currentCreateType()) {
        return this._resolveFolder(type);
    },


    _templateVariables(title, now = new Date()) {
        const date = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
        const time = [
            String(now.getHours()).padStart(2, "0"),
            String(now.getMinutes()).padStart(2, "0"),
            String(now.getSeconds()).padStart(2, "0")
        ].join(":");
        return {
            title,
            date,
            time,
            datetime: `${date} ${time}`,
            year: String(now.getFullYear()),
            month: String(now.getMonth() + 1).padStart(2, "0"),
            day: String(now.getDate()).padStart(2, "0"),
            hour: String(now.getHours()).padStart(2, "0"),
            minute: String(now.getMinutes()).padStart(2, "0")
        };
    },


    _applyTemplateVariables(content, values) {
        return content.replace(
            /\{\{(title|date|time|datetime|year|month|day|hour|minute)\}\}/g,
            (_, key) => values[key] ?? ""
        );
    },


    _effectiveTemplateSetting(type = this._currentCreateType()) {
        const setting = this._draft().templates?.[type];
        return {
            enabled: !!setting?.enabled && !!setting.path,
            path: setting?.enabled ? String(setting.path || "") : ""
        };
    },


    _applyTemplateVariablesToJson(content, values) {
        const replaceValue = value => {
            if (typeof value === "string") {
                return this._applyTemplateVariables(value, values);
            }
            if (Array.isArray(value)) {
                return value.map(replaceValue);
            }
            if (value && typeof value === "object") {
                return Object.fromEntries(
                    Object.entries(value).map(([key, item]) => [
                        key,
                        replaceValue(item)
                    ])
                );
            }
            return value;
        };

        return JSON.stringify(
            replaceValue(JSON.parse(content)),
            null,
            2
        );
    },


    async _buildTemplateContent(type, title, fallback) {
        const core = this.owner;
        const setting = this._effectiveTemplateSetting(type);
        if (!setting.enabled || !setting.path) return fallback;

        try {
            const templateFile = core.app.vault.getAbstractFileByPath(
                setting.path
            );
            if (!(templateFile instanceof TFile)) return fallback;

            const templateContent = await core.app.vault.read(templateFile);
            const values = this._templateVariables(title);

            if (type === "canvas") {
                return this._applyTemplateVariablesToJson(
                    templateContent,
                    values
                );
            }

            return this._applyTemplateVariables(
                templateContent,
                values
            );
        } catch (err) {
            console.warn(`${type} 模板加载失败，使用默认内容`, err);
            return fallback;
        }
    },


    async _buildMarkdownContent(title) {
        // 文件名已经承担标题；默认正文保持空白，避免新建后再复制一个同名 H1。
        // 显式模板仍原样生效，模板若主动包含标题则不替用户删除。
        return this._buildTemplateContent(
            "md",
            title,
            ""
        );
    },


    _buildExcalidrawContent(title) {
        const data = {
            type: "excalidraw",
            version: 2,
            source: "https://github.com/zsviczian/obsidian-excalidraw-plugin/releases/tag/2.2.12",
            elements: [],
            appState: {
                gridSize: null,
                gridStep: 5,
                viewBackgroundColor: "#ffffff"
            },
            files: {}
        };
        return `---
excalidraw-plugin: parsed
tags: [excalidraw]
---

%%
# Drawing

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
%%`;
    },


    async _buildPayload(type, title) {
        if (type === "canvas") {
            const fallback = JSON.stringify(
                { nodes: [], edges: [] },
                null,
                2
            );

            return {
                extension: "canvas",
                content: await this._buildTemplateContent(
                    "canvas",
                    title,
                    fallback
                )
            };
        }

        if (type === "excalidraw") {
            return {
                // 中文短后缀由创建路径统一生成，真正绘图类型由 excalidraw-plugin YAML 决定。
                extension: "md",
                content: await this._buildTemplateContent(
                    "excalidraw",
                    title,
                    this._buildExcalidrawContent(title)
                )
            };
        }

        return {
            extension: "md",
            content: await this._buildMarkdownContent(title)
        };
    },


    async _resolvePath(core, folder, title, extension) {
        if (!folder) return `${title}.${extension}`;

        const existingFolder = core.app.vault.getAbstractFileByPath(folder);
        if (existingFolder instanceof TFolder) {
            return `${folder}/${title}.${extension}`;
        }
        if (existingFolder) {
            throw new Error(`默认目录不是文件夹：${folder}`);
        }

        await core.plugin.fileOperations.createFolder(folder, { allowExisting: true });
        return `${folder}/${title}.${extension}`;
    },


    _typedPropertyValue(key, normalizedValue) {
        const core = this.owner;
        if (
            normalizedValue === PRESENT_PROPERTY_VALUE
            || isSpecialPropertyValue(normalizedValue)
        ) return undefined;

        // New draft keys have no vault sample yet. Their selected type remains
        // local to CreateDraft (including recovery) until the file is created.
        if (this.createDraft?.propertyTypes?.has(key)) {
            return parseMetadataPropertyInput(normalizedValue, this._propertyTypeForKey(key));
        }

        for (const meta of core.plugin.fileMetaCache.values()) {
            if (!Object.prototype.hasOwnProperty.call(meta.properties || {}, key)) continue;
            const raw = meta.properties[key];
            const sample = rawSampleForPropertyValue(raw, normalizedValue);
            if (sample !== undefined) return sample;
        }
        return parseMetadataPropertyInput(normalizedValue, this._propertyTypeForKey(key));
    },


    _createMetadataSnapshot(filterState) {
        const tags = [...filterState.tags].filter(
            tag => tag !== NO_TAGS_FILTER_VALUE
        );
        const properties = [...this._normalizeCreateProperties(filterState.properties)]
            .map(([key, values]) => {
                const typed = [...values]
                    .map(value => this._typedPropertyValue(key, value))
                    .filter(value => value !== undefined);
                return [key, !typed.length ? undefined
                    : this._propertyTypeForKey(key) === "multitext" ? typed : typed[0]];
            });
        return { tags, properties };
    },
};

