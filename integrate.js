/*
* Copyright 2015 SkyghiS <skyghis@gmail.com>
* Copyright 2018 Jiří Janoušek <janousek.jiri@gmail.com>
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions are met:
*
* 1. Redistributions of source code must retain the above copyright notice, this
*    list of conditions and the following disclaimer.
* 2. Redistributions in binary form must reproduce the above copyright notice,
*    this list of conditions and the following disclaimer in the documentation
*    and/or other materials provided with the distribution.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
* ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
* WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
* DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
* ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
* (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
* LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
* ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
* (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
* SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

(function (Nuvola) {
  'use strict'

  const _ = Nuvola.Translate.gettext
  const ngettext = Nuvola.Translate.ngettext

  const ACTION_RATING = 'rating'
  const ADDRESS = 'app.address'
  const ADDRESS_DEFAULT = 'http://localhost:32400/web'

  // Create media player component
  const player = Nuvola.$object(Nuvola.MediaPlayer)

  // Handy aliases
  const PlaybackState = Nuvola.PlaybackState
  const PlayerAction = Nuvola.PlayerAction

  const WebApp = Nuvola.$WebApp()

  WebApp._onInitAppRunner = function (emitter) {
    Nuvola.WebApp._onInitAppRunner.call(this, emitter)
    Nuvola.config.setDefault(ADDRESS, ADDRESS_DEFAULT)
    Nuvola.core.connect('InitializationForm', this)
    Nuvola.core.connect('PreferencesForm', this)

    const ratingOptions = []
    for (let stars = 0; stars < 6; stars++) {
      ratingOptions.push([
        stars, // stateId
        /// Star rating, {1} is a placeholder for a number
        Nuvola.format(ngettext('Rating: {1} star', 'Rating: {1} stars', stars), stars), // label
        null, // mnemo_label
        null, // icon
        null // keybinding
      ])
    }
    Nuvola.actions.addRadioAction('playback', 'win', ACTION_RATING, 0, ratingOptions)
  }

  WebApp._onPreferencesForm = function (emitter, values, entries) {
    this.appendPreferences(values, entries)
  }

  WebApp._onInitializationForm = function (emitter, values, entries) {
    if (!Nuvola.config.hasKey(ADDRESS)) {
      this.appendPreferences(values, entries)
    }
  }

  WebApp._onHomePageRequest = function (emitter, result) {
    result.url = Nuvola.config.get(ADDRESS) || ADDRESS_DEFAULT
  }

  WebApp.appendPreferences = function (values, entries) {
    values[ADDRESS] = Nuvola.config.get(ADDRESS)
    entries.push(['header', 'Plex'])
    entries.push(['label', _('Address of your Plex Server')])
    entries.push(['string', ADDRESS, _('Address')])
  }

  WebApp._onInitWebWorker = function (emitter) {
    Nuvola.WebApp._onInitWebWorker.call(this, emitter)

    const state = document.readyState
    if (state === 'interactive' || state === 'complete') {
      this._onPageReady()
    } else {
      document.addEventListener('DOMContentLoaded', this._onPageReady.bind(this))
    }
    player.connect('RatingSet', this)
  }

  WebApp._onPageReady = function () {
    this.albumArt = { url: null, data: null }
    Nuvola.actions.connect('ActionActivated', this)

    const actions = []
    for (let i = 0; i <= 5; i++) {
      actions.push(ACTION_RATING + '::' + i)
    }
    player.addExtraActions(actions)

    this.update()
  }

  WebApp._downloadAlbumArt = function (url) {
    this.albumArt.url = url
    this.albumArt.data = null
    Nuvola.exportImageAsBase64(url, (data) => {
      if (this.albumArt.url === url) {
        this.albumArt.data = data
      }
    })
  }

  WebApp._getPlayerElements = function () {
    const elements = { player: document.querySelector('div[data-qa-id="playerControlsContainer"]') }
    const getButton = (name) => {
      const elm = elements.player && elements.player.querySelector('button[data-qa-id="' + name + 'Button"]')
      return elm && !elm.disabled ? elm : null
    }
    elements.play = getButton('resume')
    elements.pause = getButton('pause')
    elements.previous = getButton('previous')
    elements.next = getButton('next')
    elements.shuffle = getButton('shuffle')
    elements.repeat = getButton('repeat') || getButton('repeatOne')
    if (elements.player) {
      elements.mediaDuration = elements.player.querySelector('button[data-qa-id="mediaDuration"]')
      elements.trackSeekBar = document.querySelector('div[class*="SeekBar-seekBarTrack"]')
      elements.volumeSliderButton = elements.player.querySelector('button[role="slider"][aria-valuemax="100"]')
      elements.ratingButton = elements.player.querySelector('button[role="slider"][aria-valuemax="5"]')
      elements.volumeSlider = elements.player.querySelector('div[class*="VolumeSlider-track"]')
      elements.ratingSlider = elements.player.querySelector('div[class*="StarRating-track"]')

      if (elements.ratingSlider) {
        // Cache the current rating when mouse enters the rating slider because its value then follows mouse cursor.
        const watch = elements.ratingSlider.parentNode
        if (!watch.getAttribute('nuvola-watch')) {
          watch.setAttribute('nuvola-watch', 'yes')
          watch.addEventListener('mouseenter', this._updateCachedStars.bind(this)) // Save rating when mouse enters
          watch.addEventListener('mousedown', this._updateCachedStars.bind(this)) // Update rating when user changes it
          watch.addEventListener('mouseleave', function () { watch.removeAttribute('nuvola-stars') })
        }
      }
    }
    return elements
  }

  WebApp._getStars = function (elms, ignoreCached) {
    if (!ignoreCached && elms.ratingSlider && elms.ratingSlider.parentNode.hasAttribute('nuvola-stars')) {
      return elms.ratingSlider.parentNode.getAttribute('nuvola-stars')
    }
    return elms.ratingButton ? elms.ratingButton.getAttribute('aria-valuenow') : 0
  }

  WebApp._updateCachedStars = function () {
    const elements = this._getPlayerElements()
    if (elements.ratingSlider) {
      elements.ratingSlider.parentNode.setAttribute('nuvola-stars', this._getStars(elements, true))
    }
  }

  WebApp._parseMediaDuration = function (elms) {
    let time = [null, null]
    if (elms.mediaDuration) {
      const parts = elms.mediaDuration.textContent.split('/')
      time = [Nuvola.parseTimeUsec(parts[0]), Nuvola.parseTimeUsec(parts[1])]
      if (time[0] < 0) {
        time[0] += time[1]
      }
    }
    return time
  }

  WebApp.update = function () {
    const track = {
      artLocation: null
    }
    const metadataLinks = document.querySelectorAll('div[data-qa-id="playerControlsContainer"] a[data-qa-id="metadataTitleLink"]')
    track.title = metadataLinks[0] ? metadataLinks[0].textContent : null
    track.artist = metadataLinks[1] ? metadataLinks[1].textContent : null
    track.album = metadataLinks[2] ? metadataLinks[2].textContent : null
    const artContainers = document.querySelectorAll('div[data-qa-id="metadataPosterCard--music"] div')
    for (const elm of artContainers) {
      if (elm.style.backgroundImage) {
        const artLocation = elm.style.backgroundImage.substr(5, elm.style.backgroundImage.length - 5 - 2)
        if (artLocation.startsWith('blob:')) {
          if (this.albumArt.url === artLocation) {
            track.artLocation = this.albumArt.data
          } else {
            this._downloadAlbumArt(artLocation)
          }
        } else {
          track.artLocation = artLocation
        }
        break
      }
    }

    const playerElements = this._getPlayerElements()
    let state = PlaybackState.UNKNOWN
    if (playerElements.play) {
      state = PlaybackState.PAUSED
    } else if (playerElements.pause) {
      state = PlaybackState.PLAYING
    }

    const time = this._parseMediaDuration(playerElements)
    track.length = time[1]

    const stars = this._getStars(playerElements)
    Nuvola.actions.updateState(ACTION_RATING, 1 * stars)
    track.rating = stars / 5

    player.setTrack(track)
    player.setTrackPosition(time[0])
    player.setPlaybackState(state)
    const volume = playerElements.volumeSliderButton
    player.updateVolume(volume ? volume.getAttribute('aria-valuenow') / 100 : null)

    player.setCanPlay(!!playerElements.play)
    player.setCanPause(!!playerElements.pause)
    player.setCanGoPrev(playerElements.previous)
    player.setCanGoNext(playerElements.next)
    player.setCanSeek(!!playerElements.trackSeekBar)
    player.setCanChangeVolume(!!playerElements.volumeSlider)
    player.setCanRate(!!playerElements.ratingSlider)
    Nuvola.actions.updateEnabledFlag(ACTION_RATING, !!playerElements.ratingSlider)

    const shuffle = this._classListIncludes(playerElements.shuffle, 'isActive')
    player.setCanShuffle(shuffle !== null)
    player.setShuffleState(shuffle)

    const repeat = this._getRepeat()
    player.setCanRepeat(repeat !== null)
    player.setRepeatState(repeat)

    setTimeout(this.update.bind(this), 500)
  }

  WebApp._classListIncludes = function (elm, substring) {
    if (!elm) {
      return null
    }
    for (const name of elm.classList) {
      if (name.includes(substring)) {
        return true
      }
    }
    return false
  }

  WebApp._getRepeat = function () {
    const elm = this._getPlayerElements().repeat
    const active = this._classListIncludes(elm, 'isActive')
    if (active === null) {
      return null
    }
    if (!active) {
      return Nuvola.PlayerRepeat.NONE
    }
    return elm.getAttribute('data-qa-id') === 'repeatButton' ? Nuvola.PlayerRepeat.PLAYLIST : Nuvola.PlayerRepeat.TRACK
  }

  WebApp._setRepeat = function (repeat) {
    while (this._getRepeat() !== repeat) {
      Nuvola.clickOnElement(this._getPlayerElements().repeat)
    }
  }

  WebApp._onActionActivated = function (emitter, name, param) {
    const playerElements = this._getPlayerElements()
    switch (name) {
      case PlayerAction.TOGGLE_PLAY:
        if (playerElements.play) {
          Nuvola.clickOnElement(playerElements.play)
        } else if (playerElements.pause) {
          Nuvola.clickOnElement(playerElements.pause)
        }
        break
      case PlayerAction.PLAY:
        Nuvola.clickOnElement(playerElements.play)
        break
      case PlayerAction.PAUSE:
        Nuvola.clickOnElement(playerElements.pause)
        break
      case PlayerAction.STOP:
        Nuvola.clickOnElement(playerElements.pause)
        break
      case PlayerAction.PREV_SONG:
        Nuvola.clickOnElement(playerElements.previous)
        break
      case PlayerAction.NEXT_SONG:
        Nuvola.clickOnElement(playerElements.next)
        break
      case PlayerAction.SEEK: {
        const timeTotal = this._parseMediaDuration(playerElements)[1]
        if (timeTotal && param >= 0 && param <= timeTotal) {
          Nuvola.clickOnElement(playerElements.trackSeekBar, param / timeTotal, 0.5)
        }
        break
      }
      case PlayerAction.CHANGE_VOLUME:
        Nuvola.clickOnElement(playerElements.volumeSlider, param, 0.5)
        break
      case PlayerAction.SHUFFLE:
        Nuvola.clickOnElement(playerElements.shuffle)
        break
      case PlayerAction.REPEAT:
        this._setRepeat(param)
        break
      case ACTION_RATING:
        try {
          this._onRatingSet(emitter, param / 5)
          this._updateCachedStars()
        } catch (e) {}
        break
    }
  }

  WebApp._onRatingSet = function (emitter, rating) {
    const playerElements = this._getPlayerElements()
    let pos = 0
    if (rating < 0.22) {
      pos = 0.1
    } else if (rating < 0.42) {
      pos = 0.3
    } else if (rating < 0.62) {
      pos = 0.5
    } else if (rating < 0.82) {
      pos = 0.7
    } else {
      pos = 0.9
    }
    console.log(pos)
    Nuvola.clickOnElement(playerElements.ratingSlider, pos, 0.5)
  }

  WebApp.start()
})(this) // function(Nuvola)
