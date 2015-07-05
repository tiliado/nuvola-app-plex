/*
* Copyright 2014 Your name <your e-mail>
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

(function(Nuvola)
{
"use strict";

  // Create media player component
  var player = Nuvola.$object(Nuvola.MediaPlayer);

  // Handy aliases
  var PlaybackState = Nuvola.PlaybackState;
  var PlayerAction = Nuvola.PlayerAction;

  // Create new WebApp prototype
  var WebApp = Nuvola.$WebApp();

  // Initialization routines
  WebApp._onInitWebWorker = function(emitter)
  {
    Nuvola.WebApp._onInitWebWorker.call(this, emitter);

    var state = document.readyState;
    if (state === "interactive" || state === "complete")
    this._onPageReady();
    else
    document.addEventListener("DOMContentLoaded", this._onPageReady.bind(this));
  };

  // Page is ready for magic
  WebApp._onPageReady = function()
  {
    // Connect handler for signal ActionActivated
    Nuvola.actions.connect("ActionActivated", this);

    // Start update routine
    this.update();
  };

  WebApp._isHiddenOrDisabled = function (el) {
    var regex = new RegExp("(\\s|^)(disabled|hidden)(\\s|$)");
    return el && el.className && regex.test(el.className);
  };

  // Extract data from the web page
  WebApp.update = function()
  {
    var playerElement = document.querySelector(".player.music");
    var playElement, pauseElement, previousElement, nextElement;
    if (playerElement) {
      playElement = playerElement.querySelector(".play-btn");
      pauseElement = playerElement.querySelector(".pause-btn");
      previousElement = playerElement.querySelector(".previous-btn");
      nextElement = playerElement.querySelector(".next-btn");
    }
    // Playback state
    var state = PlaybackState.UNKNOWN;
    if (playerElement) {
      if (this._isHiddenOrDisabled(playElement)) {
        state = PlaybackState.PLAYING;
      } else if (this._isHiddenOrDisabled(pauseElement)) {
        state = PlaybackState.PAUSED;
      }
    }
    player.setPlaybackState(state);

    // Track informations
    var track = {
      title: null,
      artist: null,
      album: null,
      artLocation: null
    };
    if (playerElement) {
      var posterElement = playerElement.querySelector(".media-poster");
      track.title = posterElement.attributes['data-title'].value;
      track.album = posterElement.attributes['data-parent-title'].value;
      track.artist = posterElement.attributes['data-grandparent-title'].value;
      track.artLocation = posterElement.attributes['data-image-url'].value;
    }
    player.setTrack(track);

    // Player actions
    player.setCanPlay(playerElement && !this._isHiddenOrDisabled(playElement));
    player.setCanPause(playerElement && !this._isHiddenOrDisabled(pauseElement));
    player.setCanGoPrev(playerElement && !this._isHiddenOrDisabled(previousElement));
    player.setCanGoNext(playerElement && !this._isHiddenOrDisabled(nextElement));

    // Schedule the next update
    setTimeout(this.update.bind(this), 500);
  };

  // Handler of playback actions
  WebApp._onActionActivated = function(emitter, name, param)
  {
  };

  WebApp.start();

})(this);  // function(Nuvola)
