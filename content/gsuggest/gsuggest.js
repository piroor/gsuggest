/* 
 ***** BEGIN LICENSE BLOCK *****
  Copyright 2004 J. Carlos Navea
  loconet@gmail.com
  ***** END LICENSE BLOCK *****


Modified Version, implemented without XBL:
	made by SHIMODA Hiroshi <piro@p.club.ne.jp>

*/
 
var GSuggest = { 
	
	get searchbar() 
	{
		var bar = document.getElementsByTagName('searchbar');
		return bar && bar.length ? bar[0] : null ;
	},
	get popup()
	{
		return document.getElementById('gsuggest_suggestListPopup');
	},
 
/* update searchbar */ 
	
	initBar : function() 
	{
		var search = this.searchbar;
		if (!search || search.gsuggestInitialized) return;

		search.gsuggestInitialized = true;

		search.mTextbox.addEventListener('keyup', this.onKeyUp, true);
		search.mTextbox.addEventListener('keypress', this.onKeyPress, true);
		search.mTextbox.addEventListener('blur', this.onBlur, false);

		textbox.addEventListener('focus', this.onTextboxFocused, true);
		window.addEventListener('focus', this.onSomethingFocused, true);

		document.getAnonymousElementByAttribute(search, 'anonid', 'searchbar-popup').addEventListener('command', this.onCommand, true);

		this.initSuggest();

	},
 
	destroyBar : function() 
	{
		var search = this.searchbar;
		if (!search || !search.gsuggestInitialized) return;

		search.gsuggestInitialized = false;

		search.mTextbox.removeEventListener('keyup', this.onKeyUp, true);
		search.mTextbox.removeEventListener('keypress', this.onKeyPress, true);
		search.mTextbox.removeEventListener('blur', this.onBlur, false);

		textbox.removeEventListener('focus', this.onTextboxFocused, true);
		window.removeEventListener('focus', this.onSomethingFocused, true);

		document.getAnonymousElementByAttribute(search, 'anonid', 'searchbar-popup').removeEventListener('command', this.onCommand, true);
	},
  
/* event handlers */ 
	
	onKeyUp : function(aEvent) 
	{
		GSuggest.startWatchText();
		GSuggest.showSuggest(aEvent);
	},
 
	onKeyPress : function(aEvent) 
	{
		GSuggest.operateSuggesList(aEvent);
	},
 
	onBlur : function(aEvent) 
	{
		GSuggest.popup.hidePopup();
		GSuggest.popup.shown = false;
	},
 
	onTextboxFocused : function(aEvent) 
	{
		GSuggest.textBoxFocused = true;
	},
	textBoxFocused : false,
 
	onSomethingFocused : function(aEvent) 
	{
		window.setTimeout(function() {
			if (!GSuggest.textBoxFocused) {
				GSuggest.popup.hidePopup();
				GSuggest.popup.shown = false;
			}

			GSuggest.textBoxFocused = false;
		}, 0);
	},
 
	onCommand : function(aEvent) 
	{
		GSuggest.initSuggest();
	},
 
	onPopupShowing : function(aEvent) 
	{
		var popup = this.popup;
		popup.shown = true;
		popup.active = false;
	},
 
	onPopupHiding : function(aEvent) 
	{
		var popup = this.popup;
		popup.shown = false;
		popup.active = false;
	},
  
/* prefs */ 
	
	get Prefs() 
	{
		if (!this.mPrefs)
			this.mPrefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch(null);
		return this.mPrefs;
	},
	mPrefs : null,
 
	getCharPref : function(aKey) 
	{
		var value;
		try {
			value = this.Prefs.getCharPref(aKey);
		}
		catch(e) {
			value = null;
		}
		return value;
	},
  
/* suggest */ 
	
	lastSearch       : null, 
	lastSearchBackup : null,
 
	get suggestXMLHttpRequest() 
	{
		if (!this.mSuggestXMLHttpRequest)
			this.mSuggestXMLHttpRequest = new XMLHttpRequest();
		return this.mSuggestXMLHttpRequest;
	},
	set suggestXMLHttpRequest(aVal)
	{
		this.mSuggestXMLHttpRequest = aVal;
		return aVal;
	},
	mSuggestXMLHttpRequest : null,
 
	loadedSuggestions : function() 
	{
		switch(GSuggest.suggestXMLHttpRequest.readyState)
		{
			default:
				break;
			case 4:
				GSuggest.showSuggestList();
				break;
		}
	},
 
	searchQuery : function(menuItem) 
	{
		this.search(menuItem.getAttribute('q'));
		this.popup.hidePopup();
		this.popup.shown = false;
	},
 
	initSuggest : function() 
	{
		window.setTimeout(this.initSuggestCallback, 0);
	},
	initSuggestCallback : function()
	{
		if (GSuggest.searchengineSuggests()) {
			GSuggest.setDisableAutoComplete('true');
			GSuggest.showSuggest();
		}
		else
			GSuggest.setDisableAutoComplete('false');
	},
	setDisableAutoComplete : function(aState)
	{
		GSuggest.searchbar.mTextbox.setAttribute('disableautocomplete', aState);
	},
	searchengineSuggests : function()
	{
		var regexp = /google(-suggest|-jp)?.src$/;
		return regexp.test(this.searchbar.getAttribute('searchengine'));
	},
 
	search : function(aQuery) 
	{
		this.searchbar.mTextbox.value = aQuery;
		this.searchbar.mTextbox.onTextEntered();
	},
 
	sendSuggestRequest : function() 
	{
		if (!this.searchengineSuggests()) return;

		try {
			if (this.suggestXMLHttpRequest)
				this.suggestXMLHttpRequest.abort();
			this.suggestXMLHttpRequest = null;
		}
		catch(e) {
		}

		try {
			this.suggestXMLHttpRequest.open('GET', 'http://www.google.com/complete/search?hl='+this.suggestLang+'&js=true&ie=utf8&qu='+encodeURIComponent(this.searchbar.mTextbox.value));
			this.suggestXMLHttpRequest.onreadystatechange = this.loadedSuggestions;
			this.suggestXMLHttpRequest.send(null);
		} catch(e) {
		}
	},
 
	get suggestLang() 
	{
		var lang = this.getCharPref('extensions.gsuggest.lang');
		if (!lang) {
			lang = [
				(this.getCharPref('intl.accept_languages') || ''),
				(this.getCharPref('general.useragent.locale') || '')
			].join('\n');
			if (lang.indexOf('ja') > -1)
				lang = 'ja';
			else
				lang = null;
		}
		if (!lang) lang = 'en';
		return lang;
	},
  
/* UI */ 
	
	getCurrentItem : function(aPopup) 
	{
		aPopup = aPopup || this.popup;
		var active = aPopup.getElementsByAttribute('_moz-menuactive', 'true');
		for (var i = 0, maxi = active.length; i < maxi; i++)
			if (active[i].parentNode == aPopup) return active[i];
		return null;
	},
 
	showSuggest : function(aEvent) 
	{
		if (!this.searchengineSuggests()) return;

		var bar = this.searchbar;
		if (bar.mTextbox.value == '') {
			this.hideSuggestPopup();
			this.lastSearch       = '';
			this.lastSearchBackup = '';
			return;
		}

		//only query when the text changed
		if (this.lastSearch != bar.mTextbox.value) {
			this.lastSearch       = bar.mTextbox.value;
			this.lastSearchBackup = bar.mTextbox.value;
			this.sendSuggestRequest();
		}
	},
 
	showSuggestList : function() 
	{
		//todo: add some validation here, this could be dangerous!
		if (this.suggestXMLHttpRequest.responseText)
			eval('this.' + this.suggestXMLHttpRequest.responseText);
	},
	
	sendRPCDone : function(ignore1, ignore2, queries, numResults, ignore3) 
	{
		if(!this.searchengineSuggests() || this.searchbar.mTextbox.value == "")
			return;

		var popup = this.popup;
		while (popup.hasChildNodes())
			popup.removeChild(popup.lastChild);

		var numItems = queries.length;
		if (!numItems) {
			this.hideSuggestPopup();
		}
		else {
			for(var i = 0; i < numItems; i++) {
				var entry = document.createElementNS(XUL_NS, "menuitem");
				entry.setAttribute('q',queries[i]);
				entry.setAttribute('label',queries[i]+" ("+numResults[i]+")");
				popup.appendChild(entry);
			}
			this.showSuggestPopup();
		}
	},
  
	showSuggestPopup : function(aEvent) 
	{
		var popup = this.popup;
		if (!popup.shown) {
			popup.showPopup(this.searchbar, -1, -1, 'popup', 'bottomleft', 'topleft');
			this.searchbar.mTextbox.closePopup();
		}
	},
 
	hideSuggestPopup : function(aEvent, aWithDelay) 
	{
		if (aWithDelay) {
			window.setTimeout('GSuggest.hideSuggestPopup();', 0);
			return;
		}
		var popup = this.popup;
		if (!popup.shown) return;
		popup.hidePopup();
	},
 
	operateSuggesList : function(aEvent) 
	{
		if (!this.searchengineSuggests()) return;

		if (aEvent.keyCode == aEvent.DOM_VK_ENTER ||
			aEvent.keyCode == aEvent.DOM_VK_RETURN) {
			this.endWatchText();
			this.hideSuggestPopup();
			return;
		}


		if (
			aEvent.ctrlKey ||
			aEvent.shiftKey ||
			aEvent.altKey ||
			aEvent.metaKey
			)
			return;


		var popup = this.popup;
		if (!popup.hasChildNodes()) return;

		var bar = this.searchbar;
		switch(aEvent.keyCode)
		{
			default:
				break;

			case aEvent.DOM_VK_DOWN:
				var current = this.getCurrentItem();
				if (current) {
					current.removeAttribute('_moz-menuactive');
					if (current.nextSibling)
						current = current.nextSibling;
					else
						current = null;
				}
				else {
					current = popup.firstChild;
				}
				if (current) {
					popup.active = true;
					current.setAttribute('_moz-menuactive', true);
					bar.mTextbox.value = current.getAttribute('q');
				}
				else {
					popup.active = false;
					bar.mTextbox.value = this.lastSearchBackup;
				}
				this.lastSearch = bar.mTextbox.value;

				aEvent.stopPropagation();
				aEvent.preventDefault();
				break;

			case aEvent.DOM_VK_UP:
				var current = this.getCurrentItem();
				if (current) {
					current.removeAttribute('_moz-menuactive');
					if (current.previousSibling)
						current = current.previousSibling;
					else
						current = null;
				}
				else {
					current = popup.lastChild;
				}
				if (current) {
					popup.active = true;
					current.setAttribute('_moz-menuactive', true);
					bar.mTextbox.value = current.getAttribute('q');
				}
				else {
					popup.active = false;
					bar.mTextbox.value = this.lastSearchBackup;
				}
				this.lastSearch = bar.mTextbox.value;

				aEvent.stopPropagation();
				aEvent.preventDefault();
				break;
		}
	},
 
	enterQueryFromSuggestList : function(aEvent) 
	{
		if (!this.searchengineSuggests()) return;

		if (
			!aEvent.ctrlKey &&
			!aEvent.shiftKey &&
			!aEvent.altKey &&
			!aEvent.metaKey
			) {
			var popup = this.popup;
			if (!popup.hasChildNodes()) return;

			switch(aEvent.keyCode)
			{
				default:
					break;

				case aEvent.DOM_VK_ENTER:
				case aEvent.DOM_VK_RETURN:
					var bar = this.searchbar;
					if (popup.boxObject.height > 0) { // shown
						var current = popup.getElementsByAttribute('_moz-menuactive', 'true')[0];
						if (current)
							bar.mTextbox.value = current.getAttribute('q');
					}

					this.endWatchText();

					if (popup.shown) {
						popup.hidePopup();
						popup.shown = false;
					}
					break;
			}
		}
	},
  
/* for IME */ 
	
	startWatchText : function() 
	{
		this.endWatchText();
		if (this.suggestLang == 'en' ||
			!this.searchengineSuggests()) return;

		this.watchTextCount = 0;
		this.watchTextTimer = window.setTimeout(this.watchText, this.watchTextTimeout);
	},
	endWatchText : function()
	{
		if (this.watchTextTimer)
			window.clearTimeout(this.watchTextTimer);
	},
	watchTextTimer   : null,
	watchTextCount   : 0,
	watchTextTimeout : 100,
	watchText : function()
	{
		var node = GSuggest.searchbar;
		GSuggest.showSuggest();
		GSuggest.watchTextTimer = window.setTimeout(arguments.callee, GSuggest.watchTextTimeout);
		if ((GSuggest.watchTextCount++) > 1000)
			GSuggest.endWatchText();
	},
  
	init : function() { 
		GSuggest.initBar();
		window.removeEventListener('load', GSuggest.init, false);
		window.addEventListener('unload', GSuggest.destroy, false);

		var originalBrowserCustomizeToolbar = window.BrowserCustomizeToolbar;
		window.BrowserCustomizeToolbar = function() {
			GSuggest.destroyBar();
			originalBrowserCustomizeToolbar.call(window);
		};

		var toolbox = document.getElementById('navigator-toolbox');
		if (toolbox.customizeDone) {
			toolbox.__secondsearch__customizeDone = toolbox.customizeDone;
			toolbox.customizeDone = function(aChanged) {
				this.__secondsearch__customizeDone(aChanged);
				GSuggest.initBar();
			};
		}
		if ('BrowserToolboxCustomizeDone' in window) {
			var originalBrowserToolboxCustomizeDone = window.BrowserToolboxCustomizeDone;
			window.BrowserToolboxCustomizeDone = function(aChanged) {
				originalBrowserToolboxCustomizeDone.apply(window, arguments);
				GSuggest.initBar();
			};
		}
	},
	destroy : function() {
		GSuggest.destroyBar();
		window.removeEventListener('unload', GSuggest.destroy, false);
	}
};

window.addEventListener('load', GSuggest.init, false);
  
