import {
	compile as compileTemplate,
	TemplateDelegate as Template,
} from "handlebars";
import {
	ANNOTS_TREATED_AS_HIGHLIGHTS,
	PDFAnnotationPluginSetting,
} from "./settings";

export class PDFAnnotationPluginFormatter {
	private settings: PDFAnnotationPluginSetting;

	// Template compilation options
	private templateSettings = {
		noEscape: true,
	};

	constructor(settings: PDFAnnotationPluginSetting) {
		this.settings = settings;
	}

	format(grandtotal, isExternalFile) {
		// now iterate over the annotations printing topics, then folder, then comments...
		let text = "";
		let topic = "";
		let currentFolder = "";
		let indentLevel = 0;
		let index = [];
		let bibliography = [];
		
		grandtotal.forEach((anno) => {
			
			//build index if settings are set accordingly
			if (this.settings.useUnderlinesAsIndex && anno.subtype === "Underline") {
				if (anno.body && anno.body.includes("#Bibliografie")) {
					bibliography.push(anno);
				} else {
					underlines.push(anno);
				}
				return;
			}

			// print main Title when Topic changes (and settings allow)
			if (this.settings.useStructuringHeadlines) {
				if (this.settings.sortByTopic) {
					if (topic != anno.topic) {
						topic = anno.topic;
						currentFolder = "";
						text += `# ${topic}\n`;
					}
				}

				if (this.settings.useFolderNames) {
					if (currentFolder != anno.folder) {
						currentFolder = anno.folder;
						text += `## ${currentFolder}\n`;
					}
				} else {
					if (currentFolder != anno.file.name) {
						currentFolder = anno.file.name;
						text += `## ${currentFolder}\n`;
					}
				}
			}

			let content = '';
			if (ANNOTS_TREATED_AS_HIGHLIGHTS.includes(anno.subtype)) {
				if (isExternalFile) {
					content += this.getContentForHighlightFromExternalPDF(anno);
				} else {
					content += this.getContentForHighlightFromInternalPDF(anno);
				}
			} else {
				if (isExternalFile) {
					content += this.getContentForNoteFromExternalPDF(anno);
				} else {
					content += this.getContentForNoteFromInternalPDF(anno);
				}
			}

			// Check for hastags and add tabs
			if (content && content.trim() !== "") {
				if (content.match(/#+\s/)) {
					const match = content.match(/(?<=\s)#+(?=\s)/);				
					var hashtagCount = match ? match[0].length : 0;
					indentLevel = hashtagCount;
					content = '\t'.repeat(hashtagCount - 1) + content + '\n';
				} else if (content.match(/#Quote/)) {
						const lines = text.split("\n");
						const substr = lines[lines.length - 2];
						console.log("vorletzte Zeile: " + substr);
  						if (!substr.includes("[\"]")) {
  							console.log("vorletzte Zeile enthält kein Zitat!");
  							lines[lines.length - 2] += "%% fold %%";
  						};
  						text = lines.join("\n");
						content = '\t'.repeat(indentLevel + 1) + content + '\n';
						// text = text.replace(/\n$/, '%%FOLD%%\n');
				} else {
						content = '\t'.repeat(indentLevel) + content + '\n';
				}
			text += content;
			}
		});

		if (grandtotal.length == 0) return "*No Annotations*";
		
		// add bibliography and index
		if (bibliography.length > 0) {
			text += "\n## Bibliographie\n";
			bibliography.forEach((anno) => {
				let content = isExternalFile
					? this.getContentForHighlightFromExternalPDF(anno)
					: this.getContentForHighlightFromInternalPDF(anno);
				if (content && content.trim() !== "") {
					text += content + '\n';
				}
			});
		}
		
		if (underlines.length > 0) {
			text += "\n## Index\n";
			underlines.forEach((anno) => {
				let content = isExternalFile
				? this.getContentForHighlightFromExternalPDF(anno)
				: this.getContentForHighlightFromInternalPDF(anno);
				if (content && content.trim() !== "") {
					//Hier später dataview-metadata feld index:: implementieren
					text += content + '\n';
				}
			});
		}
		
		return text;
	}

	get noteFromExternalPDFsTemplate(): Template {
		return compileTemplate(
			this.settings.noteTemplateExternalPDFs,
			this.templateSettings
		);
	}

	get noteFromInternalPDFsTemplate(): Template {
		return compileTemplate(
			this.settings.noteTemplateInternalPDFs,
			this.templateSettings
		);
	}

	get highlightFromExternalPDFsTemplate(): Template {
		return compileTemplate(
			this.settings.highlightTemplateExternalPDFs,
			this.templateSettings
		);
	}

	get highlightFromInternalPDFsTemplate(): Template {
		return compileTemplate(
			this.settings.highlightTemplateInternalPDFs,
			this.templateSettings
		);
	}

	getTemplateVariablesForAnnotation(annotation: any): Record<string, any> {
		const shortcuts = {
			highlightedText: annotation.highlightedText,
			folder: annotation.folder,
			file: annotation.file,
			filepath: annotation.filepath,
			pageNumber: annotation.pageNumber,
			pageLabel: annotation.pageLabel,
			author: annotation.author,
			body: annotation.body,
			reference: annotation.reference
		};

		return { annotation: annotation, ...shortcuts };
	}

	getContentForNoteFromExternalPDF(annotation: any): string {
		return this.noteFromExternalPDFsTemplate(
			this.getTemplateVariablesForAnnotation(annotation)
		);
	}

	getContentForNoteFromInternalPDF(annotation: any): string {
		return this.noteFromInternalPDFsTemplate(
			this.getTemplateVariablesForAnnotation(annotation)
		);
	}

	getContentForHighlightFromExternalPDF(annotation: any): string {
		return this.highlightFromExternalPDFsTemplate(
			this.getTemplateVariablesForAnnotation(annotation)
		);
	}

	getContentForHighlightFromInternalPDF(annotation: any): string {
		return this.highlightFromInternalPDFsTemplate(
			this.getTemplateVariablesForAnnotation(annotation)
		);
	}
}
