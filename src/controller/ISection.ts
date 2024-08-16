export interface ISection {
	uuid: string;
    id: string;
	title: string;
	instructor: string;
	dept: string;
	year: number;
	avg: number;
	pass: number;
	fail: number;
	audit: number;
	[key: string]: string | number;
}
