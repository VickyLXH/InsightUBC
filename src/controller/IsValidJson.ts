import {ISection} from "./ISection";
import {IRoom} from "./IRoom";
import {Query2} from "./Query";
import {InsightResult} from "./IInsightFacade";
const Decimal = require("decimal.js");

export function findDataset(query2: Query2,datasets: Map<string, IRoom[] | ISection[]>) {

	for (const [id,sections] of datasets) {
		if (id  === query2.name) {

			return sections;
		}
	}
	return undefined;
}
export function sortAscending(r: InsightResult[], query2: Query2): InsightResult[] {
	if (query2.sort.length === 0) {
		return r;
	}
	const n = r.length;
	for (let i = 0; i < n - 1; i++) {
		for (let j = 0; j < n - i - 1; j++) {
			const keyA = r[j][query2.sort[0]];
			const keyB = r[j + 1][query2.sort[0]];
			let compare = compareKeys(keyA, keyB);
			if (compare === 0 && query2.sort.length > 1) {
				for (let k = 1; k < query2.sort.length; k++) {
					let keyX = r[j][query2.sort[k]];
					let keyY = r[j + 1][query2.sort[k]];
					let result = compareKeys(keyX,keyY);
					if (result !== 0) {
						compare = result;
						break;
					}
				}
			}
			if (compare > 0) {
				const temp = r[j];
				r[j] = r[j + 1];
				r[j + 1] = temp;
			}
		}
	}
	return r;
}
export function sortDescending(r: InsightResult[], query2: Query2): InsightResult[] {
	if (query2.sort.length === 0) {
		return r;
	}
	const n = r.length;
	for (let i = 0; i < n - 1; i++) {
		for (let j = 0; j < n - i - 1; j++) {
			const keyA = r[j][query2.sort[0]];
			const keyB = r[j + 1][query2.sort[0]];
			let compare = compareKeys(keyA, keyB);
			if (compare === 0 && query2.sort.length > 1) {
				for (let k = 1; k < query2.sort.length; k++) {
					let keyX = r[j][query2.sort[k]];
					let keyY = r[j + 1][query2.sort[k]];
					let result = compareKeys(keyX,keyY);
					if (result !== 0) {
						compare = result;
						break;
					}
				}
			}
			if (compare < 0) {
				const temp = r[j];
				r[j] = r[j + 1];
				r[j + 1] = temp;
			}
		}
	}
	return r;
}


export function sortResult(r: InsightResult[], query2: Query2): InsightResult[] {
	if (query2.dir === "" || query2.dir === "UP") {
		return sortAscending(r,query2);
	} else {
		return sortDescending(r,query2);
	}

}
export function removeAllUuid(r: InsightResult[]): InsightResult[] {
	return r.map((result) => {
		const keys = Object.keys(result);
		if (keys.length > 0) {
			const {[keys[0]]: removedKey, ...rest} = result;
			return rest;
		}
		return result;
	});
}

export function compareKeys(keyA: string | number, keyB: string | number): number {
	if (typeof keyA === "number" && typeof keyB === "number") {
		return keyA - keyB;
	} else {
		let a: string = keyA as string;
		let b: string = keyB as string;
		return a < b ? -1 : a > b ? 1 : 0;
	}

}
export function groupAndapply(result: InsightResult[], result2: InsightResult[][], query2: Query2): InsightResult[] {

	if (query2.group.length === 0) {
		return result;
	} else {
		result2 = groupResult(result,result2,query2);
		let newResult: InsightResult[] = [];
		newResult = applyResult(newResult,result2,query2);
		return newResult;
	}
}
export function groupResult(result: InsightResult[], result2: InsightResult[][], query2: Query2): InsightResult[][] {
	for (const l of result) {
		let pushed = false;
		for (const j of result2){
			if (all_matches(j[0],l,query2)) {
				j.push(l);
				pushed = true;
				break;
			}
		}
		if (!pushed) {
			let x: InsightResult[] = [];
			x.push(l);
			result2.push(x);
		}
	}

	return result2;
}

export function all_matches(i: InsightResult, l: InsightResult, query2: Query2): boolean {
	for (const g of query2.group) {
		if (i[g] !== l[g]) {
			return false;
		}
	}
	return true;
}

export function index_of_result2(groupRes: any[], filter: any[][]): number {
	for (let j = 0; j < filter.length; j++) {
		let list = filter[j];
		let result = true;
		for (let i = 0; i < list.length; i++) {
			if (list[i] !== groupRes[i]) {
				result = false;
			}
		}
		if (result) {
			return j;
		}
	}
	return -1;
}

export function applyResult(result: InsightResult[], result2: InsightResult[][], query2: Query2): InsightResult[] {
	/* for (let x = 0; x < result2.length; x++) {
		console.log("list " + x.toString());
		for (const y of result2[x]) {
			console.log(y);
		}
	} */
	let final: InsightResult[] = [];
	for (const i of result2) {
		let r: InsightResult = {};
		for (const str of query2.columns){
			// if it is a KEY
			if (str.includes("_")) {
				r[str] = i[0][str];
				// console.log(str + r[str]);
			} else {
				let s = query2.apply.get(str);
				if (s !== undefined) {
					// console.log(s);  AVG_sections_avg
					let x = findApply(i,s.toString());
					r[str] = x;
				}
			}
		}
		final.push(r);
	}
	return final;
}

export function findApply(result: InsightResult[], str: string): number {
	let parts = str.split("_");
	let token = parts[0];
	let key = parts[1] + "_" + parts[2];

	if (token === "COUNT") {
		let pResult: Array<string | number> = [];
		for (const i of result) {
			if (!pResult.includes(i[key])) {
				pResult.push(i[key]);
			}
		}
		return pResult.length;
	} else {
		let pResult: number[] = [];
		for (const i of result) {
			pResult.push(Number(i[key]));

		}
		let finalResult: number = applyToken(token, pResult);
		return finalResult;
	}

}

export function applyToken(token: string, result: number[]): number {
	if (token === "MAX") {
		let total: number = result[0];
		for (const n of result) {
			if (n > total) {
				total = n;
			}
		}
		return total;
	} else if (token === "MIN") {
		let total: number = result[0];
		for (const n of result) {
			if (n < total) {
				total = n;
			}
		}
		return total;
	} else if (token === "SUM") {
		let total: number = 0;
		for (const n of result) {
			total = total + n;
		}
		total = Number(total.toFixed(2));
		return total;
	} else {
		let total = new Decimal("0");
		for (const n of result) {
			let decimal = new Decimal(n);
			total = total.add(decimal);
		}
		let avg = total.toNumber() / result.length;
		let res = Number(avg.toFixed(2));
		return res;
	}
}
