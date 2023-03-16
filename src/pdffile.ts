import { TFile } from "obsidian";

export class PDFFile {
    /**
     * @public
     */
    extension: string;
    /**
     * @public
     */
	path: string;
    /**
     * @public
     */
    content: ArrayBuffer;
    /**
     * @public
     */
    name: string;

    constructor(name: string, binaryContent: ArrayBuffer, extension: string, path: string) {
        this.name = name;
        this.content = binaryContent;
        this.extension = extension;
        this.path = path;
    }

    public static convertTFileToPDFFile(tFile: TFile, binaryContent: ArrayBuffer): PDFFile {
        let pdfFile = new PDFFile;
        pdfFile.extension = tFile.extension
        pdfFile.path = tFile.path
        pdfFile.name = tFile.name
        pdfFile.content = binaryContent
        return pdfFile
    }
}