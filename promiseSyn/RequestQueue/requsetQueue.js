 // pify 库是一个专门用来将callback样式的库转化为Promise风格接口的库，除此之外别无任何其他功能，所以pify是一个非常轻量、低碳的库。
const pify = require('pify'); 
class RequestQueue {
  constructor({
    maxLimit = 10, // 最大并发数
    requestApi, // 请求API
    needChange2Promise,
  }) {
    this.maxLimit = maxLimit;
    this.requestQueue = []; // 请求队列,判断当前请求并发量已经超过maxLimit,则将该请求加入到请求队列中
    this.currentCount = 0; // 当前并发量数目
    // 使用者定义的请求api，若用户传入needChange2Promise为true,则将用户的callback类api使用pify这个库将其转化为promise类的。
    this.requestApi = needChange2Promise ? pify(requestApi) : requestApi;
  }
  // 发起请求api
  async request(...args) {
    // 若当前请求数并发量超过最大并发量限制，则将其阻断在这里。
    // startBlocking会返回一个promise，并将该promise的resolve函数放在this.requestQueue队列里。除非这个promise被resolve,否则不会继续向下执行。
    if (this.currentCount >= this.maxLimit) {
      await this.startBlocking();
    }
    try {
      // 正常情况下请求队列里按顺执行
      this.currentCount++;
      const result = await this.requestApi(...args);
      return Promise.resolve(result);
    } catch (err) {
      return Promise.reject(err);
    } finally {
    // 当之前发出的请求结果回来/请求失败的时候，则将当前并发量-1
      console.log('当前并发数:', this.currentCount);
      this.currentCount--;
    // 调用this.next函数执行队列中的请求,从this.requestQueue队列里取出队首的resolve函数并且执行。这样，对应的请求则可以继续向下执行。
      this.next();
    }
  }
  // 新建一个promise,并且将该reolsve函数放入到requestQueue队列里。
  startBlocking() {
    let resolveTemp;
    let promiseNew = new Promise((resolve, reject) => resolveTemp = resolve);
    this.requestQueue.push(resolveTemp);
    return promiseNew;
  }
  // 从请求队列里取出队首的resolve并执行。
  next() {
    if (this.requestQueue.length <= 0) return;
    const resolveTemp = this.requestQueue.shift();
    resolveTemp();
  }
}

module.exports = RequestQueue;