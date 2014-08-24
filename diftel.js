#!/usr/bin/gjs

// Copyright (c) 2014 Wojciech Dzierżanowski.
// Use of this software is governed by the MIT license.  See the LICENSE file
// for details.

const Lang = imports.lang;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Gst = imports.gi.Gst;

imports.searchPath.unshift('.');
const P = imports.player;
const R = imports.randomizer;

const Application = new Lang.Class({
    Name: "diftel",
    Extends: Gtk.Application,

    _init: function() {
        this.parent();

        this._playedX = false;
    },

    _buildUI: function() {
        let labelA = new Gtk.Label({ label: "Sample A " });
        let labelB = new Gtk.Label({ label: "Sample B " });
        let labelX = new Gtk.Label({ label: "Sample X " });

        this._fileChooserA = new Gtk.FileChooserButton(
                { title: "Choose sample A",
                  action: Gtk.FileChooserAction.OPEN });
        this._fileChooserA.set_width_chars(25);
        this._fileChooserA.set_hexpand(true);

        this._fileChooserB = new Gtk.FileChooserButton(
                { title: "Choose sample B",
                  action: Gtk.FileChooserAction.OPEN });
        this._fileChooserB.set_width_chars(25);
        this._fileChooserB.set_hexpand(true);

        let fileX = new Gtk.Frame;
        fileX.add(new Gtk.Label({ label: "A or B?" }));

        this._playerButtonA = Gtk.Button.new_from_icon_name(
                "media-playback-start", Gtk.IconSize.BUTTON);
        this._playerButtonB = Gtk.Button.new_from_icon_name(
                "media-playback-start", Gtk.IconSize.BUTTON);
        this._playerButtonX = Gtk.Button.new_from_icon_name(
                "media-playback-start", Gtk.IconSize.BUTTON);

        let samplesGrid = new Gtk.Grid({ row_spacing: 6, column_spacing: 6 });
        samplesGrid.attach(labelA, 0, 0, 1, 1);
        samplesGrid.attach(this._fileChooserA, 1, 0, 1, 1);
        samplesGrid.attach(this._playerButtonA, 2, 0, 1, 1);
        samplesGrid.attach(labelB, 0, 1, 1, 1);
        samplesGrid.attach(this._fileChooserB, 1, 1, 1, 1);
        samplesGrid.attach(this._playerButtonB, 2, 1, 1, 1);
        samplesGrid.attach(labelX, 0, 2, 1, 1);
        samplesGrid.attach(fileX, 1, 2, 1, 1);
        samplesGrid.attach(this._playerButtonX, 2, 2, 1, 1);

        this._xIsA = Gtk.Button.new_with_label("X is A");
        this._xIsB = Gtk.Button.new_with_label("X is B");
        let choiceButtons =
                new Gtk.Box({ spacing: 6,
                              orientation: Gtk.Orientation.VERTICAL });
        choiceButtons.pack_start(this._xIsA, true, true, 0);
        choiceButtons.pack_start(this._xIsB, true, true, 0);

        this._statisticsLabel = new Gtk.Label({ xalign: 0 });
        this._probabilityLabel = new Gtk.Label({ xalign: 0 });
        let resultLabels =
                new Gtk.Box({ spacing: 6,
                              orientation: Gtk.Orientation.VERTICAL });
        resultLabels.pack_start(this._statisticsLabel, true, true, 0);
        resultLabels.pack_start(this._probabilityLabel, true, true, 0);

        this._formatResultLabels();

        let mainBox = new Gtk.Box({ spacing: 18,
                                    orientation: Gtk.Orientation.VERTICAL });
        mainBox.pack_start(
                this._buildLabeledGroup("Samples", samplesGrid),
                false,
                false,
                0);
        mainBox.pack_start(
                this._buildLabeledGroup("What is X", choiceButtons),
                false,
                false,
                0);
        mainBox.pack_start(
                this._buildLabeledGroup("Results", resultLabels),
                false,
                false,
                0);

        this._window = new Gtk.ApplicationWindow({ application: this,
                                                   title: "diftel" });
        let alignedMainBox = new Gtk.Alignment({ left_padding: 12,
                                                 right_padding: 12,
                                                 bottom_padding: 12 });
        alignedMainBox.add(mainBox);
        this._window.add(alignedMainBox);
    },

    _buildLabeledGroup: function(text, group) {
        let label = new Gtk.Label({ label: "<b>" + text + "</b>",
                                    use_markup: "true",
                                    xalign: 0 });

        let alignedGroup = new Gtk.Alignment({ left_padding: 12 });
        alignedGroup.add(group);

        let labeledGroup =
                new Gtk.Box({ spacing: 6,
                              orientation: Gtk.Orientation.VERTICAL });
        labeledGroup.pack_start(label, false, false, 0);
        labeledGroup.pack_start(alignedGroup, false, false, 0);

        return labeledGroup;
    },

    vfunc_startup: function() {
        this.parent();
        Gst.init(null, 0);

        this._buildUI();

        this._playerA = new P.Player;
        this._playerB = new P.Player;

        this._randomizer = new R.Randomizer(this._playerA, this._playerB);

        this._connectPlayer(
                this._playerA, this._fileChooserA, this._playerButtonA);
        this._connectPlayer(
                this._playerB, this._fileChooserB, this._playerButtonB);
        this._connectPlayer(
                this._randomizer.player, null, this._playerButtonX);

        this._updatePlayerButtons();

        this._connectChoiceButton(this._xIsA, this._playerA);
        this._connectChoiceButton(this._xIsB, this._playerB);
        this._updateChoiceButtons();
    },

    vfunc_activate: function() {
        this._window.show_all();
    },

    vfunc_shutdown: function() {
        this._playerA.finalize();
        this._playerB.finalize();
        this._randomizer.player.finalize();

        this.parent();
    },

    _connectPlayer: function(player, chooser, button) {
        if (chooser) {
            chooser.connect(
                    "file-set",
                    Lang.bind(this, function(c) {
                            player.uri = c.get_uri();
                            this._updatePlayerButtons();
                            this._updateChoiceButtons();
                            this._randomizer.reset();
                            this._randomizer.randomize();
                            this._formatResultLabels();
                    }));
        }

        button.connect(
                "clicked",
                Lang.bind(this, function(button) {
                        if (player.toggle()) {
                            if (button == this._playerButtonX)
                                this._playedX = true;
                            this._updateChoiceButtons();
                        }
                }));

        player.stateChangeCallback = Lang.bind(this, function(state) {
                this._onPlayerStateChanged(button, state);
        });
    },

    _connectChoiceButton: function(button, player) {
        button.connect(
                "clicked",
                Lang.bind(this, function(button) {
                        this._randomizer.choose(player.uri);

                        this._playedX = false;
                        this._randomizer.randomize();

                        this._updateChoiceButtons();
                        this._formatResultLabels();
               }));
    },

    _updatePlayerButtons: function() {
        this._playerButtonA.set_sensitive(this._playerA.uri);
        this._playerButtonB.set_sensitive(this._playerB.uri);
        this._playerButtonX.set_sensitive(
                this._playerA.uri && this._playerB.uri);
    },

    _updateChoiceButtons: function() {
        this._xIsA.set_sensitive(this._playedX);
        this._xIsB.set_sensitive(this._playedX);
    },

    _formatResultLabels: function() {
        let tries = 0;
        let successes = 0;
        if (this._randomizer && this._randomizer.tries > 0) {
            tries = this._randomizer.tries;
            successes = this._randomizer.successes;
        }
        let text = "Correct answers: " + successes + "/" + tries +
                   (tries > 0 ? " (" + Math.round(100.0 * successes/tries) +
                                "%)"
                              : "");
        this._statisticsLabel.label = text;

        let probability = this._randomizer ? this._randomizer.probability : 1;
        text = "Probability of getting this score or better by pure chance: " +
                Math.round(100.0 * probability) + "%";
        this._probabilityLabel.label = text;
    },

    _onPlayerStateChanged: function(button, state) {
        if (state == P.State.PLAYING) {
            button.get_image().set_from_icon_name("media-playback-stop",
                                                  Gtk.IconSize.BUTTON);
        } else {
            button.get_image().set_from_icon_name("media-playback-start",
                                                  Gtk.IconSize.BUTTON);
        }
    },
});

let app = new Application();
app.run(ARGV);

