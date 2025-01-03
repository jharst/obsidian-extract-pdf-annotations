import { PDFFile } from 'src/types';
import { ANNOTS_TREATED_AS_HIGHLIGHTS } from 'src/settings';


// return text between min and max, x and y
function searchQuad(minx: number, maxx: number, miny: number, maxy: number, items: any) {
	const mycontent = items.reduce(function (txt: string, x: any) {
		if (x.width == 0) return txt                      // eliminate empty stuff
		if (!((miny <= x.transform[5]) && (x.transform[5] <= maxy))) return txt  // y coordinate not in box
		if (x.transform[4] + x.width < minx) return txt   // end of txt before highlight starts
		if (x.transform[4] > maxx) return txt             // start of text after highlight ends 

		const start = (x.transform[4] >= minx ? 0 :       // start at pos 0, when text starts after hightlight start
			Math.round(x.str.length * (minx - x.transform[4]) / x.width))  // otherwise, rule of three: start proportional
		if (x.transform[4] + x.width <= maxx) {           // end of txt ends before highlight ends
			return txt + x.str.substr(start)                //     
		} else {                                          // else, calculate proporation end to get the expected length
			const lenc = Math.round(x.str.length * (maxx - x.transform[4]) / x.width) - start
			return txt + x.str.substr(start, lenc)
		}
	}, '')
	return mycontent.trim()
}


// iterate over all QuadPoints and join retrieved lines 
export function extractHighlight(annot: any, items: any) {
  const highlight = annot.quadPoints.reduce((txt: string, quad: Float32Array) => {
    if (quad.length === 0) {console.log('Quad is empty'); return txt;} // Skip if quad is empty

    const xValues = [quad[0], quad[2], quad[4], quad[6]];
    const yValues = [quad[1], quad[3], quad[5], quad[7]];

    const minx = Math.min(...xValues);
    const maxx = Math.max(...xValues);
    const miny = Math.min(...yValues);
    const maxy = Math.max(...yValues);

    const res = searchQuad(minx, maxx, miny, maxy, items);
    console.log("search Quad result (= res): " + res);

    if (txt.substring(txt.length - 1) != '-') {
      return txt + ' ' + res; // Concatenate lines by 'blank'
    } else if (txt.substring(txt.length - 2).toLowerCase() == txt.substring(txt.length - 2) && // End by lowercase-
      res.substring(0, 1).toLowerCase() == res.substring(0, 1)) { // And start with lowercase
      return txt.substring(0, txt.length - 1) + res; // Remove hyphen
    } else {
      return txt + res; // Keep hyphen
    }
  }, '');
  return highlight;
}



// load the PDFpage, then get all Annotations
// we look only at desiredAnnotations from the user's settings
// if its a underline, squiggle or highlight, extract Highlight of the Annotation 
// accumulate all annotations in the array total
async function loadPage(page, pagenum: number, file: PDFFile, containingFolder: string, total: object[], desiredAnnotations: string[]) {
	let annotations = await page.getAnnotations()

	annotations = annotations.filter(function (anno) {
		return desiredAnnotations.indexOf(anno.subtype) >= 0;
	});

	const content: TextContent = await page.getTextContent({ normalizeWhitespace: true })

	// sort text elements
	content.items.sort(function (a1, a2) {
		if (a1.transform[5] > a2.transform[5]) return -1    // y coord. descending
		if (a1.transform[5] < a2.transform[5]) return 1
		if (a1.transform[4] > a2.transform[4]) return 1    // x coord. ascending
		if (a1.transform[4] < a2.transform[4]) return -1
		return 0
	})


	annotations.map(async function (anno) {
		if (ANNOTS_TREATED_AS_HIGHLIGHTS.includes(anno.subtype)) {
			console.log("Considering annotation:");
			console.dir(anno);
			anno.highlightedText = extractHighlight(anno, content.items)
			console.log("Highlighted Text: " + anno.highlightedText);
		}
		if (anno.subtype == 'Highlight') { 
          if (!anno.contentsObj.str.includes('#')) {
            console.log(`Skipping… ` + anno.subtype + ` ` + anno.contentsObj.str)
            return;
          }
        }
        anno.folder = containingFolder;
        anno.file = file;
        anno.filepath = file.path;
        anno.pageNumber = pagenum;
        anno.author = anno.titleObj.str;
        anno.body = anno.contentsObj.str + ` [[` + file.path + `#page=` + pagenum + `&annotation=` + anno.id + `|(` + pagenum +`)]]`;
        anno.reference = anno.id;
		total.push(anno)
	});
}


export async function loadPDFFile(file: PDFFile, pdfjsLib, containingFolder: string, total: object[], desiredAnnotations: string[]) {
	const pdf: PDFDocumentProxy = await pdfjsLib.getDocument(file.content).promise;
	for (let i = 1; i <= pdf.numPages; i++) {
		const page = await pdf.getPage(i)
		await loadPage(page, i, file, containingFolder, total, desiredAnnotations)
	}
}