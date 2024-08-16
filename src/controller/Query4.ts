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
import {Query, Query2, Filter,
	LogicComparison, isValidMkey,
	isValidFilter, filterResult} from "./Query";
import {SComparison,
	Negation,
	EmptyClass,
	Options,
	addResult,
	isValidSkey} from "./Query2";
import {MComparison} from "./Query3";

export function isValidApplykey(s: string, query2: Query2): boolean {
	return s.length > 0 && !s.includes("_");
}
export class Order {
	private dir?: string;
	private keys?: string[];

	public static isValidOrder(o: any, query2: Query2): boolean {
		if (o.dir === undefined || o.keys === undefined) {
			return false;
		} else {
			if (o.dir !== "UP" && o.dir !== "DOWN") {
				return false;
			}
			query2.dir = o.dir;
			// dir is valid, check keys
			if ((Array.isArray(o.keys) && o.keys.length === 0)) {
				return false;
			}
			for (const s of o.keys) {
				if (!isValidMkey(s,query2) && !isValidSkey(s,query2) && !isValidApplykey(s,query2)) {
					return false;
				}
				query2.sort.push(s);
			}
		}
		return true;
	}
}

export class Transformations {
	private GROUP?: string[]; // KEY_LIST
	private APPLY?: ApplyRule[];

	public static isValidT(t: any, query2: Query2): boolean {
		if (t.GROUP === undefined || t.APPLY === undefined) {
			return false;
		}
		// check group first
		if (Array.isArray(t.GROUP) && t.GROUP.length > 0) {
			for (const s of t.GROUP) {
				if (!isValidMkey(s,query2) && !isValidSkey(s,query2)) {
					return false;
				}
				query2.group.push(s);
			}
		} else {
			return false;
		}
		// check apply
		if (Array.isArray(t.APPLY)) {
			for (const a of t.APPLY) {
				if (!ApplyRule.isValidApplyRule(a, query2)){
					return false;
				}
				let akey = Object.keys(a)[0];
				// applykey should be unique
				if (query2.apply.has(akey)) {
					return false;
				}
				let str: string = Object.keys(a[akey])[0] + "_" + Object.values(a[akey])[0];
				query2.apply.set(akey,str);
			}
		} else {
			return false;
		}
		return true;
	}
}

export class ApplyRule {
	[key: string]: ApplyObject; // APPLYTOKEN : KEY

	public static isValidApplyRule(a: any, query2: Query2): boolean {
		if (Object.keys(a).length !== 1) {
			return false;
		}
		let key = Object.keys(a)[0];
		if (!isValidApplykey(key,query2)) {
			return false;
		} else {
			return ApplyObject.isValidApplyObject(a[key],query2);
		}
	}
}

export class ApplyObject {
	[key: string]: string;

	public static isValidApplyObject(o: any, query2: Query2): boolean {
		let token = Object.keys(o);
		if (token.length !== 1) {
			return false;
		}
		let tokenListn = ["MAX", "MIN", "AVG", "SUM"];
		if (!tokenListn.includes(token[0]) && token[0] !== "COUNT") {
			return false;
		}
		if (tokenListn.includes(token[0]) && !isValidMkey(o[token[0]],query2)) {
			return false;
		}
		if (!isValidMkey(o[token[0]], query2) && !isValidSkey(o[token[0]], query2)) {
			return false;
		}
		return true;
	}
}
