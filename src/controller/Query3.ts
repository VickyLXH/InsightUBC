
import {Query, Query2, Filter,
	LogicComparison, isValidMkey,
	isValidFilter, filterResult} from "./Query";
import {
	IInsightFacade,
	InsightDatasetKind,
	InsightDataset,
	InsightResult,
	InsightError,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import {SComparison,
	Negation,
	EmptyClass,
	Options,
	addResult} from "./Query2";
import {ISection} from "./ISection";
import {IRoom} from "./IRoom";

export class MComparison {
	private LT?: string; // {"mkey": number}
	private GT?: string;
	private EQ?: string;

	public static isValidMComparison(mc: any, query2: Query2) {
		let innerObj;
		let innerM: string;
		let innerV: number;
		if (mc.LT && !mc.GT && !mc.EQ) {
			innerObj = mc["LT"];
		} else if (!mc.LT && mc.GT && !mc.EQ) {
			innerObj = mc["GT"];
		} else {
			innerObj = mc["EQ"];
		}
		innerM = Object.keys(innerObj)[0];
		innerV = innerObj[innerM];
		if (innerM === undefined || innerV === undefined) {
			return false;
		}
		if (Array.isArray(innerV) && innerV.length === 0) {
			return false;
		}
		if (typeof innerV !== "number") {
			return false;
		}
		return isValidMkey(innerM, query2);
// 		if (!isNaN(Number(innerV))) {
// 			return isValidMkey(innerM, query2);
// 		} else {
// 			return false;
// 		}

	}

	public static filterMComparison(p: any, query2: Query2, data: ISection[] | IRoom[],count: number) {
		let result: InsightResult[] = [];
		let innerObj;
		let innerM;
		let innerV: number;
		let inner;
		if (p.LT) {
			innerObj = p["LT"];
			inner = Object.keys(innerObj)[0];
			innerM = inner.split("_"); // mfield
			for (const s of data) {
				if (s[innerM[1]] < innerObj[inner]) {
					addResult(s,result,query2);
					if (count === 0 && result.length > 5000) {
						throw new ResultTooLargeError("> 5000");
					}
				}
			}
		} else if (p.GT) {
			innerObj = p["GT"];
			inner = Object.keys(innerObj)[0];
			innerM = inner.split("_"); // mfield
			for (const s of data) {
				if (s[innerM[1]] > innerObj[inner]) {
					addResult(s,result,query2);
					if (count === 0 && result.length > 5000) {
						throw new ResultTooLargeError("> 5000");
					}
				}
			}
		} else if (p.EQ) {
			innerObj = p["EQ"];
			inner = Object.keys(innerObj)[0];
			innerM = inner.split("_"); // mfield
			innerV = innerObj[inner];
			for (const s of data) {
				if (s[innerM[1]] === innerV) {
					addResult(s,result,query2);
					if (count === 0 && result.length > 5000) {
						throw new ResultTooLargeError("> 5000");
					}
				}
			}
		}
		return result;
	}

	public static filterNotLT(p: any,query2: Query2,data: ISection[] | IRoom[],count: number) {
		let result: InsightResult[] = [];
		let innerObj = p["LT"];
		let inner = Object.keys(innerObj)[0];
		let innerM = inner.split("_"); // mfield
		let innerV = innerObj[inner];
		for (const s of data) {
			if (s[innerM[1]] >= innerV) {
				addResult(s,result,query2);
				if (count === 0 && result.length > 5000) {
					throw new ResultTooLargeError("> 5000");
				}
			}
		}
		return result;
	}

	public static filterNotEQ(p: any,query2: Query2,data: ISection[] | IRoom[],count: number) {
		let result: InsightResult[] = [];
		let innerObj = p["EQ"];
		let inner = Object.keys(innerObj)[0];
		let innerM = inner.split("_"); // mfield
		let innerV = innerObj[inner];
		for (const s of data) {
			if (s[innerM[1]] !== innerV) {
				addResult(s,result,query2);
				if (count === 0 && result.length > 5000) {
					throw new ResultTooLargeError("> 5000");
				}
			}
		}
		return result;
	}

	public static filterNotGT(p: any,query2: Query2,data: ISection[] | IRoom[],count: number) {
		let result: InsightResult[] = [];
		let innerObj = p["GT"];
		let inner = Object.keys(innerObj)[0];
		let innerM = inner.split("_"); // mfield
		let innerV = innerObj[inner];
		for (const s of data) {
			if (s[innerM[1]] <= innerV) {
				addResult(s,result,query2);
				if (count === 0 && result.length > 5000) {
					throw new ResultTooLargeError("> 5000");
				}
			}
		}
		return result;
	}

}
