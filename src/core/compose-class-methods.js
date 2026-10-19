// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.

/** Bind single-owner method groups without delegation wrappers or new instance state.
 * Preserve the original prototype chain, method identity, length, names, getters,
 * non-enumerability and original own-key order. Reject duplicate/missing methods.
 * Methods using super/private fields MUST stay in the native class declaration.
 */
export function composeClassMethods(Target, groups, order) {
    const proto = Target.prototype;
    const descriptors = Object.getOwnPropertyDescriptors(proto);
    delete descriptors.constructor;
    for (const group of groups) {
        for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(group))) {
            if (Object.prototype.hasOwnProperty.call(descriptors, key)) throw new Error('Duplicate method: ' + Target.name + '.' + key);
            descriptors[key] = { ...descriptor, enumerable: false };
        }
    }
    if (new Set(order).size !== order.length || order.length !== Object.keys(descriptors).length)
        throw new Error('Invalid composition order: ' + Target.name);
    for (const key of Object.keys(descriptors)) {
        if (Object.prototype.hasOwnProperty.call(proto, key)) delete proto[key];
    }
    for (const key of order) {
        if (!Object.prototype.hasOwnProperty.call(descriptors, key)) throw new Error('Missing method: ' + Target.name + '.' + key);
        Object.defineProperty(proto, key, descriptors[key]);
    }
    return Target;
}

