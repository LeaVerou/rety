import Recorder from "./src/recorder.js";
import Replayer from "./src/replayer.js";

let initialCode = `* {
	color: red;
}`;

// initialCode = "";

source.textContent = source.value = initialCode;
destination.textContent = destination.value = initialCode;

window.recorder = new Recorder(source);
window.replayer = new Replayer(destination);

setTimeout(recorder.start(), 1000);

let lastAction;
recorder.addEventListener("action", async function (evt) {
	await lastAction;
	let action = evt.detail;

	log.textContent = stringifyArray(recorder.actions);
	lastAction = replayer.run(action);
});


function stringifyArray(arr) {
	return "[\n\t" + arr.map(e => JSON.stringify(e)).join(",\n\t") + "\n]";
}