;(async function () {
  'use strict'

  const image = document.querySelector(`body img[src='${location.href}']`)
  if (image) {
    const argsRegex = /(.+\.(?:png|jpeg|jpg|gif|bmp|tiff|webp)).+/i
    const argsMatch = image.src.match(argsRegex)
    if (argsMatch) {
      const simpleFetchSize = async src => {
        const res = await fetch(src, {method: 'HEAD'})
        const size = res.headers.get('Content-Length')
        return parseInt(size) || 0
      }
      const rawURL = argsMatch[1]
      const currSize = await simpleFetchSize(image.src)
      const rawSize = await simpleFetchSize(rawURL)
      if (rawSize > currSize) {
        location.href = rawURL
      }
    }

    const options = await chrome.runtime.sendMessage('get_options')
    options.closeButton = false
    options.minWidth = 0
    options.minHeight = 0

    await chrome.runtime.sendMessage('load_script')
    image.style.display = 'none'
    imageViewer([image.src], options)
    return
  }

  const init = () => {
    console.log('Init content script.')
    chrome.runtime.sendMessage('load_worker')

    const observer = new MutationObserver(() => {
      const iframeList = document.querySelectorAll('iframe:not(.loadedWorker)')
      if (iframeList.length) {
        console.log('New iframe')
        chrome.runtime.sendMessage('load_worker')
        for (const iframe of iframeList) {
          iframe.classList.add('loadedWorker')
        }
      }
    })

    observer.observe(document, {childList: true, subtree: true})
    // for some rare case
    setTimeout(() => chrome.runtime.sendMessage('load_worker'), 3000)
  }

  if (document.visibilityState === 'visible') {
    document.readyState === 'complete' ? init() : window.addEventListener('load', init)
  } else {
    console.log('Waiting user to view the page.')
    const handleEvent = () => {
      document.removeEventListener('visibilitychange', handleEvent)
      window.removeEventListener('focus', handleEvent)
      document.readyState === 'complete' ? init() : window.addEventListener('load', init)
    }
    document.addEventListener('visibilitychange', handleEvent)
    window.addEventListener('focus', handleEvent)
  }
})()
