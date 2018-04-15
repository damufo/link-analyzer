/* Copyright (c) 2017 sienori sienori.firefox+tsm@gmail.com */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
const S = new settingsObj()
//S.init();

S.initOptionsPage().then(function () {
    const saveByChangeItems = document.getElementsByClassName("saveByChange");
    for (let item of saveByChangeItems) {
        item.addEventListener("change", save)
    }
})

function save() {
    S.saveOptionsPage();
}
