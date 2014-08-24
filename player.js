#!/usr/bin/gjs

// Copyright (c) 2014 Wojciech Dzierżanowski.
// Use of this software is governed by the MIT license.  See the LICENSE file
// for details.

const Lang = imports.lang;
const Gst = imports.gi.Gst;

let State = {
    STOPPED: 1,
    PLAYING: 2,
};

const Player = new Lang.Class({
    Name: "player",

    _init: function() {
        this.parent();

        this._createPlaybin();
    },

    finalize: function() {
        this._playbin.get_bus().remove_signal_watch();
        this._playbin.set_state(Gst.State.NULL);
    },

    get uri() {
        return this._uri;
    },

    set uri(v) {
        this._uri = v;
    },

    set stateChangeCallback(c) {
        this._stateChangeCallback = c;
    },

    toggle: function() {
        let [rv, state, pstate] = this._playbin.get_state(Gst.Clock.TIME_NONE);
        print("playbin state = " + Gst.Element.state_get_name(state));
        if (state != Gst.State.PLAYING) {
            if (this._uri) {
                print("Playing " + this._uri);
                this._playbin.set_property("uri", this._uri);
            } else if (state == Gst.State.NULL) {
                // No URI and we've never played the player => bail out.
                return false;
            }
            this._playbin.set_state(Gst.State.PLAYING);
            this._stateChangeCallback(State.PLAYING);
            return true;
        }

        this._playbin.set_state(Gst.State.NULL);
        this._stateChangeCallback(State.STOPPED);
        return false;
    },

    _createPlaybin: function() {
        this._playbin = Gst.ElementFactory.make("playbin", null);

        let bus = this._playbin.get_bus();
        bus.add_signal_watch();
        bus.connect("message::eos",
                    Lang.bind(this, function() {
                        print("EOS");
                        this._playbin.set_state(Gst.State.NULL);
                        this._stateChangeCallback(State.STOPPED);
                    }));
    },
});

