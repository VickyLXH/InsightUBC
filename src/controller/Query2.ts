import {
	IInsightFacade,
	InsightDatasetKind,
	InsightDataset,
	InsightResult,
	InsightError,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import {ISection} from "./ISection";
import {IRoom} from "./IRoom";
import {Query, Query2, Filter,
	LogicComparison, isValidMkey,
	isValidFilter, filterResult} from "./Query";
import {MComparison} from "./Query3";
import {isValidApplykey, Order} from "./Query4";
export class SComparison {
	private IS?: string;
	public static isValidSComparison(sc: any, query2: Query2) {
		let innerObj;
		let innerS: string;
		let innerV: string;
		if (sc.IS !== undefined) {
			innerObj = sc["IS"];
			innerS = Object.keys(innerObj)[0];
			innerV = innerObj[innerS];
			if (innerS === undefined || innerV === undefined) {
				return false;
			}
			if (innerV.length === 0) {
				return false;
			}
			if (typeof innerV !== "string") {
				return false;
			}
			if (typeof innerS !== "string") {
				return false;
			}
			if (innerV[0] === "*") {
				innerV = innerV.substring(1);
			}
			if (innerV[innerV.length - 1] === "*") {
				innerV = innerV.substring(0, innerV.length - 1);
			}

			return isValidSkey(innerS, query2) && isValidInputString(innerV);
		} else {
			return false;
		}
	}

	public static filterSComparison(p: any, query2: Query2, data: ISection[] | IRoom[], count: number) {
		let result: InsightResult[] = [];
		let innerObj = p["IS"];
		let inner = Object.keys(innerObj)[0];
		let innerS = inner.split("_");
		let innerV = innerObj[inner];
		for (const s of data) {
			if (this.containString(s[innerS[1]] as string, innerV)) {
				addResult(s,result,query2);
				if (count === 0 && result.length > 5000) {
					throw new ResultTooLargeError("> 5000");
				}
			}
		}
		return result;
	}

	public static filterNotIS(p: any, query2: Query2, data: ISection[] | IRoom[], count: number) {
		let result: InsightResult[] = [];
		let innerObj = p["IS"];
		let inner = Object.keys(innerObj)[0];
		let innerS = inner.split("_");
		let innerV = innerObj[inner];
		for (const s of data) {
			if (!this.containString(s[innerS[1]] as string, innerV)) {
				addResult(s,result,query2);
			}
		}
		return result;
	}

	public static containString(str: string, innerV: string) {
		if (!innerV.includes("*")) {
			return str === innerV;
		} else if (innerV[0] === "*" && innerV[innerV.length - 1] === "*") {
			return str.includes(innerV.substring(1,innerV.length - 1));
		} else if (innerV[0] === "*") {
			return str.endsWith(innerV.substring(1));
		} else if (innerV[innerV.length - 1] === "*") {
			return str.startsWith(innerV.substring(0,innerV.length - 1));
		}
	}
}

export function isValidSkey(str: string, query2: Query2): boolean {
	let parts = str.split("_");
	let sField = ["dept", "instructor", "id", "title", "uuid","fullname","shortname","number","name","address","type",
		"furniture","href"];
	if (!query2.name) {
		// sfield correct
		if (sField.includes(parts[1])) {
			query2.name = parts[0];
			return true;
		}
	} else {
		if (query2.name === parts[0]) {
			if (sField.includes(parts[1])) {
				return true;
			}
		}
	}
	return false;
}

export function isValidInputString(str: string): boolean {
	return !str.includes("*");
}

export class Negation {
	private NOT?: Filter;
	public static isValidNegation(n: any, query2: Query2): boolean {
		if (!n.NOT) {
			return false;
		} else {
			return isValidFilter(n.NOT,query2);
		}
	}

	public static filterNegation(p: any, query2: Query2, data: ISection[] | IRoom[], count: number) {
		let result: InsightResult[] = [];
		if (p.NOT.NOT) {
			result = filterResult(p.NOT.NOT,query2,data,count);
		} else if (p.NOT.AND) {
			result = LogicComparison.filterNotAnd(p.NOT,query2,data,count + 1);
		} else if (p.NOT.OR) {
			result = LogicComparison.filterNotOr(p.NOT,query2,data,count + 1);
		} else if (p.NOT.IS) {
			result = SComparison.filterNotIS(p.NOT, query2, data, count + 1);
		} else if (p.NOT.GT) {
			result = MComparison.filterNotGT(p.NOT, query2, data, count + 1);
		} else if (p.NOT.EQ) {
			result = MComparison.filterNotEQ(p.NOT, query2, data, count + 1);
		} else if (p.NOT.LT) {
			result = MComparison.filterNotLT(p.NOT, query2, data, count + 1);
		}

		if (count === 0 && result.length > 5000) {
			throw new ResultTooLargeError("> 5000");
		}
		return result;
	}


}
export class EmptyClass {

	public static isValidEmptyClass(e: any, query2: Query2) {
		return true;
	}

	public static filterEmptyClass(p: any, query2: Query2, data: ISection[] | IRoom[], count: number) {
		let result: InsightResult[] = [];
		if (data.length > 5000 && count === 0) {
			throw new ResultTooLargeError("Result too large");
		}
		for (const s of data) {
			addResult(s,result,query2);
		}
		return result;
	}
}

export function addResult(s: ISection | IRoom, r: InsightResult[], query2: Query2) {

	let result: InsightResult = {};
	if (s["uuid"] !== undefined) {
		result[query2.name + "_" + "uuid"] = s["uuid"];
	} else if (s["name"] !== undefined){
		result[query2.name + "_" + "name"] = s["name"];
	}
	for (const c of query2.col) {
		result[query2.name + "_" + c] = s[c];
	}
	r.push(result);
	return;
}

export class Options {
	private	COLUMNS?: string[];
	private ORDER?: Order | string;
	public static isValidOptions(o: any, query2: Query2): boolean {
		if ((Array.isArray(o.COLUMNS) && o.COLUMNS.length === 0)
			|| o.COLUMNS === undefined) {
			return false;
		} else {
			for (const column of o.COLUMNS) {
				query2.columns.push(column);
				if ((!isValidMkey(column,query2)) && (!isValidSkey(column,query2)) &&
				(!isValidApplykey(column,query2))) {
					return false;
				}
			}
			if (o.ORDER === undefined) {
				return true;
			} else if (Object.keys(o.ORDER).length === 0) {
				return false;
			} else {
				// Check order
				if (Object.keys(o.ORDER).length === 2 && Object.keys(o.ORDER)[0] === "dir" &&
				Object.keys(o.ORDER)[1] === "keys") {
					return Order.isValidOrder(o.ORDER,query2);
				} else if (isValidMkey(o.ORDER,query2) || isValidSkey(o.ORDER,query2) ||
				isValidApplykey(o.ORDER, query2)){
					query2.sort.push(o.ORDER);
					return true;
				} else {
					return false;
				}
			}
		}
		return true;
	}
}
