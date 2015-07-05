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

var ADDRESS = "app.address";
var ADDRESS_DEFAULT = "http://localhost:32400/web";

// Create media player component
var player = Nuvola.$object(Nuvola.MediaPlayer);

// Handy aliases
var PlaybackState = Nuvola.PlaybackState;
var PlayerAction = Nuvola.PlayerAction;

// Create new WebApp prototype
var WebApp = Nuvola.$WebApp();

WebApp._onInitAppRunner = function(emitter)
{
    Nuvola.WebApp._onInitAppRunner.call(this, emitter);
    Nuvola.config.setDefault(ADDRESS, ADDRESS_DEFAULT);
    Nuvola.core.connect("InitializationForm", this);
    Nuvola.core.connect("PreferencesForm", this);
};

WebApp._onPreferencesForm = function(emitter, values, entries)
{
    this.appendPreferences(values, entries);
};

WebApp._onInitializationForm = function(emitter, values, entries)
{
    if (!Nuvola.config.hasKey(ADDRESS))
        this.appendPreferences(values, entries);
};

WebApp._onHomePageRequest = function(emitter, result)
{
    result.url = Nuvola.config.get(ADDRESS);
};

WebApp.appendPreferences = function(values, entries)
{
    values[ADDRESS] = Nuvola.config.get(ADDRESS);
    entries.push(["header", "Plex"]);
    entries.push(["label", "Address of your Plex Server"]);
    entries.push(["string", ADDRESS, "Address"]);
};

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

WebApp._isAvailable = function (el)
{
    return el && el.className && !/(:?\s|^)(:?disabled|hidden)(:?\s|$)/.test(el.className);
};

WebApp._getAttribute = function (el, attribute)
{
    if (el && el.attributes && el.attributes[attribute])
        return  el.attributes[attribute].value;
    return null;
};

// Extract data from the web page
WebApp.update = function()
{
    var playerElement = document.querySelector(".player.music");
    var playElement, pauseElement, previousElement, nextElement;
    if (playerElement)
    {
        playElement = playerElement.querySelector(".play-btn");
        pauseElement = playerElement.querySelector(".pause-btn");
        previousElement = playerElement.querySelector(".previous-btn");
        nextElement = playerElement.querySelector(".next-btn");
    }
    // Playback state
    var state = PlaybackState.UNKNOWN;
    if (playerElement)
    {
        if (playElement && !this._isAvailable(playElement))
            state = PlaybackState.PLAYING;
        else if (pauseElement && !this._isAvailable(pauseElement))
            state = PlaybackState.PAUSED;
    }
    player.setPlaybackState(state);
    // Track informations
    var posterElement = playerElement ? playerElement.querySelector('.media-poster') : null;
    player.setTrack({
        title:       this._getAttribute(posterElement, 'data-title'),
        artist:      this._getAttribute(posterElement, 'data-grandparent-title'),
        album:       this._getAttribute(posterElement, 'data-parent-title'),
        artLocation: this._getAttribute(posterElement, 'data-image-url')
    });
    // Player actions
    player.setCanPlay(this._isAvailable(playElement));
    player.setCanPause(this._isAvailable(pauseElement));
    player.setCanGoPrev(this._isAvailable(previousElement));
    player.setCanGoNext(this._isAvailable(nextElement));
    // Schedule the next update
    setTimeout(this.update.bind(this), 500);
};

// Handler of playback actions
WebApp._onActionActivated = function(emitter, name, param)
{
    var playerElement = document.querySelector(".player.music");
    var playElement, pauseElement, previousElement, nextElement;
    if (playerElement)
    {
        playElement = playerElement.querySelector(".play-btn");
        pauseElement = playerElement.querySelector(".pause-btn");
        previousElement = playerElement.querySelector(".previous-btn");
        nextElement = playerElement.querySelector(".next-btn");
    }

    switch (name)
    {
        case PlayerAction.TOGGLE_PLAY:
            if (playerElement)
                if (this._isAvailable(playElement))
                    Nuvola.clickOnElement(playElement);
                else
                    Nuvola.clickOnElement(pauseElement);
            break;
        case PlayerAction.PLAY:
            Nuvola.clickOnElement(playElement);
            break;
        case PlayerAction.PAUSE:
            Nuvola.clickOnElement(pauseElement);
            break;
        case PlayerAction.STOP:
            Nuvola.clickOnElement(playerElement.querySelector(".stop-btn"));
            break;
        case PlayerAction.PREV_SONG:
            Nuvola.clickOnElement(previousElement);
            break;
        case PlayerAction.NEXT_SONG:
            Nuvola.clickOnElement(nextElement);
            break;
    }
};

WebApp.start();

})(this);  // function(Nuvola)
