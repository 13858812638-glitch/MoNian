// Engineering extraction from frozen GLS Navigator 2026-10-15.7.
// Edit this module, not dist/main.js. See docs/ARCHITECTURE.md.



// IO并发池
export class IoPool {
    constructor(limit) {
        const parsedLimit = Number.parseInt(String(limit), 10);
        this.limit = Number.isFinite(parsedLimit) && parsedLimit > 0
            ? parsedLimit
            : 1;
        this.running = 0;
        this.queue = [];
    }
    run(fn) {
        return new Promise((resolve, reject) => {
            const task = async () => {
                this.running++;
                try {
                    resolve(await fn());
                } catch (error) {
                    reject(error);
                } finally {
                    this.running--;
                    this.next();
                }
            };
            if (this.running < this.limit) void task();
            else this.queue.push(task);
        });
    }
    next() {
        if (this.queue.length && this.running < this.limit) {
            void this.queue.shift()();
        }
    }

    async forEach(items, fn, shouldContinue) {
        const batchSize = 300;
        for (let i = 0; i < items.length && shouldContinue(); i += batchSize) {
            await Promise.all(items.slice(i, i + batchSize).map(item => this.run(() => fn(item))));
            if (!shouldContinue()) return;
            if (i + batchSize < items.length) await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
}
