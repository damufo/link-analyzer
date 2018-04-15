/*
Copyright (c) 2008-2011 Jan Janetka, jan@janetka.sk
Copyright (c) 2018 Daniel Muñiz Fontoira, dani@damufo.com

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/


"use strict";


var linkAnalyzer = {};
linkAnalyzer.popup = {};

linkAnalyzer = {	
	// -- first some usefull functions --
	// ----------------------------------
	
	// replacement for long "docu.. getelementbyid .." 
	id: function (a, elem) {
		return (elem || document).getElementById(a);		
	},
	
	// get all elements by certain name
	elem: function (name, scope) { 
		// if scope is other then "null", it means we got a selection to deal with
		// we will need to get elements from all page and then just filter out those not in scope		
		if (scope != null) {
			// array for all elements in scope
			var r = new Array();
			// get elements with this tag name from whole page, using this same function
			var el = linkAnalyzer.elem ( name );
			
			// loop through them and if they are in selection, push them into array			
			for (var i = 0; i < el.length; i++) {
				if (scope.containsNode(el[i], true)) {
					r.push(el[i]);
				} else {}	
			}
			
			// return this array of nodes in selection			
			return r;
		} else {
			return document.getElementsByTagName ( name );
		}
	},	
	
	// replacement for both set and get attribute
	attr: function (elem, attr, set) {
		return (set == null) ? elem.getAttribute(attr) : elem.setAttribute(attr, set);		
	},
	
	// will find selection on page and return true if it exists
	// if there is a parameter passed in, it will return the selection itself
	getSel: function () {
		var s = window.top.getSelection();
		return arguments.length == 0 ? s.rangeCount > 0 && s.toString().length > 0 : s;		
	},
	
	// deselect current selection on page
	deselect: function () {
		// get current selection
		var s = this.getSel(true);
		// remove range
		return s.removeRange( s.getRangeAt(0) );		
	},
	
	// set css to certain element
	css: function (elem, set) {
		for (var i in set) {
			elem.style[i] = set[i];			
		}		
	},
	
	// return current value of elements attribute
	currentCSS: function (elem, name) {
		if (elem.style[name]) {
        	return parseInt(elem.style[name]);
		} else {
        	var s = window.top.document.defaultView.getComputedStyle(elem,"");
        	return parseInt(s && s.getPropertyValue(name));	
		}
	},
	
	//get elements position from top
	getTop: function (elem) {
    	var p = 0;
	    while ( elem.offsetParent ) {
        	p += elem.offsetTop;
        	elem = elem.offsetParent;
    	}
		return p;
	},
	
	// get elements absolute position from left
	getLeft : function (elem ) {
		var p = 0;
		while ( elem.offsetParent ) {
        	p += elem.offsetLeft;
			elem = elem.offsetParent;
    	}
		return p;
	},
	
	// return true if argument "s" is url, otherwise false
	url: function (s) {
    	var regexp = /(ftp|http|https|\/\/):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
     	return regexp.test(s);
    },
	
	// will show certain element on page. If it is already showed, won't do anything
	show: function (el) {
		return (linkAnalyzer.attr(el, "hidden")) ? linkAnalyzer.attr(el, "hidden", false) : true;		
	},

	hide: function (el) {
		return linkAnalyzer.attr(el, "hidden") ? linkAnalyzer.attr(el, "hidden", true) : true;		
	},
	
	// this function is called on every link, option, area .. 
	// if goes through our 'omit list' - see preferences and return false if this link should be omited
	omit: function (a) {
		let hintsToRecongnize = linkAnalyzer.pref.hintsToRecongnize.split(","); 
		for (var i = 0; i < hintsToRecongnize.length; i++) {
			if (a.indexOf(hintsToRecongnize[i]) > -1) {
				return false;
			}		
		}
		// being here means 'for' didn't return false
		return true;
	},
	
	// constructors for 2 objects that will be created for every check at the very begining
	// statistics - how many links were checked, how many were broken, how long did it take, etc
	// preferences - everything that can be set in preferences window
	statisticsConst: function () {
		this.linkFine =  new Array();
		this.linkBroken = new Array();
		this.linkTimeOut =	new Array();
		this.linkSkipped = new Array();
		this.linkInvalid = new Array();
		this.start = 0;		
		// current time
		this.atm = null;
		// difference between start and end time
		this.diff =	null;
	},

	// default preferences	
	prefConst: function () {    
		this.linkFine = "#B2FFB7";
		this.linkBroken =  "#CC0000";
		this.timedOut =  "#FFCC99";
		this.linkSkipped =  "#CCCCCC";
		this.linkInvalid =  "#999900";
		this.secondsTimeOut =  45;
		this.showStats =  false;
		
		this.anchor =  true;
		this.option =  true;
		this.area =  true;
		this.hintsToRecongnize = "logoff,logout,signoff";
	},

	pref: null,
	statistics: null,
	
	// -- end of helping functions, below are the real functions, doing something cool --
	// ----------------------------------------------------------------------------------
	
	showHideEvent: function () {
		// id of menu item with option to check just selection
		var p = linkAnalyzer.id ("pinger-selected-links");
		
		// 	if there is selection, then r will equal false (don't hide), otherwise true (hide it)
		var r = linkAnalyzer.getSel() ? false : true;
		
		// show or hide menu item, depending on existence of selection
		linkAnalyzer.attr (p, "hidden", r);
	},	
	
	// this function will handle any results - styling link, chaning colors, titles, etc
	handler: function (r, el) {
		var color = linkAnalyzer.pref[r];
		
		// add this to it's appropriate statistic array
		linkAnalyzer.statistics[r].push(el);
		linkAnalyzer.attr(el, "title", "This link was marked as \"" + r + "\"");		
		
		// and last, let's check if we didn't check all links already
		var temp = linkAnalyzer.statistics.linkFine.length + 
			linkAnalyzer.statistics.linkBroken.length + 
			linkAnalyzer.statistics.linkTimeOut.length + 
			linkAnalyzer.statistics.linkSkipped.length +
			linkAnalyzer.statistics.linkInvalid.length;
			
		if (temp == linkAnalyzer.statistics.start) {
			linkAnalyzer.end();
		}
		
		if (r == "broken") {
			this.handleBrokenImages (el);		
		}
		
		// change CSS of this link
		return linkAnalyzer.css(el, {backgroundColor: color});
	},
	
	// this function is call on every found broken link
	// in link is "area", or image wrapped around link (that is broken), we create an overlay
	// with color of broken link, from prerences and we put this overlay over the image
	// additional functions used : this.getTop, getLeft, currentCSS
	handleBrokenImages: function (el) {
		var tag = el.nodeName.toLowerCase();
		// if we are dealing with area
		if (tag == "area") {
			// we need to find image associated with this area
			// get all images
			var o = linkAnalyzer.elem ("img");
			for (var j = 0; j < o.length; j++) {
				// get their "usermap" attr
				var usemap = linkAnalyzer.attr (o[j], "usemap");
				// if usemap exicts, check if it's the one we are looking for					
				if (usemap && usemap == "#" + el.parentNode.id) {
					// this is the image we need to color
					// create overlay for this image
					linkAnalyzer.createOverlay (o[j]);												
				}	
			}			
		} else if (tag == "a" && el.childNodes[0].nodeName.toLowerCase() == "img") {
			// this is an image we need to cover
			linkAnalyzer.createOverlay (el.childNodes[0]);
		} else {
			// probably an "option" tag or anchor with no image within ..
		}
		
		return true;
	},
	
	// creates an overlay over image within broken link
	createOverlay: function (el) {
		var overlay = window.top.document.createElement("div");
		window.top.document.body.appendChild ( overlay );
						
		// el => image we need to cover						
		// next we will set CSS for this overlay so it will cover image "el"
												
		linkAnalyzer.css ( overlay, { background: linkAnalyzer.pref.linkBroken,
						opacity: "0.6",
						display: "block",
						position: "absolute",
						top: linkAnalyzer.getTop ( el ) + "px",
						left: linkAnalyzer.getLeft ( el ) + "px",
						width: linkAnalyzer.currentCSS ( el , "width" ) + "px",
						height: linkAnalyzer.currentCSS ( el , "height" ) + "px"
		});
		
		return true;		
	},
	
	// function to get http response code of url
	getHTTP: function (el) {
		var xml = new XMLHttpRequest();
				
		// if we are dealing with a link or area tag, then we get it's .href, otherwise it's probably value from option
		var tag = el.nodeName.toLowerCase();		
		var url = (tag == "a" || tag == "area") ? el.href : linkAnalyzer.attr (el, "value");
		
		var requestDone = false;	
		
		setTimeout(function() { 
			// at this point, XX seconds passed for this request
			// requestDone should be true - it's all fine
			// if it's "false", it means this request timed out
			if (!requestDone) {
				// stop this request
				requestDone = true;
				linkAnalyzer.handler ("linkTimeOut", el);				
			}			 
		}, (linkAnalyzer.pref.secondsTimeOut * 1000));
		
		xml.onreadystatechange = function() {
        	if ( xml.readyState == 4 && !requestDone ) {
				console.log("xml.status" + xml.status);
				// responds with status between 200 and 300 are good, 0 means localhost or redirect, otherwise broken
				var response = ( xml.status >= 200 && xml.status < 300 ) ? "linkFine" : ( xml.status != 0 ) ? "linkBroken" : "linkInvalid";
				// now let's color link according to this response
				linkAnalyzer.handler (response, el);				
				// finish this request
				requestDone = true;
				// empty 'xml' object
				xml = null;				
        	}
    	};
		
		xml.open("HEAD", url , true);		
		//xml.send(null);
		xml.withCredentials = true; 
		xml.send();
		console.log("xml.status");
	},
	
	// checking function, can be called from context menu
	check: function () {
		// if prerefences exists, it means there is ongoing check in another window .. 
		//if (linkAnalyzer.pref) { return; }
		// load new preferences for this check
		//linkAnalyzer.pref = new linkAnalyzer.prefConst();
		// create new object from statistics
		linkAnalyzer.statistics = new linkAnalyzer.statisticsConst();
		
		// set when we started this check
		var a = new Date();
		linkAnalyzer.statistics.atm = a.getTime();
		
		// ---------------------------------------
		// are we checking the whole document, or just selection ?
		// if there are any parameters passed with function, it means we are checking in selection
		var scope = arguments.length != 0 ? linkAnalyzer.getSel(true) : null;
		// first let's get all links in this scope
		var anchor = linkAnalyzer.pref.anchor ? linkAnalyzer.elem ("a", scope) : new Array();
		
		linkAnalyzer.statistics.start = anchor.length;
		
		// loop through each link
		for (var i = 0; i < anchor.length; i++) {
			// filter out anchor links to page we are currently on and links with other protocol then http(s)
			if ((anchor[i].getAttribute("href") || "#").indexOf("#") != 0 && (anchor[i].href.indexOf("http") == 0 || anchor[i].href.indexOf("file") == 0) && linkAnalyzer.omit(anchor[i].href)) {
				// getHTTP will also color link and all other things by passing it with result to function "handler"
				linkAnalyzer.getHTTP(anchor[i]);				
			} else {
				// this link will be skipped
				linkAnalyzer.handler("linkSkipped", anchor[i]);
			}
		}
		
		// ----------------------------------------------
		// now let's dosomething similiar for option tags
		var option = linkAnalyzer.pref.option ? linkAnalyzer.elem ("option", scope) : new Array();
		// loop through all option tags
		for (var i = 0; i < option.length; i++) {
			// first, we need to check if they have "value" tag and then if it contains a link
			var value = linkAnalyzer.attr( option[i], "value" );
			// we need to get around //www.. links
			if (value && value.indexOf("//") == 0) {
				value = "http:" + value;
				linkAnalyzer.attr( option[i], "value", value );
			}
			
			if (value && linkAnalyzer.url(value) && linkAnalyzer.omit(value)) {
				linkAnalyzer.statistics.start++;
				linkAnalyzer.getHTTP(option[i]);				
			} else { 
				// not a link, don't do anything
			}
		}
		
		// for <area> tags
		var area = linkAnalyzer.pref.area ? linkAnalyzer.elem ("area", scope) : new Array();
		// loop through area elements
		for (var i = 0; i < area.length; i++) {
			// the exact control as in case of <a> tags .. we need to make sure that it's not anchor to ID on this same page 
			// and that it's http/https link..
			if ((area[i].getAttribute("href") || "#").indexOf("#") != 0 && area[i].href.indexOf("http") == 0 && linkAnalyzer.omit(area[i].href)) {
				linkAnalyzer.getHTTP(area[i]);				
			} else {
				// this link will be skipped
				linkAnalyzer.handler("linkSkipped", area[i]);
			}
			linkAnalyzer.statistics.start++;
		}
		
		// --------------------------------------------
		// if there is a scope, then we need to deselect selected text on page
		scope ? linkAnalyzer.deselect() : null;
        //scope ? linkAnalyzer.pref = null : null;
        
	},
	
	// end function, to say what we found.. blah blah..
	end: function () {	
		var b = new Date();
		
		// .diff variable will hold difference between start and actual time, so we know how long it took to check the page
		linkAnalyzer.statistics.diff = ( Math.round ( (b.getTime() - linkAnalyzer.statistics.atm) / 1000) );
		
		// EYE CANDY
		// this will dimm the whole screen and show statistics
		// only show if user has checked it in his preferences
		if (linkAnalyzer.pref.showStats) {
			linkAnalyzer.popup.init();	
		}
		
		//linkAnalyzer.pref = null;
		//linkAnalyzer.statistics = null;
		//linkAnalyzer.hide ( linkAnalyzer.id ( "pingerSb" ) );
	}
};

linkAnalyzer.popup = {
	init: function () {
		// let's creat an empty "div" element to hold the "black" screen
		var overlay = window.top.document.createElement ("div");
		// append it to body of webpage we are in
		window.top.document.body.appendChild ( overlay );
		// set CSS
		linkAnalyzer.css ( overlay, {	background: "#000",	
					opacity: "0", 
					display: "block", 
					position: "absolute", 
					top: "0px", 
					left: "0px", 
					width: linkAnalyzer.popup.getWidth() + "px", 
					height: linkAnalyzer.popup.getHeight() + "px", 
					zIndex: "99",
					cursor: "pointer"});
		
		// and fade in !
		linkAnalyzer.popup.fadeIn ( overlay, 60, 4 );
		
		// add event listener for clicking on this black background
		// whenever user do so, it means we need to hide it completele
		// and also hide the statistics box
		overlay.addEventListener("click", function () { 
			linkAnalyzer.popup.fadeOut ( overlay, 0, 4 );
			linkAnalyzer.popup.fadeOut ( stats, 0, 4 );
			// if there are any broken links, then there is "additiona" window
			if (additional) {
				linkAnalyzer.popup.fadeOut ( additional, 0, 4 );
			}
		}, false);
		
		// Screen is in cool black 
		// Now we need to create some sort of information table, about statistics from this check
		// 1 div to hold it all within
		var stats = window.top.document.createElement ("div");
		// append it just beneath our overlay
		window.top.document.body.appendChild ( stats );
		// set CSS
		// first we will make it rounded - i have not figured out how to put this into .css() function, because of "-" at the beginning :((
		linkAnalyzer.attr( stats, "style", "-moz-Border-Radius: 1em");	
		// and now we cat adjust all other CSS		
		linkAnalyzer.css ( stats , { position: "fixed",
					top: "100px",
					left: "30%",
					width: "470px",
					height: "315px",
					zIndex: "100",
					background: "#fff",
					display: "block",
					textAlign: "left",
					fontFamily: "arial,sans-serif",
					fontSize: "12px",
					color: "#000",
					padding: "5px 10px 10px 20px",
					"overflow-y": "auto" });
		
		var secondsTimeOut = linkAnalyzer.pref.secondsTimeOut;
		var statistics = 
		stats.innerHTML = "<h2 style=\"font-size: 20px; color: #000; font-weight: bold; text-decoration: underline; padding-bottom: 5px; margin-bottom: 5px;\">" + browser.i18n.getMessage("extensionName") + "</h2>" +
						  "<p>" +
						  "<sup style=\"color: #666666; font-size: 10px\">1</sup> " + browser.i18n.getMessage('linksFineLabel') + ": " + linkAnalyzer.statistics.linkFine.length 	+ "<br />" +
						  "<sup style=\"color: #666666; font-size: 10px\">2</sup> " + browser.i18n.getMessage("linksBrokenLabel") + ": " + linkAnalyzer.statistics.linkBroken.length 	+ "<br />" +
						  "<sup style=\"color: #666666; font-size: 10px\">3</sup> " + browser.i18n.getMessage("linksTimeOutLabel") + ": " + linkAnalyzer.statistics.linkTimeOut.length + "<br />" +
						  "<sup style=\"color: #666666; font-size: 10px\">4</sup> " + browser.i18n.getMessage("linksInvalidLabel") + ": " + linkAnalyzer.statistics.linkInvalid.length  + "<br />" +
						  "<sup style=\"color: #666666; font-size: 10px\">5</sup> " + browser.i18n.getMessage("linksSkippedLabel") + ": " + linkAnalyzer.statistics.linkSkipped.length 	+ "</p>" +
						  "<p>" + browser.i18n.getMessage("testDuration") + ": " + linkAnalyzer.statistics.diff + " " + browser.i18n.getMessage("seconds") + "</p>";
		// let's explain what is what
		stats.innerHTML += "<p style=\"color: #666666; font-size: 10px\">" +
						   "<sup>1</sup> " + browser.i18n.getMessage("linksFinePopup") + "<br />" +
						   "<sup>2</sup> " + browser.i18n.getMessage("linksBrokenPopup") + "<br />" +
						   "<sup>3</sup> " + browser.i18n.getMessage("linksTimeOutPopup").replace("{secondsTimeOut}", linkAnalyzer.pref.secondsTimeOut) + "<br />" +
						   "<sup>4</sup> " + browser.i18n.getMessage("linksInvalidPopup") + "<br />" + 
						   "<sup>5</sup> " + browser.i18n.getMessage("linksSkippedPopup") + "<br /></p>";
						   
		// show broken link if exists
		if (linkAnalyzer.statistics.linkBroken.length > 0) {		
			stats.innerHTML += "<h2 style=\"font-size: 20px; color: #000; font-weight: bold; text-decoration: underline; padding-bottom: 5px; margin-bottom: 5px;\">" + browser.i18n.getMessage("linksBrokenLabel") + "</h2><p>";
			// loop through each broken links
			for (var i = 0; i < linkAnalyzer.statistics.linkBroken.length; i++) {
				stats.innerHTML += "<b>" + (linkAnalyzer.statistics.linkBroken[i].innerHTML || linkAnalyzer.attr (linkAnalyzer.statistics.linkBroken[i], "alt")).replace("<", "&lt;").replace(">", "&gt;") + "</b><br />";				
			}
			stats.innerHTML += "</p>";
		}
	},
	
	// following 2 functions are from John Resig : Pro JavaScript techniques . Awesome book btw ! :)
	// I just modified them a little to be completely stand-alone and to fit this extension
	fadeIn: function ( elem, to, speed ) {
    	for ( var i = 0; i <= 100; i += 5 ) {
        	(function(){
        		var opacity = i;
        		setTimeout(function(){
					elem.style.opacity = (( opacity / 100 ) * to) / 100;
            	}, ( i + 1 ) * speed );
        	})();
    	}
	},	

	fadeOut: function ( elem, to, speed ) {
		for ( var i = 0; i < 60; i += 5 ) {
			(function() {
				var opacity = i;
				setTimeout(function() {
					elem.style.opacity = (elem, 60 - opacity) / 100;
					if ( opacity == 55 )
						elem.style.display = "none";
				}, ( i + 1 ) * speed );
			})();
		}
	},
	
	getHeight: function () {
		//return window.top.document.body.clientHeight;

		// so, we need to get height
		// i figured this one out like this
		// if .body.clientHeight is lower then documentElement.clientHeight, that means we don't have a scroll bar
		// in this case, we will dim whole screen, taking documentElement.clientHeight
		//
		// but if .body.clientHeight is higher, then we can scroll down and we need to take this one, to dim also that part we don't currently see
		
		var a = window.top.document.body.clientHeight;
		var b = window.top.document.documentElement.clientHeight;
		
		return (a < b) ? b : a;
	},
	
	getWidth: function() {
		return window.top.document.body.clientWidth;
	}
};

browser.runtime.onMessage.addListener(request => {

	linkAnalyzer.pref = {
		linkFine: request.linkFine,
		linkBroken: request.linkBroken,
		linkTimeOut: request.linkTimeOut,
		linkSkipped: request.linkSkipped,
		linkInvalid: request.linkInvalid,
		secondsTimeOut:  request.secondsTimeOut,
		showStats: request.showStats,        
		anchor: request.anchor,
		option: request.option,
		area: request.area,
		hintsToRecongnize: request.hintsToRecongnize };

	if (request.scope == "all") {
		linkAnalyzer.check();
	} else if (request.scope == "selection") {
		linkAnalyzer.check("selection");
	}
  
  return Promise.resolve({response: "Rematou de comprobar"});
});

