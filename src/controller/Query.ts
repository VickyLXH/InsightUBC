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
import {SComparison,
	Negation,
	EmptyClass,
	Options,
	addResult} from "./Query2";
import {MComparison} from "./Query3";
import {Transformations, ApplyObject} from "./Query4";

export class Query {
	private WHERE?: Filter;
	private OPTIONS?: Options;
	private TRANSFORMATIONS?: Transformations;

	public isValidQuery(query: Query, p: any, query2: Query2) {
		if (Object.keys(p).length > 3) {
			return false;
		}
		if (p.WHERE === undefined) {
			return false;
		}
		if (p.OPTIONS === undefined) {
			return false;
		}
		if (p.TRANSFORMATIONS === undefined){
			return isValidFilter(p.WHERE,query2) && Options.isValidOptions(p.OPTIONS,query2);
		} else {
			return isValidFilter(p.WHERE,query2) && Options.isValidOptions(p.OPTIONS,query2) &&
			Transformations.isValidT(p.TRANSFORMATIONS,query2); // TODO
		}


	}
}

export class Query2 {
	public columns: string[] = []; // List of string
	public sort: string[] = []; // String for sorting
	public name?: string; // String
	public num: number = -1;
	public col: string[] = [];
	public dir: string = "";
	public group: string[] = [];
	public apply = new Map<string, string>(); // <applykey, applytoken_key>

	public static order_in_columns(query2: Query2): boolean {
		if (query2.sort.length === 0) {
			return true;
		}
		for (const s of query2.sort) {
			if (query2.columns.includes(s) === false) {
				return false;
			}
		}
		return true;
	}

	public static columns_to_col(query2: Query2) {
		let parts: string[];
		for (const c of query2.columns) {
			let str: string = c;
			// check if it is applykey
			if (!c.includes("_")) {
				if (query2.apply.has(c)){
					let applyValue = query2.apply.get(c);
					if (typeof applyValue === "string") {
						str = applyValue.split("_")[2];
					}
				}
				query2.col.push(str);
			} else {
				parts = str.split("_");
				query2.col.push(parts[1]);
			}

		}
	}

	public static columns_in_groups_apply(query2: Query2): boolean {
		if (query2.group.length === 0) {
			return true;
		}
		for (const c of query2.columns) {
			if (!query2.group.includes(c) && !query2.apply.has(c)){
				return false;
			}
		}
		return true;
	}
}

export type Filter = LogicComparison | MComparison | SComparison | Negation | EmptyClass;

export function isValidFilter(filter: any, query2: Query2) {
	if (filter.AND || filter.OR) {
		return LogicComparison.isValidLogicComparison(filter,query2);
	} else if (filter.LT || filter.GT || filter.EQ) {
		return MComparison.isValidMComparison(filter,query2);
	} else if (filter.IS) {
		return SComparison.isValidSComparison(filter,query2);
	} else if (filter.NOT) {
		return Negation.isValidNegation(filter,query2);
	} else if (Object.keys(filter).length === 0) {
		return EmptyClass.isValidEmptyClass(filter,query2);
	} else {
		// undefined filter, invalid
		return false;
	}
}
export function filterResult(p: any, query2: Query2, data: ISection[] | IRoom[], count: number): InsightResult[] {
	let result: InsightResult[] = [];
	if (p && Object.keys(p).length === 0) {
		result = EmptyClass.filterEmptyClass(p,query2,data,count);
	} else if (p.LT || p.GT || p.EQ) {
		result = MComparison.filterMComparison(p,query2,data,count);
	} else if (p.IS) {
		result = SComparison.filterSComparison(p,query2,data,count);
	} else if (p.NOT) {
		result = Negation.filterNegation(p,query2,data,count);
	} else {
		result = LogicComparison.filterLogicComparison(p,query2,data,count);
	}
	return result;
}

export function filterNotResult(p: any,query2: Query2,data: ISection[] | IRoom[],count: number) {
	let result: InsightResult[] = [];
	if (p.LT) {
		result = MComparison.filterNotLT(p,query2,data,count + 1);
	} else if (p.EQ) {
		result = MComparison.filterNotEQ(p,query2,data,count + 1);
	} else if (p.GT) {
		result = MComparison.filterNotGT(p,query2,data,count + 1);
	} else if (p.IS) {
		result = SComparison.filterNotIS(p,query2,data,count + 1);
	} else if (p.AND) {
		result = LogicComparison.filterNotAnd(p,query2,data,count + 1);
	} else {
		result = LogicComparison.filterNotOr(p,query2,data,count + 1);
	}
	return result;
}

export class LogicComparison {
	private AND?: Filter[];
	private OR?: Filter[];

	public static isValidLogicComparison(filter: any, query2: Query2){

		if ((!filter.AND && !filter.OR) || (filter.AND && filter.OR)) {
			return false;
		}
		if (filter.AND && !filter.OR) {
			if (Object.keys(filter.AND).length > 0) {
				for (const i of filter.AND) {
					if (!isValidFilter(i, query2)) {
						return false;
					}
				}
				return true;
			}
		} else if (!filter.AND && filter.OR) {
			if (Object.keys(filter.OR).length > 0) {
				for (const j of filter.OR) {
					if (!isValidFilter(j, query2)) {
						return false;
					}
				}
				return true;
			}
		}
		return false;
	}

	public static filterLogicComparison(p: any, query2: Query2, data: ISection[] | IRoom[], count: number) {
		let result: InsightResult[] = [];
		if(p.AND) {
			for (const i of p.AND) {
				let r1: InsightResult[] = filterResult(i,query2,data,count + 1);

				if (result.length === 0) {
					result = r1;
				} else {
					result = LogicComparison.and_list(result,r1);
				}
			}
			if (count === 0 && result.length > 5000) {
				throw new ResultTooLargeError("> 5000");
			}
		} else if (p.OR) {
			for (const f of p.OR) {
				let r1: InsightResult[] = filterResult(f,query2,data,count + 1);
				if (result.length === 0) {
					result = r1;
				} else {
					result = LogicComparison.or_list(result,r1);
					if (count === 0 && result.length > 5000) {
						throw new ResultTooLargeError("> 5000");
					}
				}
			}
		}
		return result;
	}

	public static filterNotAnd(p: any, query2: Query2, data: ISection[] | IRoom[], count: number) {
		let result: InsightResult[] = [];
		for (const f of p.AND) {
			let r1: InsightResult[] = filterNotResult(f,query2,data,count + 1);
			if (result.length === 0) {
				result = r1;
			} else {
				result = LogicComparison.or_list(result,r1);
			}
		}
		return result;
	}

	public static filterNotOr(p: any, query2: Query2, data: ISection[] | IRoom[], count: number) {
		let result: InsightResult[] = [];
		for (const f of p.OR) {
			let r1: InsightResult[] = filterNotResult(f,query2,data,count + 1);
			if (result.length === 0) {
				result = r1;
			} else {
				result = LogicComparison.and_list(result,r1);
			}
		}
		return result;
	}

	public static and_list(a: InsightResult[], b: InsightResult[]) {
		if (a.length === 0  || b.length === 0) {
			return [];
		}
		let result = [];
		let uuids: number[] = [];
		for (const j of b) {
			uuids.push(j[Object.keys(j)[0]] as number);
		}
		for (const r of a) {
			let uuid = r[Object.keys(r)[0]] as number;
			if (uuids.includes(uuid)) {
				result.push(r);
			}
		}

		return result;
	}

	public static or_list(a: InsightResult[], b: InsightResult[]) {
		if (a.length === 0) {
			return b;
		} else if (b.length === 0) {
			return a;
		} else {
			let result = [];
			let uuids: number[] = [];
			for (const r of a) {
				if (!uuids.includes(r[Object.keys(r)[0]] as number)) {
					uuids.push(r[Object.keys(r)[0]] as number);
					result.push(r);
				}
			}
			for (const j of b) {
				if (!uuids.includes(j[Object.keys(j)[0]] as number)) {
					uuids.push(j[Object.keys(j)[0]] as number);
					result.push(j);
				}
			}
			return result;
		}
	}
}


export function isValidMkey (str: string, query2: Query2) {
	let parts: string[];
	parts = str.split("_");
	let mField = ["avg","pass","fail","audit","year","lat","lon","seats"];
	if (mField.includes(parts[1])) {
		// mfield correct
		if (!query2.name) {
			query2.name = parts[0];
			return true;
		} else if (query2.name === parts[0]){
			return true;
		}
	}
	return false;
}
