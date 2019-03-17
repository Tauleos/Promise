const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class Sorrow {

    constructor(excutor) {
        this.status = PENDING;
        this.value = undefined;
        this.reason = undefined;
        this.fulfillCallback = [];
        this.rejectCallback = [];

        const resolve = (value) => {
            if (value instanceof Sorrow) {
                return value.then(resolve, reject);
            }
            process.nextTick(() => {
                if (this.status === PENDING) {
                    this.status = FULFILLED;
                    this.value = value;
                    for (let cb of this.fulfillCallback) {
                        cb(value);
                    }
                }
            })

        };
        const reject = (reason) => {
            process.nextTick(() => {
                if (this.status === PENDING) {
                    this.status = REJECTED;
                    this.reason = reason;
                    for (let cb of this.rejectCallback) {
                        cb(reason);
                    }
                }
            })
        };

        try {
            excutor(resolve, reject);
        } catch (e) {
            reject(e);
        }

    }
    //Promise解析过程
    resolvePromise(promise, x, resolve, reject) {

        if (promise === x) {
            return reject(new TypeError('wenlei'));
        }
        let called = false; // 避免多次调用
        if (x instanceof Sorrow) {
            if (x.status === PENDING) {
                x.then(y => {
                    this.resolvePromise(promise, y, resolve, reject);
                }, error => {
                    reject(error);
                })
            } else {
                x.then(resolve, reject);
            }
        } else if (x != null && (typeof x === 'object' || typeof x === 'function')) {
            try {
                let then = x.then;
                if (typeof then === 'function') {
                    then.call(x, y => {
                        if (called) return;
                        called = true;
                        this.resolvePromise(promise, y, resolve, reject);
                    }, r => {
                        if (called) return;
                        called = true;
                        reject(r);
                    })
                } else {
                    resolve(x);
                }

            } catch (e) {
                if (called) return;
                called = true;
                reject(e);
            }
        } else {
            resolve(x);
        }
    }

    then(onFulfilled, onReject) {
        
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : (value) => value;
        onReject = typeof onReject === 'function' ? onReject : (error) => { throw error };
        let brige;

        if (this.status === PENDING) {
            return brige = new Sorrow((resolve, reject) => {
                this.fulfillCallback.push((value) => {
                    try {
                        let x = onFulfilled(value);
                        this.resolvePromise(brige, x, resolve, reject);

                    } catch (e) {
                        reject(e);
                    }
                })
                this.rejectCallback.push((reason) => {
                    try {
                        let x = onReject(reason);
                        this.resolvePromise(brige, x, resolve, reject);
                    } catch (e) {
                        reject(e);
                    }
                })
            });
        }
        if (this.status === FULFILLED) {
            return brige = new Sorrow((resolve, reject) => {
                process.nextTick(() => {
                    try {
                        let x = onFulfilled(this.value);
                        this.resolvePromise(brige, x, resolve, reject);

                    } catch (e) {
                        reject(e);
                    }
                })

            });

        }
        if (this.status === REJECTED) {
            return brige = new Sorrow((resolve, reject) => {
                process.nextTick(() => {
                    try {
                        let x = onReject(this.reason);
                        this.resolvePromise(brige, x, resolve, reject);
                    } catch (e) {
                        reject(e);
                    }
                })
            });
        }
    }
    catch(onReject) {
        return this.then(undefined, onReject);

    }

    static resolve(value) {
        return new Sorrow((resolved) => {
            resolved(value);
        })

    }
    static reject(reason) {
        return new Sorrow((undefined, rejected) => {
            rejected(reason);
        })

    }
    static deferred() {
        let defer = {};
        defer.promise = new Sorrow((resolve, reject) => {
            defer.resolve = resolve;
            defer.reject = reject;
        });
        return defer;
    }
}

module.exports = Sorrow;