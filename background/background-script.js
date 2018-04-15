"use strict";

const amo = /^https?:\/\/(discovery\.)?(addons\.mozilla\.org|testpilot\.firefox\.com)|^about:/i;

var settings = {};
/*
Default settings. If there is nothing in storage, use these values.
*/
var defaultSettings = {
linkFine: "#B2FFB7",
  linkBroken: "#CC0000",
  linkTimeOut: "#FFCC99",
  linkSkipped: "#CCCCCC",
  linkInvalid: "#999900",
  secondsTimeOut: 45,
  showStats: false,
  anchor: true,
  option: true,
  area: true,
  hintsToRecongnize: "logoff,logout,signoff"
};


/*
Generic error logger.
*/
function onError(e) {
  console.error(e);
}


/* Create context menus */
browser.contextMenus.create({
  id: 'menu-link-analyer-all',
  title: chrome.i18n.getMessage('menuAll'),
  contexts: ['page'],
  icons: {
      "16": "icons/icon-all.svg",
      "32": "icons/icon-all.svg",
      "48": "icons/icon-all.svg"
    },
  documentUrlPatterns: ['<all_urls>'],                     // limiting to supported schemes
  onclick : check
});


browser.contextMenus.create({
  id: 'menu-link-analyer-selection',
  title: chrome.i18n.getMessage('menuSel'),
  contexts: ['selection'],
  icons: {
      "16": "icons/icon-sel.svg",
      "32": "icons/icon-sel.svg",
      "48": "icons/icon-sel.svg"
    },
  documentUrlPatterns: ['<all_urls>'],  // limiting to supported schemes
  onclick : check
});


function getSettings() {
  return new Promise(function (resolve, reject) {
      browser.storage.local.get("settings", function (value) {
          for (let i in defaultSettings) {
              if (value.settings != undefined && value.settings[i] != undefined) {
                  settings[i] = value.settings[i];
              } else {
                settings[i] = defaultSettings[i];
              }
          }
          resolve(settings);
      });
  })
}


function check(info, tab){
  var scope;
  if (info.menuItemId == "menu-link-analyer-selection"){
    scope = "selection";
  } else {
    scope = "all";
  }
  getSettings().then(function () {
    browser.tabs.sendMessage(
      tab.id, {scope: scope,
        linkFine: settings.linkFine,
        linkBroken: settings.linkBroken,
        linkTimeOut: settings.linkTimeOut,
        linkSkipped: settings.linkSkipped,
        linkInvalid: settings.linkInvalid,
        secondsTimeOut: settings.secondsTimeOut,
        showStats: settings.showStats,
        anchor: settings.anchor,
        option: settings.option,
        area: settings.area,
        hintsToRecongnize: settings.hintsToRecongnize
      }
    ).then(response => {
          //console.log("Message from the content script:");
          //console.log(response.response);
    }).catch(onError);
  });
}
