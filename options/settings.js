/* Copyright (c) 2017 sienori sienori.firefox+tsm@gmail.com */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//Display option page at initial startup and initialize settings
/*
browser.runtime.onInstalled.addListener(function(){
    browser.runtime.openOptionsPage();
});
*/
function settingsObj() {};
(function () {

    //Rewrite option page, initialize setting
    settingsObj.prototype.initOptionsPage = function () {
        return new Promise(function (resolve, reject) {
            labelSet();
            getSettingsByHtml();
            overRideSettingsByStorage().then(function () {
                overRideHtml();
                saveSettings();
                resolve();
            });
        })
    };
    //Save settings from options page
    settingsObj.prototype.saveOptionsPage = function () {
        return new Promise(function (resolve, reject) {
            getSettingsByHtml();
            saveSettings().then(function () {
                resolve();
            });
        })
    };
    //Initialize setting
    settingsObj.prototype.init = function () {
        return new Promise(function (resolve, reject) {
            getSettings().then(function () {
                resolve(settings);
            })
        })
    }
    //return settings
    settingsObj.prototype.get = function () {
        return settings;
    };
    //Save the received object
    settingsObj.prototype.save = function (settings) {
        return new Promise(function (resolve, reject) {
            for (let i in settings) {
                settings[i] = settings[i];
            }
            saveSettings().then(function () {
                resolve();
            });
        })
    };
    //Delete settings
    settingsObj.prototype.clear = function (setting) {
        return new Promise(function (resolve, reject) {
            delete settings[setting];
            saveSettings().then(function () {
                resolve();
            })
        })
    }
    //Delete all settings
    settingsObj.prototype.clearAll = function () {
        return new Promise(function (resolve, reject) {
            settings = new settingsObj();
            saveSettings().then(function () {
                resolve();
            })
        })
    }
    settingsObj.prototype.labelSet = function () {
        labelSet();
    }

    //let Settings = new settingsObj();
    let settings = {};
    //S = new settingsObj(); // Call from outside
    //When "label" is included in span and option id, button class Retrieve the value from i18n and rewrite it
    function labelSet() {
        textLabelSet("p");
        textLabelSet("span");
        textLabelSet("option");
        textLabelSet("input");

        function textLabelSet(tagName) {
            const items = document.getElementsByTagName(tagName);
            for (let i of items) {
                let label;
                if (i.id != undefined && i.id.includes("Label")) {
                    label = browser.i18n.getMessage(i.id);
                } else if (i.className != undefined && i.className.includes("Label")) {
                    const labelList = i.className.split(' ').filter((element, index, array) => {
                        return element.includes("Label");
                    });
                    label = browser.i18n.getMessage(labelList[0]);
                } else {
                    continue;
                }

                if (!label == "") {
                    if (tagName == "input") {
                        switch (i.type) {
                            case "button":
                            case "submit":
                                i.value = label;
                                break;
                            case "text":
                                i.placeholder = label;
                                break;
                        }
                    } else {
                        i.innerHTML = label;
                    }
                }

            }
        }
    }

    //Retrieve the Settings item from storage and overwrite Settings that do not exist
    function overRideSettingsByStorage() {
        return new Promise(function (resolve, reject) {
            browser.storage.local.get("settings", function (value) {
                
                for (let i in settings) {
                    if (value.settings != undefined && value.settings[i] != undefined) {
                        settings[i] = value.settings[i];
                    }
                }
                /*
                for (let i in value.settings) {
                    if (settings[i] == undefined) settings[i] = value.settings[i];
                }
                */
                resolve();
            })
        })
    }

    //Reflect Settings on option page
    function overRideHtml() {
        let inputs = document.getElementsByTagName("input");
        for (let i in inputs) {
            if (inputs[i].id == undefined) continue;
            if (inputs[i].className != undefined && inputs[i].className.indexOf("noSetting") != -1) continue;

            switch (inputs[i].type) {
                case "text":
                case "number":
                case "search":
                case "tel":
                case "url":
                case "email":
                case "password":
                case "datetime":
                case "month":
                case "week":
                case "time":
                case "datetime-local":
                case "range":
                case "color":
                    inputs[i].value = settings[inputs[i].id];
                    break;
                case "checkbox":
                    inputs[i].checked = settings[inputs[i].id];
                    break;
                case "radio":
                    if (settings[inputs[i].name] == inputs[i].value) {
                        inputs[i].checked = true;
                    }
                    break;
            }
        }
        let textareas = document.getElementsByTagName("textarea");
        for (let i in textareas) {
            if (textareas[i].id == undefined) continue;
            if (textareas[i].className != undefined && textareas[i].className.indexOf("noSetting") != -1) continue;
            textareas[i].value = settings[textareas[i].id];
        }

        let selects = document.getElementsByTagName("select");
        for (let i in selects) {
            if (selects[i].id == undefined) continue;
            if (selects[i].className != undefined && inputs[i].className.indexOf("noSetting") != -1) continue;

            selects[i].value = settings[selects[i].id];
        }
    }

    //Get setting value from option page
    function getSettingsByHtml() {
        let inputs = document.getElementsByTagName("input");

        for (let i in inputs) {
            if (inputs[i].id == undefined) continue;
            if (inputs[i].className != undefined && inputs[i].className.indexOf("noSetting") != -1) continue;

            switch (inputs[i].type) {
                case "text":
                case "number":
                case "search":
                case "tel":
                case "url":
                case "email":
                case "password":
                case "datetime":
                case "month":
                case "week":
                case "time":
                case "datetime-local":
                case "range":
                case "color":
                    settings[inputs[i].id] = inputs[i].value;
                    break;
                case "checkbox":
                    settings[inputs[i].id] = inputs[i].checked;
                    break;
                case "radio":
                    if (inputs[i].checked == true) {
                        settings[inputs[i].name] = inputs[i].value;
                    }
                    break;
            }
        }

        let textareas = document.getElementsByTagName("textarea");
        for (let i in textareas) {
            if (textareas[i].id == undefined) continue;
            if (textareas[i].className != undefined && textareas[i].className.indexOf("noSetting") != -1) continue;
            settings[textareas[i].id] = textareas[i].value;
        }

        let selects = document.getElementsByTagName("select");
        for (let i in selects) {
            if (selects[i].id == undefined) continue;
            if (selects[i].className != undefined && selects[i].className.indexOf("noSetting") != -1) continue;

            settings[selects[i].id] = selects[i].value;
        }
    }

    browser.storage.onChanged.addListener(changedSettings);

    function changedSettings(changes, area) {
        if (Object.keys(changes).includes("settings")) {
            settings = changes.settings.newValue;
        }
    }

    function getSettings() {
        return new Promise(function (resolve, reject) {
            browser.storage.local.get("settings", function (value) {
                settings = value.settings;
                resolve(settings);
            });
        })
    }

    function saveSettings() {
        return new Promise(function (resolve, reject) {
            browser.storage.local.set({
                'settings': settings
            }).then(function () {
                resolve(settings);
            });
        })
    }

}());
