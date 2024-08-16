import {InsightDatasetKind} from "./IInsightFacade";
import fs from "fs-extra";
import {ISection} from "./ISection";
import {IRoom} from "./IRoom";

// Reference: https://github.com/jprichardson/node-fs-extra/blob/HEAD/docs/writeJson.md
// Save the newly added dataset to disk,need id, kind,content and numRows
async function saveToDisk(id: string, dataList: ISection[] | IRoom[], kind: InsightDatasetKind) {
	try {
		await fs.ensureDir("./data");
		// fileName is in the format of id.json
		let newKind: string;
		if(kind === InsightDatasetKind.Sections){
			newKind = "sections";
		} else{
			newKind = "rooms";
		}
		await fs.writeJson("./data/" + id + ".json", JSON.stringify({
			id: id,
			kind: newKind,
			data: dataList,
			numRows: dataList.length
		}));
		console.log("success!");
	} catch (err) {
		console.error(err);
	}
}

// Reference: https://www.geeksforgeeks.org/node-js-fs-promise-readdir-method/
// Reference:https://github.com/jprichardson/node-fs-extra/blob/1d931c88b2d5428670fb39458158ce9c5ac242a3/docs/readJson.md
// load datasets from disk
async function loadFromDisk() {
	let datasets = new Map<string, ISection[] | IRoom[]>();
	try {
		await fs.ensureDir("./data");
		// iterate through the datasets folder,return a promise with the list of names of files
		let filenames = await fs.promises.readdir("./data");
		const promises = filenames.map(async (filename) => {
			// Split the string and get the first part
			const id = filename.split(".")[0];
			// Return a JavaScript object representing the contents of the JSON file
			const datasetObj = await fs.readJson("./data/" + id + ".json");

			return {id, data: JSON.parse(datasetObj).data};
		});
		const datasetList = await Promise.all(promises);
        // Convert the array of datasets to a Map
		for(let dataset of datasetList){
			datasets.set(dataset.id, dataset.data);
		}

		// for (let filename of filenames) {
		// 	// split the string and get the first part
		// 	let id = filename.split(".")[0];
		// 	const datasetObj = await fs.readJson("./data/" + id + ".json");
		// 	datasets.set(id, JSON.parse(datasetObj).data);
		// }
	} catch (err) {
		console.error(err);
	}
	return datasets;
}

export{saveToDisk,loadFromDisk};


