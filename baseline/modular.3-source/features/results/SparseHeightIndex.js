// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.
import { RESULT_ROW_HEIGHT_ESTIMATE } from "./virtualization-config.js";


// 可变高度虚拟列表只保存“已测量行相对基准高度的差值”。
// 未测量行继续使用同一视图的稳定估算值；Fenwick 前缀高度为 O(log n)，
// scrollTop → position 使用 Fenwick binary lifting 为 O(log n)，不做按行扫描。
export class SparseHeightIndex {
    constructor() {
        this.reset(0, RESULT_ROW_HEIGHT_ESTIMATE);
    }

    reset(size, estimate = RESULT_ROW_HEIGHT_ESTIMATE) {
        this.size = Math.max(0, Number(size) || 0);
        this.estimate = Math.max(1, Number(estimate) || RESULT_ROW_HEIGHT_ESTIMATE);
        this.tree = new Float64Array(this.size + 1);
        this.measured = new Map();
    }

    _add(index, delta) {
        for (let i = index + 1; i <= this.size; i += i & -i) {
            this.tree[i] += delta;
        }
    }

    set(index, height) {
        if (!Number.isInteger(index) || index < 0 || index >= this.size) return false;
        const next = Math.max(1, Number(height) || this.estimate);
        const previous = this.measured.has(index)
            ? this.measured.get(index)
            : this.estimate;
        if (Math.abs(next - previous) < 0.5) return false;
        this.measured.set(index, next);
        this._add(index, next - previous);
        return true;
    }

    rebaseEstimate(estimate) {
        const next = Math.max(1, Number(estimate) || RESULT_ROW_HEIGHT_ESTIMATE);
        if (Math.abs(next - this.estimate) < 0.5) return false;
        this.estimate = next;
        this.tree = new Float64Array(this.size + 1);
        for (const [index, height] of this.measured) {
            this._add(index, height - next);
        }
        return true;
    }

    _deltaPrefix(count) {
        let sum = 0;
        for (let i = Math.max(0, Math.min(this.size, Number(count) || 0)); i > 0; i -= i & -i) {
            sum += this.tree[i];
        }
        return sum;
    }

    prefix(count) {
        const n = Math.max(0, Math.min(this.size, Number(count) || 0));
        return n * this.estimate + this._deltaPrefix(n);
    }

    total() {
        return this.prefix(this.size);
    }

    positionAt(offset) {
        if (!this.size) return -1;
        const target = Math.max(0, Math.min(this.total() - 1, Number(offset) || 0));
        // Dida Master：Fenwick binary lifting 直接定位前缀位置，O(log n)。
        // 不再对 prefix() 做外层二分，滚动热路径由 O(log² n) 收口为 O(log n)。
        let index = 0;
        let sum = 0;
        let step = 1;
        while (step * 2 <= this.size) step *= 2;
        for (; step >= 1; step = Math.floor(step / 2)) {
            const next = index + step;
            if (next > this.size) continue;
            const value = sum + this.tree[next] + step * this.estimate;
            if (value <= target) {
                index = next;
                sum = value;
            }
        }
        return Math.min(index, this.size - 1);
    }
}
