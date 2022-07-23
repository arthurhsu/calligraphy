// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 */

class Resolver {
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;
    });
  }

  resolve(value) {
    this.resolveFn(value);
  }

  reject(reason) {
    this.rejectFn(reason);
  }
}

export {Resolver}