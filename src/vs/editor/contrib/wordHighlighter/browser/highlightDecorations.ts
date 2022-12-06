/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./highlightDecorations';
import { MinimapPosition, OverviewRulerLane, TrackedRangeStickiness } from 'vs/editor/common/model';
import { ModelDecorationOptions } from 'vs/editor/common/model/textModel';
import { DocumentHighlightKind } from 'vs/editor/common/languages';
import * as nls from 'vs/nls';
import { activeContrastBorder, editorSelectionHighlight, editorSelectionHighlightBorder, minimapSelectionOccurrenceHighlight, overviewRulerSelectionHighlightForeground, registerColor } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant, themeColorFromId } from 'vs/platform/theme/common/themeService';
import { isHighContrast } from 'vs/platform/theme/common/theme';

registerColor('editor.wordHighlightBackground', { dark: '#575757B8', light: '#57575740', hcDark: null, hcLight: null }, nls.localize('wordHighlight', 'Background color of a symbol during read-access, like reading a variable. The color must not be opaque so as not to hide underlying decorations.'), true);
registerColor('editor.wordHighlightStrongBackground', { dark: '#004972B8', light: '#0e639c40', hcDark: null, hcLight: null }, nls.localize('wordHighlightStrong', 'Background color of a symbol during write-access, like writing to a variable. The color must not be opaque so as not to hide underlying decorations.'), true);
const editorWordHighlightBorder = registerColor('editor.wordHighlightBorder', { light: null, dark: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize('wordHighlightBorder', 'Border color of a symbol during read-access, like reading a variable.'));
const editorWordHighlightStrongBorder = registerColor('editor.wordHighlightStrongBorder', { light: null, dark: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize('wordHighlightStrongBorder', 'Border color of a symbol during write-access, like writing to a variable.'));
const overviewRulerWordHighlightForeground = registerColor('editorOverviewRuler.wordHighlightForeground', { dark: '#A0A0A0CC', light: '#A0A0A0CC', hcDark: '#A0A0A0CC', hcLight: '#A0A0A0CC' }, nls.localize('overviewRulerWordHighlightForeground', 'Overview ruler marker color for symbol highlights. The color must not be opaque so as not to hide underlying decorations.'), true);
const overviewRulerWordHighlightStrongForeground = registerColor('editorOverviewRuler.wordHighlightStrongForeground', { dark: '#C0A0C0CC', light: '#C0A0C0CC', hcDark: '#C0A0C0CC', hcLight: '#C0A0C0CC' }, nls.localize('overviewRulerWordHighlightStrongForeground', 'Overview ruler marker color for write-access symbol highlights. The color must not be opaque so as not to hide underlying decorations.'), true);

const _WRITE_OPTIONS = ModelDecorationOptions.register({
	description: 'word-highlight-strong',
	stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
	className: 'wordHighlightStrong',
	overviewRuler: {
		color: themeColorFromId(overviewRulerWordHighlightStrongForeground),
		position: OverviewRulerLane.Center
	},
	minimap: {
		color: themeColorFromId(minimapSelectionOccurrenceHighlight),
		position: MinimapPosition.Inline
	},
});

const _TEXT_OPTIONS = ModelDecorationOptions.register({
	description: 'selection-highlight-overview',
	stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
	className: 'selectionHighlight',
	overviewRuler: {
		color: themeColorFromId(overviewRulerSelectionHighlightForeground),
		position: OverviewRulerLane.Center
	},
	minimap: {
		color: themeColorFromId(minimapSelectionOccurrenceHighlight),
		position: MinimapPosition.Inline
	},
});

const _TEXT_OPTIONS_NO_OVERVIEW = ModelDecorationOptions.register({
	description: 'selection-highlight',
	stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
	className: 'selectionHighlight',
});

const _REGULAR_OPTIONS = ModelDecorationOptions.register({
	description: 'word-highlight',
	stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
	className: 'wordHighlight',
	overviewRuler: {
		color: themeColorFromId(overviewRulerWordHighlightForeground),
		position: OverviewRulerLane.Center
	},
	minimap: {
		color: themeColorFromId(minimapSelectionOccurrenceHighlight),
		position: MinimapPosition.Inline
	},
});

export function getHighlightDecorationOptions(kind: DocumentHighlightKind | undefined): ModelDecorationOptions {
	if (kind === DocumentHighlightKind.Write) {
		return _WRITE_OPTIONS;
	} else if (kind === DocumentHighlightKind.Text) {
		return _TEXT_OPTIONS;
	} else {
		return _REGULAR_OPTIONS;
	}
}

export function getSelectionHighlightDecorationOptions(hasSemanticHighlights: boolean): ModelDecorationOptions {
	// Show in overviewRuler only if model has no semantic highlighting
	return (hasSemanticHighlights ? _TEXT_OPTIONS_NO_OVERVIEW : _TEXT_OPTIONS);
}

registerThemingParticipant((theme, collector) => {
	const selectionHighlight = theme.getColor(editorSelectionHighlight);
	if (selectionHighlight) {
		collector.addRule(`.monaco-editor .selectionHighlight { background-color: ${selectionHighlight.transparent(0.5)}; }`);
	}

	const selectionHighlightBorder = theme.getColor(editorSelectionHighlightBorder);
	if (selectionHighlightBorder) {
		collector.addRule(`.monaco-editor .selectionHighlight { border: 1px ${isHighContrast(theme.type) ? 'dotted' : 'solid'} ${selectionHighlightBorder}; box-sizing: border-box; }`);
	}

	const wordHighlightBorder = theme.getColor(editorWordHighlightBorder);
	if (wordHighlightBorder) {
		collector.addRule(`.monaco-editor .wordHighlight { border: 1px ${isHighContrast(theme.type) ? 'dashed' : 'solid'} ${wordHighlightBorder}; box-sizing: border-box; }`);
	}

	const wordHighlightStrongBorder = theme.getColor(editorWordHighlightStrongBorder);
	if (wordHighlightStrongBorder) {
		collector.addRule(`.monaco-editor .wordHighlightStrong { border: 1px ${isHighContrast(theme.type) ? 'dashed' : 'solid'} ${wordHighlightStrongBorder}; box-sizing: border-box; }`);
	}
});