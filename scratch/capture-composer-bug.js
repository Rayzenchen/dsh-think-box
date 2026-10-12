// 思维链显示增强：完成后卡住 / 输入框上飘 —— 现场采集脚本
//
// 用法：bug 出现时（先别退出会话、先别点展开），在 DSH 里按 Option+Cmd+I 打开
// DevTools，把本文件全部内容粘进 Console 回车，等约 6 秒。
// 脚本会：采集当前状态 → 自动点开最后一个「工作步骤」→ 再采集 → 自动收回。
// 结果自动复制到剪贴板，直接粘贴给 Claude 即可。
// 如果剪贴板没拿到，在 Console 里再执行：copy(__tbCapture)
(async () => {
  const copyFn = typeof copy === 'function' ? copy : null
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
  const round = n => Math.round(n)
  const rect = el => { const r = el.getBoundingClientRect(); return [round(r.top), round(r.bottom), round(r.height)] }
  const short = el => el === null || el === undefined ? null : `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0].slice(0, 24)}`
  const dataAttrs = el => [...el.attributes].map(a => a.name).filter(n => n.startsWith('data-')).slice(0, 6).join(',')
  const meaningfulStyle = el => {
    const s = el.getAttribute('style')
    if (s === null) return null
    const kept = s.split(';').map(p => p.trim()).filter(p => p !== '' && !p.startsWith('--') && p !== 'display: contents')
    return kept.length === 0 ? null : kept.join('; ')
  }
  const describe = el => ({ el: short(el), kind: el.getAttribute('data-chat-flow-kind'), data: dataAttrs(el), style: meaningfulStyle(el), rect: rect(el) })

  const snapshot = () => {
    const port = document.querySelector('[data-conversation-scroll]')
    const seat = document.querySelector('[data-composer-seat]')
    if (port === null || seat === null) return { error: `port=${port !== null} seat=${seat !== null}` }
    const flow = port.querySelector('[data-chat-flow]')
    const portRect = port.getBoundingClientRect()
    const seatChain = []
    for (let el = seat; el !== null && el !== document.documentElement; el = el.parentElement) {
      const cs = getComputedStyle(el)
      seatChain.push({
        ...describe(el),
        position: cs.position, top: cs.top, bottom: cs.bottom, transform: cs.transform === 'none' ? undefined : cs.transform,
        overflowY: cs.overflowY, display: cs.display, flex: cs.flex, minHeight: cs.minHeight, maxHeight: cs.maxHeight === 'none' ? undefined : cs.maxHeight,
      })
    }
    const styled = [...port.querySelectorAll('[style]')].filter(el => meaningfulStyle(el) !== null && !seat.contains(el)).slice(0, 40).map(describe)
    const transformed = [...port.querySelectorAll('*')].filter(el => !seat.contains(el) && getComputedStyle(el).transform !== 'none').slice(0, 20).map(el => ({ el: short(el), kind: el.getAttribute('data-chat-flow-kind'), transform: getComputedStyle(el).transform }))
    // What fills the space under the composer when it floats.
    const probeY = portRect.bottom - 12
    const below = document.elementsFromPoint(portRect.left + portRect.width / 2, probeY).slice(0, 6).map(short)
    return {
      phase: document.querySelector('[data-phase]')?.getAttribute('data-phase'),
      contentPhase: document.querySelector('[data-content-phase]')?.getAttribute('data-content-phase'),
      port: {
        style: port.getAttribute('style'), followOwned: port.getAttribute('data-follow-owned'),
        scrollTop: round(port.scrollTop), scrollHeight: port.scrollHeight, clientHeight: port.clientHeight,
        floor: port.scrollHeight - port.clientHeight, rect: rect(port), overflowAnchor: getComputedStyle(port).overflowAnchor,
      },
      seat: { rect: rect(seat), gapToPortBottom: round(portRect.bottom - seat.getBoundingClientRect().bottom) },
      seatChain,
      flowStyle: flow === null ? null : flow.getAttribute('style'),
      flowTail: flow === null ? [] : [...flow.children].slice(-10).map(describe),
      running: port.querySelector('[data-chat-running]') !== null,
      streaming: port.querySelectorAll('[data-streaming]').length,
      thinkRunning: port.querySelectorAll('[data-variant="think"][data-state="running"]').length,
      styled, transformed, below,
    }
  }

  // Is the page alive? Count frames, DOM mutations and scroll changes for 1.5s.
  const activity = async () => {
    const port = document.querySelector('[data-conversation-scroll]')
    let frames = 0, mutations = 0, alive = true
    const tick = () => { frames += 1; if (alive) requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
    const mo = port === null ? null : new MutationObserver(list => { mutations += list.length })
    mo?.observe(port, { childList: true, subtree: true, characterData: true, attributes: true })
    const st0 = port?.scrollTop ?? 0, len0 = port?.textContent.length ?? 0
    const t0 = performance.now()
    await sleep(1500)
    alive = false; mo?.disconnect()
    return {
      ms: round(performance.now() - t0), frames, mutations,
      scrollDelta: round((port?.scrollTop ?? 0) - st0), textDelta: (port?.textContent.length ?? 0) - len0,
      visibility: document.visibilityState, hasFocus: document.hasFocus(),
    }
  }

  // Which think-box bundle is this page running?
  const bundle = async () => {
    const urls = [...new Set([
      ...performance.getEntriesByType('resource').map(e => e.name),
      ...[...document.scripts].map(s => s.src),
    ])].filter(u => /think-box/i.test(u))
    const out = { urls: urls.slice(0, 6), bootConfig: typeof globalThis.__DSH_SMOOTH_STREAM_CONFIG__ !== 'undefined' }
    const js = urls.find(u => /client.*\.js|\.js(\?|$)/.test(u)) ?? urls[0]
    if (js !== undefined) {
      try {
        const text = await (await fetch(js, { cache: 'no-store' })).text()
        out.checked = js
        out.hasGuard = text.includes('task evicted')
        out.hasOnEvict = text.includes('onEvict')
      } catch (error) { out.fetchError = String(error).slice(0, 120) }
    }
    return out
  }

  const result = { at: new Date().toISOString(), ua: navigator.userAgent.slice(-60), viewport: [innerWidth, innerHeight] }
  try {
    result.bundle = await bundle()
    result.before = snapshot()
    result.activity = await activity()
    const toggles = [...document.querySelectorAll('[data-chat-flow-kind="turn-process"] [role="button"], [data-chat-flow-kind="turn-process"] button')]
    const toggle = toggles.at(-1)
    result.toggle = toggle === undefined ? null : { count: toggles.length, text: toggle.textContent.trim().slice(0, 30), expandedBefore: toggle.getAttribute('aria-expanded') }
    if (toggle !== undefined) {
      toggle.click()
      await sleep(1500)
      result.afterToggle = snapshot()
      result.activityAfterToggle = await activity()
      toggle.click()
      await sleep(800)
      result.afterRestore = { seat: snapshot().seat, port: snapshot().port }
    }
  } catch (error) {
    result.scriptError = String(error && error.stack || error).slice(0, 500)
  }
  globalThis.__tbCapture = JSON.stringify(result)
  console.log('[tb-capture]', result)
  if (copyFn !== null) { copyFn(globalThis.__tbCapture); console.log('[tb-capture] 已复制到剪贴板，直接粘贴即可。') }
  else console.log('[tb-capture] 自动复制失败，请执行：copy(__tbCapture)')
  return '[tb-capture] done'
})()
