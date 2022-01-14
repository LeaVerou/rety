/*
Used via bookmarklet with:
javascript:(function(){import('https://rety.verou.me/src/bookmarklet.js').then(m => m.default())})()
javascript:(function(){import('http://localhost:8002/rety/src/bookmarklet.js').then(m => m.default())})()
*/

import Recorder from "./recorder.js";

export default function record() {
	// Get visible textareas
	let textareas = [...document.querySelectorAll("[class^='language-']:is(input, textarea)")].filter(t => {
		let rect = t.getBoundingClientRect();
		return rect.width > 0 || rect.height > 0;
	});

	if (textareas.length === 0) {
		console.error(`No elements found to record edits on`);
		return;
	}

	let recorder = new Recorder(textareas, {
		pauseCap: 5000
	});

	document.body.insertAdjacentHTML("beforeend", `<button id="rety_stop" style="position: fixed; top: 16px; right: 16px; z-index: 99999">⏹ Stop recording</button>`);
	rety_stop.onclick = evt => {
		recorder.pause();
		console.log(recorder.actions);
		console.log(JSON.stringify(recorder.actions));
		rety_stop.remove();
	}

	recorder.start();

	console.info(`Rety is recording edits on ${textareas.length} elements`);
}