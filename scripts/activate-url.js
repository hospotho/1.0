;(async function () {
  'use strict'

  const image = document.querySelector(`body img[src='${location.href}']`)
  if (image) {
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

  const observer = new MutationObserver(mutations => {
    outer: for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1 && node.outerHTML.match('iframe')) {
          console.log('New iframe')
          chrome.runtime.sendMessage('load_worker')
          break outer
        }
      }
    }
  })

  observer.observe(document, {childList: true, subtree: true})
})()
