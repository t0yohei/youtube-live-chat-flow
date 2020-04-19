import { defaultState } from './store'
import storage from './utils/storage'
import logger from './utils/logger'

logger.log('content script loaded')

let observer
let state
let data = []

const loadState = async () => {
  const items = await storage.get('vuex')
  try {
    state = {
      ...defaultState,
      ...JSON.parse(items['vuex'])
    }
  } catch (e) {
    state = defaultState
  }
}

const flow = (node) => {
  if (!state.enabled) {
    return
  }

  const message = node.querySelector('[jsslot] span div:nth-child(3)')
  const sender = node.querySelector('[jsslot] span div:nth-child(2)')
  if (!message || !sender) {
    return
  }

  const messageText = message.innerText
  const senderText = sender.innerText

  const doc = (parent || window).document

  const container = doc.querySelector('[data-layout]')
  const video = doc.querySelector('[data-layout]')
  const rows = state.rows
  const height = video.offsetHeight / rows
  const fontSize = height * 0.8

  const senderSpan = doc.createElement('div')
  const div = doc.createElement('div')

  div.innerHTML = messageText
  div.setAttribute('style', `
    position: absolute;
    padding-top: ${fontSize / 2}px;
    left: 5px;
    white-space: nowrap;
    display: inline-block;
    font-size: ${fontSize}px;
    font-weight: bold;
    color: ${state.color};
    text-shadow: ${state.textShadow};
  `)

  senderSpan.innerHTML = senderText
  senderSpan.setAttribute('style', `
    font-size: ${fontSize / 2}px;
    position: absolute;
    color: silver;
    top: 0;
  `)

  container.appendChild(div)
  div.appendChild(senderSpan)

  const width = container.offsetWidth
  const commentWidth = div.offsetWidth
  const millis = state.speed * 1000

  const now = Date.now()

  const comment = {
    width: commentWidth,
    time: now
  }
  const vc = (width + commentWidth) / millis

  let index = data.findIndex((comments) => {
    const comment = comments[comments.length - 1]
    if (!comment) {
      return true
    }
    const vt = (width + comment.width) / millis

    const t1 = now - comment.time
    const d1 = vt * t1
    if (d1 < comment.width) {
      return false
    }

    const t2 = t1 + width / vc
    const d2 = vt * t2
    if (d2 < width + comment.width) {
      return false
    }

    return true
  })

  if (index === -1) {
    data.push([comment])
    index = data.length - 1
  } else {
    data[index].push(comment)
  }

  const top = (height * (index % rows))
  const depth = Math.floor(index / rows)
  const opacity = 1 - 0.2 * depth

  div.setAttribute('style', div.getAttribute('style') + `
    top: ${top}px;
    opacity: ${opacity};
  `)

  const keyframes = [
    { transform: `translate(${width}px, 0px)` },
    { transform: `translate(-${commentWidth}px, 0px)` }
  ]
  const animation = div.animate(keyframes, millis)
  animation.onfinish = () => {
    div.parentNode.removeChild(div)
    data[index].shift()
  }
}

const initialize = async () => {
  logger.log('initialize')

  const controll = document.querySelector('[jscontroller=aSjf3c]')
  const div = document.createElement('div')

  div.innerHTML = '<input type="text" name="message" size="40" maxlength="100" placeholder="参加者全員にメッセージを送信"> <button>送信</button>'
  if (controll != null) {
    controll.insertBefore(div, controll.lastElementChild)
  }

  const items = document.querySelector('[jscontroller=ENYfP]')

  if (items === null) {
    return
  }

  if (observer) {
    observer.disconnect()
  }

  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      const nodes = Array.from(mutation.addedNodes)
      if (nodes.length > 50) {
        return
      }
      nodes.forEach((node) => {
        flow(node)
        node.style.display = 'none'
      })
    })
  })
  observer.observe(items, { childList: true })
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  logger.log('onMessage: %o', message)
  const { id, data } = message
  switch (id) {
    case 'urlChanged':
      initialize(data.url)
      break
    case 'stateChanged':
      await loadState()
      break
  }
})

const initialObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    const removedNodes = Array.from(mutation.removedNodes)
    const nextSibling = mutation.nextSibling
    if (removedNodes !== null && nextSibling !== null) {
      (async () => {
        await loadState()
        initialize(location.href)
      })()
    }
  })
})

const config = { attributes: true, childList: true, characterData: true }
initialObserver.observe(document.body, config)
