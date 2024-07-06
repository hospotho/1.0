;(function () {
  'use strict'

  const safeSendMessage = function (...args) {
    if (chrome.runtime?.id) {
      return chrome.runtime.sendMessage(...args)
    }
  }

  // image url mode
  function getRawUrl(src) {
    const argsRegex = /(.*?[=.](?:jpeg|jpg|png|gif|webp|bmp|tiff|avif))(?!\/)/i
    if (src.startsWith('data')) return src

    const filenameMatch = src.replace(/[-_]\d{3,4}x(?:\d{3,4})?\./, '.')
    if (filenameMatch !== src) return filenameMatch

    try {
      // protocol-relative URL
      const url = new URL(src, document.baseURI)
      const baseURI = url.origin + url.pathname

      const searchList = url.search
        .slice(1)
        .split('&')
        .filter(t => t.match(argsRegex))
        .join('&')
      const imgSearch = searchList ? '?' + searchList : ''
      const rawSearch = baseURI + imgSearch

      const argsMatch = rawSearch.match(argsRegex)
      if (argsMatch) {
        const rawUrl = argsMatch[1]
        if (rawUrl !== src) return rawUrl
      }
    } catch (error) {}

    const argsMatch = src.match(argsRegex)
    if (argsMatch) {
      const rawUrl = argsMatch[1]
      if (rawUrl !== src) return rawUrl
    }
    return src
  }
  function getRawSize(rawUrl) {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => resolve([img.naturalWidth, img.naturalHeight])
      img.onerror = () => resolve([0, 0])
      img.src = rawUrl
    })
  }

  async function initImageViewer(image) {
    console.log('Start image mode')

    const options = window.ImageViewerOption
    options.closeButton = false
    options.minWidth = 0
    options.minHeight = 0

    await safeSendMessage('load_script')
    ImageViewer([image.src], options)

    const rawUrl = getRawUrl(image.src)
    const rawSize = rawUrl === image.src ? [0, 0] : await getRawSize(rawUrl)
    const rawRatio = rawSize[0] ? rawSize[0] / rawSize[1] : 0
    const currRatio = image.naturalWidth / image.naturalHeight
    // non trivial size or with proper ratio
    const nonTrivialSize = rawSize[0] % 10 || rawSize[1] % 10
    const properRatio = currRatio === 1 || Math.abs(rawRatio - currRatio) < 0.01 || rawRatio > 3 || rawRatio < 1 / 3
    const isRawCandidate = nonTrivialSize || properRatio
    if (rawSize[0] >= image.naturalWidth && isRawCandidate) {
      ImageViewer([rawUrl], options)
    }
  }

  async function init() {
    await safeSendMessage('get_options')
    // Chrome terminated service worker
    while (!window.ImageViewerOption) {
      await new Promise(resolve => setTimeout(resolve, 50))
      await safeSendMessage('get_options')
    }

    if (window.top !== window.self) {
      safeSendMessage('load_worker')
      safeSendMessage('load_extractor')
      return
    }
    try {
      const image = document.querySelector(`img[src='${location.href}']`)
      image ? initImageViewer(image) : safeSendMessage('load_worker')
    } catch (error) {}
  }

  if (document.visibilityState === 'visible') {
    init()
  } else {
    const handleEvent = () => {
      document.removeEventListener('visibilitychange', handleEvent)
      window.removeEventListener('focus', handleEvent)
      init()
    }
    document.addEventListener('visibilitychange', handleEvent)
    window.addEventListener('focus', handleEvent)
  }
})()
