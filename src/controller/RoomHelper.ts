import JSZip from "jszip";
import {parse} from "parse5";
import {Document, Element} from "parse5/dist/tree-adapters/default";
import {InsightError} from "./IInsightFacade";
import {IRoom} from "./IRoom";
import * as http from "http";
import {ISection} from "./ISection";


const IMAGE = "views-field views-field-field-building-image";
const FULLNAME = "views-field views-field-title";
const SHORTNAME = "views-field views-field-field-building-code";
const ADDRESS = "views-field views-field-field-building-address";
const FURNITURE = "views-field views-field-field-room-furniture";
const TYPE = "views-field views-field-field-room-type";
const SEATS = "views-field views-field-field-room-capacity";
const NUMBER = "views-field views-field-field-room-number";


// Reference: https://stackoverflow.com/questions/37699320/iterating-over-typescript-map
async function dealwithRoom(id: string, zip: JSZip, dataList: ISection[] | IRoom[]) {
	let tbodyNode: any,buildingList = new Map<string, IRoom>(), indexFile = zip.file("index.htm");
	if (indexFile === null) {
		return Promise.reject(new InsightError("Rejected with invalid index.htm"));
	}
	let index = await indexFile.async("string");
	let root: Document = parse(index);
	// check if there exists a valid building table
	tbodyNode = findtbodyNode(root);
	// 先从building table获取关于building的data
	for (let child of tbodyNode.childNodes) {
		if (child.nodeName === "tr") { // Each tr represent a building
			buildingList = getBuildingData(child, buildingList);
			// console.log(buildingList);
		}
	}
	let buildingPromises: Map<number,Promise<string>> = new Map<number,Promise<string>>(), i = 0 , j = 0,rooms = [];
	buildingList.forEach((building: IRoom, filePath: string) => {
		let file = zip.file(filePath);
		if (file !== null) {
			buildingPromises.set(i,file.async("string"));
		}
		i++;
	});
	let buildingFiles = await Promise.all(buildingPromises.values());
	for(let buildingfile of buildingFiles){
		let node = parse(buildingfile);
		let building = Array.from(buildingList.values())[j],bodynode: any;
		for (let child of node.childNodes) {
			if (child.nodeName === "html") {
				bodynode = findRoomTable(child);
			}
		}
		if (bodynode !== null) {
			for (let child of bodynode.childNodes) {
				if (child.nodeName === "tr") { // Each tr represent a room
					let info = getRoomData(child, building);
					rooms.push(info);

				}
			}
		}
		j++;
	}
	let roomData = await Promise.all(rooms);
	for (let room of roomData) {
		if (validateRoom(room)) {
			(dataList as IRoom[]).push(room);
			// console.log(dataList);
		}
	}
	if (dataList.length === 0) {
		return Promise.reject(new InsightError("Rejected with invalid content"));
	}
}

// function dealwithRoomHelper(promises: Array<Promise<IRoom>>, dataList: ISection[] | IRoom[]) {
// 	// console.log(promises);
// 	return Promise.all(promises)
// 		.then((rooms) => {
// 			// console.log(rooms);
// 			for (let room of rooms) {
// 				if (validateRoom(room)) {
// 					(dataList as IRoom[]).push(room);
// 					// console.log(dataList);
// 				}
// 			}
// 			return Promise.resolve(dataList);
// 		}
// 		).catch((e) => {
// 			return Promise.reject(new InsightError(e));
// 		});
// }

function findtbodyNode(root: any) {
	// check if there exists a valid building table
	let tbodyNode;
	for (let node of root.childNodes) {
		if (node.nodeName === "html") {
			tbodyNode = findBuildingTable(node);
		}
	}
	if (tbodyNode === null) {
		return Promise.reject(new InsightError("Rejected with invalid building table in index.htm"));
	} else {
		return tbodyNode;
	}
}

function validateRoom(room: IRoom) {
	return !((room.fullname === null) || (room.shortname === null) || (room.number === null) || (room.name === null)
		|| (room.address === null) || (room.lat === null) || (room.lon === null) || (room.seats === null)
		|| (room.type === null) || (room.furniture === null) || (room.href === null));
}

// find one  <td> element with a valid class,

function findBuildingTable(root: any): any {
	let result;
	// Base case: If the root is null, return null
	if (root === null || root === undefined) {
		return null;
	}

	// Check if the current node is the target node (tbody)
	if (root.nodeName === "tbody") {
		return root;
	}

	// If the current node has child nodes, recursively search them
	if (root.childNodes !== null && root.childNodes !== undefined) {
		for (let child of root.childNodes) {
			let node = findBuildingTable(child); // Recursively search child nodes
			if (node !== null && node !== undefined) {
				result = node; // Return the first found tbody node
			}
		}
	}

	// No tbody node found in children, continue searching
	if (result !== null && result !== undefined) {
		for (let child of result.childNodes) {
			if (child.nodeName === "tr") {
				for (let tdNode of child.childNodes) {
					// Check if the child node is a td element and has the required class
					if (tdNode.nodeName === "td" && tdNode.attrs && tdNode.attrs[0].value === IMAGE) {
						return result; // Return the parent node (tbody) if td with class IMAGE found
					}
				}
			}
		}
	}

	// If tbody node not found in children, return null
	return null;
}


function findRoomTable(root: any): any {
	let result;
	// Base case: If the root is null, return null
	if (root === null || root === undefined) {
		return null;
	}

	// Check if the current node is the target node (tbody)
	if (root.nodeName === "tbody") {
		return root;
	}

	// If the current node has child nodes, recursively search them
	if (root.childNodes !== null && root.childNodes !== undefined) {
		for (let child of root.childNodes) {
			let node = findRoomTable(child); // Recursively search child nodes
			if (node !== null && node !== undefined) {
				result = node;
				// console.log(result);// Return the first found tbody node
			}
		}
	}

	// No tbody node found in children, continue searching
	if (result !== null && result !== undefined) {
		for (let child of result.childNodes) {
			if (child.nodeName === "tr") {
				for (let tdNode of child.childNodes) {
					// Check if the child node is a td element and has the required class
					if (tdNode.nodeName === "td" && tdNode.attrs && tdNode.attrs[0].value === NUMBER) {
						// console.log(result);
						return result; // Return the parent node (tbody) if td with class IMAGE found
					}
				}
			}
		}
	}
	return null;
}

function getBuildingData(rowNode: any, buildingList: Map<string, IRoom>) {
	let building: IRoom = {} as IRoom, filePath;
	// get data of fullname.shortname.address and href
	for (let child of rowNode.childNodes) {
		if (child.nodeName === "td") {
			// getRoomInfo(child, building);
			let value = child.attrs[0].value;

			switch (value) {
				case SHORTNAME: {
					building.shortname = getText(child);
					break;
				}
				case FULLNAME: {
					building.fullname = getfullName(child);
					// filePath = child.childNodes[1].attrs[0].value;
					filePath = getFilePath(child, building);
					break;
				}
				case ADDRESS: {
					building.address = getText(child);
					break;
				}
			}
		}
	}
	// filePath = getFilePath(child, building);
	buildingList.set(filePath, building);
	return buildingList;
}

async function getRoomData(rowNode: any, building: IRoom) {
	building = await getGeolocation(building);
	let room: IRoom = {...building};
	for (let child of rowNode.childNodes) {
		if (child.nodeName === "td") {
			let value = child.attrs[0].value;

			switch (value) {
				case FURNITURE: {
					room.furniture = getText(child);
					break;

				}
				case SEATS: {
					room.seats = Number(getText(child));
					break;
				}
				case TYPE: {
					room.type = getText(child);
					break;
				}
				case NUMBER: {
					room.href = gethref(child);
					room.number = getNumber(child);
					room.name = room.shortname + "_" + room.number;
				}
			}
		}
	}
	return Promise.resolve(room);
	// return room;

}


// node is td
function getFilePath(node: any, room: IRoom) {
	let filePath;
	if (node.attrs[0].value === FULLNAME) {
		let aNode = getaNode(node);
		filePath = (aNode !== null) ? (aNode.attrs[0].value).substring(2) : "";
	}
	return filePath;
}

function getValue(value: string): string {
	return value.replace("\n", "").trim();
}

function getaNode(node: any) {
	for (let child of node.childNodes) {
		if (child.nodeName === "a") {
			return child;
		}
	}
}

function getText(node: any) {
	for (let child of node.childNodes) {
		if (child.nodeName === "#text") { // find "text" node
			return getValue(child.value);
		}
	}
	return "";
}

function getfullName(node: any) {
	let aNode = getaNode(node);
	if (aNode !== null) {
		return getText(aNode);
	} else {
		return "";
	}
}

function gethref(node: any) {
	let aNode = getaNode(node);
	if (aNode !== null) {
		return aNode.attrs[0].value;
	} else {
		return "";
	}
}

function getNumber(node: any) {
	let aNode = getaNode(node);
	if (aNode !== null) {
		return getText(aNode);
	} else {
		return "";
	}

}

// get geolocation of room
// Reference:https://nodejs.org/api/http.html#httpgeturl-options-callback
function getGeolocation(room: IRoom) {
	let address = room.address;
	let encodeAddress = encodeURIComponent(address);
	let url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team077/" + encodeAddress;
	return new Promise<any>((resolve, reject) => {
		http.get(url, (res) => {
			const {statusCode} = res;
			const contentType = res.headers["content-type"]!;
			let error;
			// Any 2xx status code signals a successful response but
			// here we're only checking for 200.
			if (statusCode !== 200) {
				error = new Error("Request Failed.\n" +
					`Status Code: ${statusCode}`);
			} else if (!/^application\/json/.test(contentType)) {
				error = new Error("Invalid content-type.\n" +
					`Expected application/json but received ${contentType}`);
			}
			if (error) {
				console.error(error.message);
				// Consume response data to free up memory
				res.resume();
				return;
			}
			// console.log(res);
			res.setEncoding("utf8");
			let rawData = "";
			res.on("data", (chunk) => {
				rawData += chunk;
			});
			res.on("end", () => {
				try {
					let parsedData = JSON.parse(rawData);
					if (parsedData.error === undefined) {
						room.lat = parsedData.lat;
						room.lon = parsedData.lon;
						// console.log(room);
						return resolve(room);
					}
				} catch (e) { /* empty */
				}
			});
		}).on("error", (e) => {
			console.log(`Got error: ${e.message}`);
		});
	});
}


export {dealwithRoom};
