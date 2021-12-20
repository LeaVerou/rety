import Recorder from "./src/recorder.js";
import Replayer from "./src/replayer.js";

let initialCode = `* {
	color: red;
}`;

// initialCode = "";

source.textContent = source.value = initialCode;
destination.textContent = destination.value = initialCode;
source.dispatchEvent(new InputEvent("input"));
destination.dispatchEvent(new InputEvent("input"));

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
	let ret = "[\n\t";

	for (let i = 0; i < arr.length; i++) {
		let e = arr[i];
		let str = JSON.stringify(e);
		let isLast = i === arr.length - 1;
		let isLong = str.length > 5;

		if (isLong && ret.endsWith(", ")) {
			ret += "\n\t";
		}


		ret += str + (isLast? "\n" : (isLong? ",\n\t" : ", "));
	}
	return ret + "]";
}