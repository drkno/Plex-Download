// ==UserScript==
// @name        PLEX Download
// @author		Matthew Knox
// @namespace   nz.co.makereti.plexdownload
// @description Add a download button to Plex when one is not avalible
// @version     1.0
// @include     http*://*:32400/web/index.html#!/server/*
// @include     http*://*plex.tv/web/app#!/server/*
// @require     http://code.jquery.com/jquery-1.11.0.min.js
// @require     https://greasyfork.org/scripts/1003-wait-for-key-elements/code/Wait%20for%20key%20elements.js?version=2765
// @updateURL	https://github.com/mrkno/Plex-Download/raw/master/plex-download.user.js
// @grant       none
// ==/UserScript==

const pdrun = () => {
	console.log('PLEX Download script loaded.');
	if (!document.querySelector('.item-duration') ||
		document.querySelector('li.poster-item.season') ||
		document.body.querySelector('.download-btn.secondary-only') !== null) {
		return;
	}
  
	const objToParams = obj => {
		const opts = [];
		for (let key in obj) {
			opts.push(`${key}=${encodeURIComponent(obj[key])}`);
		}
		return opts.join('&');
	};

	const serverReachable = url => {
		const xhr = new XMLHttpRequest();
		let status = null;
		xhr.open('HEAD', url, false);
		try {
			xhr.send();
			status = xhr.status;
			return status >= 200 && status < 300 || status === 304;
		} catch (e) {
			return false;
		}
	};

	const testServers = (testServers, url) => {
		let server;
		for (let s of testServers) {
			const test = s + url;
			if (serverReachable(test)) {
				server = s;
				break;
			}
		}
		if (!server) {
			throw new Error('No server known');
		}
		return server;
	};

	const ajax = (ajaxServers, url, callback) => {
		let server = testServers(ajaxServers, url);
		url = server + url;
		
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = (...args) => {
			if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
				args.unshift(server);
				args.unshift(xhr);
				callback.apply(xhr, args);
			}
		};
		xhr.open("GET", url);
		xhr.send();
	};

	const insertBefore = document.body.querySelectorAll('.info-btn')[1].parentNode;
	const dropDown = insertBefore.parentNode;
	const mediaIdStr = decodeURIComponent(window.location.hash);
	const mediaIdSpl = mediaIdStr.split('/');
	const serverId = mediaIdSpl[2];
	const mediaId = mediaIdSpl[mediaIdSpl.length - 1];
	let plexData = JSON.parse(window.localStorage.users).users;
	let plexToken = null;

	if (plexData.length > 1) {
		plexData = plexData.find(d => d.authToken === (window.PLEXWEB.myPlexAccessToken || window.localStorage.myPlexAccessToken)).servers;
	}
	else {
		plexData = plexData[0].servers;
	}
	if (plexData.length > 1) {
		plexData = plexData.find(d => d.machineIdentifier === serverId);
		plexToken = plexData.accessToken;
		plexData = plexData.connections;
	}
	else {
		plexToken = plexData[0].accessToken;
		plexData = plexData[0].connections;
	}
	
	const servers = plexData.map(d => d.uri);
	const xhrOptions = {
		checkFiles: 1,
		includeExtras: 1,
		includeRelated: 1,
		includeRelatedCount: 5,
		includeOnDeck: 1,
		includeChapters: 1,
		includePopularLeaves: 1,
		includeConcerts: 1,
		includePreferences: 1,
		"X-Plex-Token": plexToken
	};
	const xhrUrl = `/library/metadata/${mediaId}?${objToParams(xhrOptions)}`;

	ajax(servers, xhrUrl, (xhr, server, ...other) => {
		const doc = xhr.responseXML;
		const part = doc.getElementsByTagName('Part')[0];
		const file = part.getAttribute('key');
		const url = `${server}${file}?download=1&X-Plex-Token=${plexToken}`;
		const downloadLi = document.createElement('li');
		downloadLi.innerHTML = `<a class="download-btn secondary-only" href="${url}" target="_self" download>Download</a>`;
		dropDown.insertBefore(downloadLi, insertBefore);
	});
};

waitForKeyElements(".metadata-right", pdrun);