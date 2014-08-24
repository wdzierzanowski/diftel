#!/usr/bin/gjs

// Copyright (c) 2014 Wojciech Dzierżanowski.
// Use of this software is governed by the MIT license.  See the LICENSE file
// for details.

const Lang = imports.lang;

imports.searchPath.unshift('.');
const P = imports.player;

const Randomizer = new Lang.Class({
    Name: "randomizer",

    _init: function(player_a, player_b) {
        this.parent();

        this._playerA = player_a;
        this._playerB = player_b;
        this._playerX = new P.Player;

        this.reset();
   },

    randomize: function() {
        if (Math.random() < 0.5)
            this._playerX.uri = this._playerA.uri;
        else
            this._playerX.uri = this._playerB.uri;
    },

    choose: function(uri) {
        ++this._tries;
        if (uri == this._playerX.uri) {
            ++this._successes;
            return true;
        }
        return false;
    },

    reset: function() {
        this._tries = 0;
        this._successes = 0;
    },

    get player() {
        return this._playerX;
    },

    get tries() {
        return this._tries;
    },

    get successes() {
        return this._successes;
    },

    // Returns the probability of getting the current number of successes or
    // more in the current number of tries by pure chance.
    get probability() {
        if (this._tries == 0)
            return 1;

        // There are 2^n possible results in n tries.  We think of the
        // different ways to get k successes in n tries as ways to choose k
        // positions for successful answers from a set of n positions.  Thus,
        // the number of ways to get k successes in n tries is given by the
        // binomial coefficient C(n, k).
        let sum = 0;
        for (let i = this._successes; i <= this._tries; i++)
            sum += this._computeBinomialCoefficient(this._tries, i);
        return sum / Math.pow(2, this._tries);
    },

    _computeBinomialCoefficient: function(n, k) {
        if (k > n / 2)
            k = n - k;

        let c = 1;
        for (let i = 1; i <= k; i++)
            c *= (n + 1 - i) / i;

        return c;
    },
});

