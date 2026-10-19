import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prepareSubjects, loadSubject, plain } from './harness.mjs';

let context, subject;
before(() => { prepareSubjects(); context = loadSubject('B'); subject = context.subject; });
after(() => context?.dispose());

function definitions(name, collapsed = false) {
    return plain(subject.SearchNavigatorController.prototype._definitions.call({
        core: {
            app: { vault: { getName: () => name } },
            plugin: { settings: {} }
        },
        collapsed: new Set(collapsed ? ['folder'] : [])
    }));
}

test('top folder section uses the actual vault name, not the static category name', () => {
    assert.deepEqual(definitions('Wisdom_手机端')[0], ['folder', 'Wisdom_手机端', 'open-vault']);
    assert.deepEqual(definitions('团队知识库')[0], ['folder', '团队知识库', 'open-vault']);
});

test('root icon follows the same vault/open-vault convention as Notebook Navigator', () => {
    assert.equal(definitions('Wisdom_手机端', true)[0][2], 'vault');
    assert.equal(definitions('Wisdom_手机端', false)[0][2], 'open-vault');
});

test('non-root groups and stable internal IDs stay unchanged', () => {
    const rows = definitions('Wisdom_手机端');
    assert.deepEqual(rows.slice(1), [['tags', '标签', 'tags'], ['properties', '属性', 'list']]);
    assert.equal(subject.navigatorItemId('group', 'folder'), '["group","folder",""]');
});

test('blank vault names fall back to the original folder caption', () => {
    assert.equal(definitions('   ')[0][1], '文件夹');
});
