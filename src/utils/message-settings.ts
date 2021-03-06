import Settings, { AuthorType } from '~/models/settings'
import Message from '~/models/message'

export default class MessageSettings {
  private message: Message
  private settings: Settings

  constructor(message: Message, settings: Settings) {
    this.message = message
    this.settings = settings
  }

  private get yourName() {
    // if input control exists
    const span = document.querySelector('#input-container span#author-name')
    if (span?.textContent) {
      return span.textContent
    }
    // if input control is moved
    const movedSpan = parent.document.querySelector(
      '#input-container span#author-name'
    )
    if (movedSpan?.textContent) {
      return movedSpan.textContent
    }
    // otherwise
    const button = parent.document.querySelector(
      '.html5-video-player .ytp-chrome-top-buttons .ytp-watch-later-button'
    ) as HTMLElement | null
    // TODO: japanese only
    return button?.getAttribute('title')?.replace(' として後で再生します', '')
  }

  private get authorType() {
    const author = this.message.author
    const you = author && author === this.yourName
    return you ? 'you' : this.message.authorType
  }

  private get paid() {
    return ['paid-message', 'paid-sticker', 'membership-item'].includes(
      this.message.messageType ?? ''
    )
  }

  private get style() {
    const authorType =
      this.authorType &&
      ['guest', 'member', 'moderator', 'owner', 'you'].includes(this.authorType)
        ? this.authorType
        : 'guest'
    return this.settings.styles[authorType as AuthorType]
  }

  get template() {
    switch (this.message.messageType) {
      case 'text-message':
        return this.style.template === 'two-line'
          ? 'two-line-message'
          : 'one-line-message'
      case 'paid-message':
        return this.settings.superChatHidden ? undefined : 'card-message'
      case 'paid-sticker':
        return this.settings.superStickerHidden ? undefined : 'sticker'
      case 'membership-item':
        return this.settings.membershipHidden ? undefined : 'card-message'
    }
  }

  get author() {
    switch (this.message.messageType) {
      case 'text-message':
        return this.style.template !== 'one-line-without-author'
      case 'paid-message':
        return true
      case 'paid-sticker':
        return true
      case 'membership-item':
        return true
    }
  }

  get avatar() {
    return this.paid ? true : this.style.avatar
  }

  get fontColor() {
    return this.paid ? '#ffffff' : this.style.color
  }

  get fontStyle() {
    return this.settings.extendedStyle
  }
}
