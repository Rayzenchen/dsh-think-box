// 输入框上飘、滑不到底时运行。全程约 20 秒，分两段，请按 Console 提示操作。
// 第 1 段（12 秒）：请用鼠标在对话区【上下反复滚动】，尽量往底部滚。
// 第 2 段（8 秒）：脚本会在页面右下角放一个几乎看不见的小方块，请再滚一次，
//                  看这时能不能滚到底、输入框会不会回到底部。
// 跑完后告诉 Claude：第 2 段里能否滚到底 / 输入框是否回到底部。
// 结果自动复制到剪贴板；若不是结果，在 Console 执行：copy(__tbScroll)
(async () => {
  // DevTools 的 copy() 只在本次执行的同步阶段可用，先拿到。
  const copyFn = typeof copy === 'function' ? copy : null
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
  const round = n => Math.round(n)
  const port = document.querySelector('[data-conversation-scroll]')
  const seat = document.querySelector('[data-composer-seat]')
  const t0 = performance.now()
  const now = () => round(performance.now() - t0)

  // 1. 拦截所有对对话区滚动位置的代码写入，记下调用栈（谁在把位置拉回去）。
  const writes = []
  const stackOf = () => (new Error().stack ?? '').split('\n').slice(2, 9).map(s => s.trim().replace(/\(?dsh-app:\/\/app\//, '(').slice(0, 140))
  const proto = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')
  Object.defineProperty(port, 'scrollTop', {
    configurable: true,
    get() { return proto.get.call(this) },
    set(value) {
      if (writes.length < 60) writes.push({ t: now(), kind: 'scrollTop=', value: round(value), before: round(proto.get.call(this)), stack: stackOf() })
      proto.set.call(this, value)
    },
  })
  const wrap = name => {
    const original = port[name]
    port[name] = function (...args) {
      if (writes.length < 60) writes.push({ t: now(), kind: name, value: JSON.stringify(args).slice(0, 80), before: round(proto.get.call(this)), stack: stackOf() })
      return original.apply(this, args)
    }
    return () => { delete port[name] }
  }
  const unwrap = ['scrollTo', 'scrollBy', 'scrollIntoView'].map(wrap)
  const origIntoView = Element.prototype.scrollIntoView
  Element.prototype.scrollIntoView = function (...args) {
    if (writes.length < 60) writes.push({ t: now(), kind: 'child.scrollIntoView', el: `${this.tagName}.${String(this.className).slice(0, 20)}`, stack: stackOf() })
    return origIntoView.apply(this, args)
  }

  // 2. 记录滚动事件与每次滚动后的主线程位置。
  const scrolls = []
  let wheels = 0
  const onScroll = () => { if (scrolls.length < 200) scrolls.push([now(), round(proto.get.call(port)), round(seat.getBoundingClientRect().top)]) }
  const onWheel = e => { wheels += 1; if (wheels <= 3) scrolls.push(['wheel', now(), round(e.deltaY), e.target === port || port.contains(e.target)]) }
  port.addEventListener('scroll', onScroll, { passive: true })
  addEventListener('wheel', onWheel, { capture: true, passive: true })

  const result = {
    start: { scrollTop: round(port.scrollTop), floor: port.scrollHeight - port.clientHeight, seatRect: [round(seat.getBoundingClientRect().top), round(seat.getBoundingClientRect().bottom)] },
  }

  console.log('%c[tb-scroll] 第 1 段（12 秒）：请在对话区上下反复滚动，尽量滚到底', 'font-weight:bold;color:#c00')
  await sleep(12000)
  result.phase1 = { wheels, scrollTop: round(port.scrollTop), floor: port.scrollHeight - port.clientHeight, seatTop: round(seat.getBoundingClientRect().top), scrollEvents: scrolls.length }

  // 3. 放一个几乎透明的固定小方块，测试"有额外合成层时画面是否恢复"。
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;right:0;bottom:0;width:4px;height:4px;background:rgba(255,0,0,.02);pointer-events:none;z-index:2147483647'
  document.body.append(probe)
  const mark = scrolls.length
  console.log('%c[tb-scroll] 第 2 段（8 秒）：已放置测试方块，请再滚到底，看能否到底、输入框是否回到底部', 'font-weight:bold;color:#c00')
  await sleep(8000)
  probe.remove()
  result.phase2 = { scrollTop: round(port.scrollTop), floor: port.scrollHeight - port.clientHeight, seatTop: round(seat.getBoundingClientRect().top), scrollEvents: scrolls.length - mark }

  port.removeEventListener('scroll', onScroll)
  removeEventListener('wheel', onWheel, { capture: true })
  delete port.scrollTop
  for (const undo of unwrap) undo()
  Element.prototype.scrollIntoView = origIntoView

  result.writes = writes
  result.scrollTrace = scrolls.slice(0, 120)
  globalThis.__tbScroll = JSON.stringify(result)
  if (copyFn !== null) copyFn(globalThis.__tbScroll)
  console.log('[tb-scroll]', result)
  console.log(copyFn !== null ? '[tb-scroll] 完成，已复制到剪贴板。' : '[tb-scroll] 完成。请执行：copy(__tbScroll)')
  return '[tb-scroll] done'
})()
