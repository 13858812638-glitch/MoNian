// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { composeClassMethods } from "../../core/compose-class-methods.js";
import { FilterState } from "../filters/filter-state.js";
import { SearchCreateController_create_file_methods } from "./create-file-methods.js";
import { SearchCreateController_draft_and_metadata_methods } from "./draft-and-metadata-methods.js";
import { SearchCreateController_input_mode_methods } from "./input-mode-methods.js";
import { SearchCreateController_payload_methods } from "./payload-methods.js";
import { SearchCreateController_preview_methods } from "./preview-methods.js";


// ========== Create Flow：创建模式 / 模板 / 创建元数据 / 新建文件唯一实现 ==========
export class SearchCreateController {

    constructor(owner) {
        this.owner = owner;
        this.inputMode = "search";
        this.quickCreateTitle = "";
        this._createInFlight = false;
        this.searchFilterState = null;
        this.searchQuery = "";
        this.createDraft = this._makeCreateDraft();
    }


    destroy() {
        const core = this.owner;
        if (core && this.searchFilterState instanceof FilterState) {
            core.filterState = this.searchFilterState;
        }
        this.inputMode = "search";
        this.quickCreateTitle = "";
        this._createInFlight = false;
        this.searchFilterState = null;
        this.searchQuery = "";
        this.createDraft = null;
        this.owner = null;
    }
}

composeClassMethods(SearchCreateController, [SearchCreateController_draft_and_metadata_methods, SearchCreateController_input_mode_methods, SearchCreateController_preview_methods, SearchCreateController_payload_methods, SearchCreateController_create_file_methods], ["destroy","captureDraft","restoreDraft","typeOptions","_propertyTypeForKey","_normalizeCreateProperties","_makeCreateDraft","_draft","_currentCreateType","_syncDraftTypeFromFacetState","_createTypeOption","_setDraftTemplate","_openDraftTemplatePicker","cycleCreateType","openMetadataPicker","_draftMetadataSummary","_applyDraftMetadata","_pendingCreationSnapshot","retainPartialFileAndReturn","clearCreateConditions","remapTemplatePaths","_refreshCreatePreview","_syncQuickCreateButton","_syncCreateTitlePreview","isCreateMode","isDerivedCreateView","isCreateView","currentCreateTitle","searchResultFilterState","_leaveDerivedCreateView","prepareSearchEvaluation","syncDerivedCreateViewState","activeInputHasValue","syncInputModeView","enterCreateMode","toggleInputMode","clearActiveInput","handleInput","submitCreateView","renderQuickCreatePreview","_displayCreatePathName","_activeCreateTags","_activeCreateProperties","_effectiveCreateFilterState","_sanitizeTitle","_resolveFolder","_effectiveFolder","_templateVariables","_applyTemplateVariables","_effectiveTemplateSetting","_applyTemplateVariablesToJson","_buildTemplateContent","_buildMarkdownContent","_buildExcalidrawContent","_buildPayload","_resolvePath","_typedPropertyValue","_createMetadataSnapshot","createNewNote"]);

