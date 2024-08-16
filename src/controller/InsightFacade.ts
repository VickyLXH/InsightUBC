import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "./IInsightFacade";
import JSZip from "jszip";
import {ISection} from "./ISection";
import fs from "fs-extra";
import {loadFromDisk, saveToDisk} from "./SaveandLoad";
import {filterResult, Query, Query2} from "./Query";
import {findDataset, groupAndapply, removeAllUuid, sortResult} from "./IsValidJson";
import {dealwithRoom} from "./RoomHelper";
import {dealwithSection} from "./SectionHelper";
import {IRoom} from "./IRoom";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

export default class InsightFacade implements IInsightFacade {
	// Reference: https://www.tutorialspoint.com/handling-promise-rejection-with-a-catch-while-using-await-in-javascript
	// Reference:https://stackoverflow.com/questions/10261986/how-to-detect-string-which-contains-only-spaces
	// Reference:https://stuk.github.io/jszip/documentation/api_jszip
	// Reference:https://github.com/ubccpsc/310/blob/main/resources/readings/cookbooks/async.md#singlePromise
	// Reference: https://itecnote.com/tecnote/javascript-extracting-zipped-files-using-jszip-in-javascript
	// Reference: https://www.reddit.com/r/learnjavascript/comments/pn75j2/having_trouble_understanding_promises/

	// Should return a Promise fulfill with a string array,containing the ids of all currently added datasets upon a successful add.
	// OR reject with an InsightError describing the error.

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let jsZip = new JSZip();
		let dataList: ISection[] | IRoom[] = [];
		let datasets = await loadFromDisk();
		// let isValid;


		// Check if ID is valid
		if (id.includes("_") || (id.trim().length === 0) || this.hasDuplicates(id, datasets)) {
			return Promise.reject(new InsightError("Invalid id"));
		}

		// Check is kind is valid(either sections or rooms)
		if (kind !== InsightDatasetKind.Sections && kind !== InsightDatasetKind.Rooms) {
			return Promise.reject(new InsightError("Invalid kind"));
		}

		// Check if content is valid
		try {
			const zip = await jsZip.loadAsync(content, {base64: true});
			if (kind === InsightDatasetKind.Sections) {
				await dealwithSection(id, zip, dataList);
			} else if (kind === InsightDatasetKind.Rooms) {
				await dealwithRoom(id, zip, dataList);
			}
			//
			// if(!isValid){
			// 	return Promise.reject(new InsightError("Rejected with invalid content"));
			// } else {
			let idList = this.addtoDataSets(id, dataList, datasets); // add this dataset to datasets
			await saveToDisk(id, dataList, kind); // Save the newly added dataset to disk
			return Promise.resolve(idList); // return the fulfilled promise
			// }
		} catch (err) {
			return Promise.reject(new InsightError("Parse - ERROR; err: " + err));
		}

	}

	// Create the new Dataset  and add to DataSet List
// The promise should fulfill with a string array, containing the ids of all currently added datasets upon a successful add.
	private addtoDataSets(id: string, dataList: ISection[] | IRoom[], datasets: Map<string, ISection[] | IRoom[]>) {
		let idList: string[] = [];
		datasets.set(id, dataList);
		for (let key of datasets.keys()) {
			idList.push(key);
		}
		return idList;
	}

	private hasDuplicates(id: string, datasets: Map<string, ISection[] | IRoom[]>) {
		// IN map,if the specified key exists, then the value is returned. Otherwise, undefined is returned.
		if (datasets.get(id) !== undefined) {
			return true;
		} else {
			return false;
		}
	}

	// The promise should fulfill the id of the dataset that was removed.
	// The promise should reject with a NotFoundError (if a valid id was not yet added)
	// or an InsightError (invalid id or any other source of failure) describing the error.
	// Should also delete from disks and memory caches
	public async removeDataset(id: string): Promise<string> {
		let datasets = await loadFromDisk();
		try {
			if (id.includes("_") || (!id.trim().length)) {
				return Promise.reject(new InsightError("Invalid id"));
			}
			if (datasets.get(id) === undefined) {
				return Promise.reject(new NotFoundError("Cannot find the id in our datasets"));
			}
			// remove the dataset from datasets
			datasets.delete(id);
			// remove the dataset from disk
			await fs.remove("./data/" + id + ".json");
			return Promise.resolve(id);
		} catch (err) {
			console.log(err);
			return Promise.reject(new InsightError("ERROR; err: " + err));
		}
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		try {
			const jsonString: string = JSON.stringify(query);
			const parsedQuery = JSON.parse(jsonString);
		} catch (error) {
			return Promise.reject(new InsightError());
		}
		let jsonString: string = JSON.stringify(query);
		let parsed: any = JSON.parse(jsonString);
		let parsedQuery = new Query();
		let query2 = new Query2();
		const isValid = await parsedQuery.isValidQuery(parsedQuery, parsed, query2);
		if (!isValid) {
			return Promise.reject(new InsightError("InsightError"));
		}
		if (!Query2.order_in_columns(query2)) {
			return Promise.reject(new InsightError("OrderNotInColumns"));
		}
		if (!Query2.columns_in_groups_apply(query2)) {
			return Promise.reject(new InsightError("Columns not in groups or apply"));
		}
		Query2.columns_to_col(query2);
		let datasets = await loadFromDisk();
		let dataset = findDataset(query2, datasets);
		if (dataset === undefined) {
			return Promise.reject(new InsightError("DatasetNotFound"));
		}
		let result: InsightResult[] = [];
		try {
			result = filterResult(parsed.WHERE, query2, dataset, 0);
		} catch (e) {
			if (e instanceof ResultTooLargeError) {
				return Promise.reject(e);
			} else {
				return Promise.reject(new InsightError("Unkonwn error"));
			}
		}
		// Remove uuid for comparison
		result = removeAllUuid(result);
		let result2: InsightResult[][] = [];
		result = groupAndapply(result,result2,query2);
		// Sort in ORDER (query2.sort)
		result = sortResult(result, query2);
		if (result.length > 5000) {
			return Promise.reject(new ResultTooLargeError("Over 5000 results"));
		} else {
			return Promise.resolve(result);
		}
	}

	// returns an array of currently added datasets.
	// Each element of the array should describe a dataset following the InsightDataset interface
	// which contains the dataset id, kind, and number of rows.

	// Reference: https://stackoverflow.com/questions/13142635/how-can-i-create-an-object-based-on-an-interface-file-definition-in-typescript
	public async listDatasets(): Promise<InsightDataset[]> {
		let result: InsightDataset[] = [];
		let datasets: Map<string, ISection[] | IRoom[]> = await loadFromDisk();
		// if (datasets.size === 0){
		// 	return Promise.resolve(result);
		// }
		let kind = this.getKind(datasets);
		// let kind = InsightDatasetKind.Sections;
		for (let id of datasets.keys()) {
			let numRows = datasets.get(id)?.length || 0;
			const dataset: InsightDataset = {
				id: id,
				kind: kind,
				numRows: numRows
			};
			result.push(dataset);
		}
		// }

		return Promise.resolve(result);
	}

	private getKind(datasets: Map<string, ISection[] | IRoom[]>) {
		for (let value of datasets.values()) {
			if (value[1] === null || value[1] === undefined) {
				return InsightDatasetKind.Rooms;
			} else if("uuid" in value[1]){
				return InsightDatasetKind.Sections;
			}
		}
		return InsightDatasetKind.Rooms;
	}
}


