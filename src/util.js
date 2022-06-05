// Used in both Recorder and Replayer constructors
export function getEditors(editor) {
	if (editor.nodeType === Node.ELEMENT_NODE) { // editor is a single element
		return {default: editor};
	}
	else if (Array.isArray(editor)) {
		if (editor.length === 1) {
			return {default: editor[0]};
		}
		else {
			// Multiple elements, we need to figure out the ids from the language-* classes
			const langRegex = /^lang(uage)?-/;

			return Object.fromEntries(editor.map(el => {
				let langClass = [...el.classList].find(cls => langRegex.test(cls));
				let id = langClass?.replace(langRegex, "") ?? el.className;
				return [id, el];
			}));
		}
	}
	else { // editor is multiple elements
		return editor;
	}
}

export function packActions (actions, {preserveCaretChanges} = {}) {
	let ret = [];

	for (let i=0; i<actions.length; i++) {
		let action = actions[i];
		let previousAction = ret[ret.length - 1];
		let added = false;

		if (previousAction) {
			if (typeof previousAction === "string") {
				// Expand compact insertText action so we can compare it to the new action
				previousAction = {type: "insertText", text: previousAction};
			}

			if (action.type === "caret") {
				if (!preserveCaretChanges) {
					// Can we replace the previous action?
					// Last action needs to also be a caret change, and editor should not have been changed
					if (previousAction?.type === "caret" && !action.editor) {
						// Remove previous action
						ret.splice(ret.length - 1, 1);

						if (previousAction.editor) {
							// Last action switched editor, we need to preserve this
							action.editor = previousAction.editor;
						}
					}
				}

				// Only record a single position for non-selection caret movements
				if (action.start === action.end) {
					action.position = action.start;
					delete action.start;
					delete action.end;
				}
			}
			else if (action.type === "insertText") {
				// Use split: true to compact consequtive single character insertText actions
				if (isCharacterByCharacter(action) && isCharacterByCharacter(previousAction)) {
					// Remove previous action
					ret.splice(ret.length - 1, 1);

					action = {
						type: "insertText",
						text: previousAction.text + action.text,
						split: true
					};

				}
			}
			else {
				if (actionsEqual(previousAction, action, {ignore: ["repeat"]})) {
					// Merge consecutive actions
					// We don’t want to merge consecutive insertText actions because we want the typed text
					// to be in the script, for ease of editing
					previousAction.repeat = (previousAction.repeat || 1) + 1;
					added = true;
				}
			}
		}

		// Compact simple insertText actions
		if (action.type === "insertText" && action.text && Object.keys(action) === 2) {
			action = action.text;
		}

		if (!added) {
			ret.push(action);
		}
	}

	return ret;
}

export function unpackActions (actions) {
	return actions.flatMap(action => {
		if (action.repeat) {
			let times = action.repeat;
			delete action.repeat;
			return Array(times).fill(action);
		}

		if (action.type === "insertText") {
			if (action.split) {
				delete action.split;
				return action.text.split("").map(character => Object.assign({}, action, {text: character}));
			}
		}
		else if (action.type === "caret") {
			if (action.position) {
				action.start = action.end = action.position;
				delete action.position;
			}
		}

		return action;
	});
}

export function actionsEqual (action1, action2, {ignore = []} = {}) {
	if (!action1 || !action2) {
		return false;
	}

	let keys = new Set([...Object.keys(action1), ...Object.keys(action2)]);

	for (let key of keys) {
		if (ignore.includes(key)) {
			continue;
		}

		if (action1[key] !== action2[key]) {
			return false;
		}
	}

	return true;
}


function isCharacterByCharacter(action) {
	return action.type === "insertText"
		&& (action.text?.length === 1 || action.split)
		&& !action.editor;
}