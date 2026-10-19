// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { composeClassMethods } from "../../core/compose-class-methods.js";
import { BatchMetadataController_mutation_flow_methods } from "./mutation-flow-methods.js";
import { BatchMetadataController_property_editor_methods } from "./property-editor-methods.js";
import { BatchMetadataController_tag_editor_methods } from "./tag-editor-methods.js";



// ========== BatchMetadataController：标签 / 属性增删的唯一 Picker 工作流 ==========
export class BatchMetadataController {

    constructor(owner) {
        this.owner = owner;
        this.app = owner.app;
        this.plugin = owner.plugin;
    }


    get _destroyed() {
        return !this.owner || this.owner._destroyed;
    }


    destroy() {
        this.owner = null;
    }
}

composeClassMethods(BatchMetadataController, [BatchMetadataController_mutation_flow_methods, BatchMetadataController_tag_editor_methods, BatchMetadataController_property_editor_methods], ["_destroyed","destroy","editablePaths","_summary","_metadataUniverse","_invalidateMetadata","_batchExistingTags","_batchExistingPropertyCatalog","_propertyExistsInVault","_syncCreatedPropertyTypes","_isActive","_finishMutation","_runMutation","_createDraftFooter","_activateBatchPickerSearch","_renderTagPicker","_renderPropertyPicker","open"]);

