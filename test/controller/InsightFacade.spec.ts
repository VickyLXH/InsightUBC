import InsightFacade from "../../src/controller/InsightFacade";
import {clearDisk, getContentFromArchives, readFileQueries} from "../resources/archives/TestUtil";
import {
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import chai, {expect} from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);

export interface ITestQuery {
	title: string; // title of the test case

	input: unknown; // the query under test

	errorExpected: boolean; // if the query is expected to throw an error

	expected: any; // the expected result
}

describe("InsightFacade", function () {
	describe("addDataset", function () {
		let validDataSet: string;
		let notZipDataSet: string;
		let noValidSectionDataSet: string;
		let notCoursesDataSet: string;
		let notJSONDataSet: string;
		let emptyFolder: string;
		let emptyCourseSection: string;
		let validRooms: string;
		let novalidRooms: string;
		let noIndexFile: string;
		let campus: string;

		let facade: InsightFacade;

		before(async function () {
			validDataSet = await getContentFromArchives("ValidCourses.zip");
			noValidSectionDataSet = await getContentFromArchives("NoValidSection.zip");
			notZipDataSet = await getContentFromArchives("NotZip.txt");
			notCoursesDataSet = await getContentFromArchives("NotCourses.zip");
			notJSONDataSet = await getContentFromArchives("NotJSON.zip");
			emptyFolder = await getContentFromArchives("EmptyFolder.zip");
			emptyCourseSection = await getContentFromArchives("EmptyCourseSection.zip");
			validRooms = await getContentFromArchives("ValidRooms.zip");
			novalidRooms = await getContentFromArchives("NoValidRooms.zip");
			noIndexFile = await getContentFromArchives("InvalidWithoutIndex.zip");
			campus = await getContentFromArchives("campus.zip");
		});

		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should succesfully add a section dataset", function () {
			const result = facade.addDataset("rooms", validDataSet, InsightDatasetKind.Sections);
			return expect(result).to.eventually.have.members(["rooms"]);
		});

		it("should succesfully add a room dataset", function () {
			const result = facade.addDataset("rooms", validRooms, InsightDatasetKind.Rooms);
			return expect(result).to.eventually.have.members(["rooms"]);
		});

		it("should succesfully add a campus dataset", function () {
			const result = facade.addDataset("rooms", campus, InsightDatasetKind.Rooms);
			return expect(result).to.eventually.have.members(["rooms"]);
		});

		it("should reject with no valid rooms", function () {
			const result = facade.addDataset("rooms", novalidRooms, InsightDatasetKind.Rooms);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with no index.htm", function () {
			const result = facade.addDataset("rooms", noIndexFile, InsightDatasetKind.Rooms);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with  an empty dataset id", function () {
			const result = facade.addDataset("", validDataSet, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with  an only whitespace dataset id", function () {
			const result = facade.addDataset(" ", validDataSet, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with  an underscored dataset id", function () {
			const result = facade.addDataset("_ubc", validDataSet, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with a repeated dataset id", function () {
			return facade.addDataset("rooms", validDataSet, InsightDatasetKind.Sections).then(() => {
				return facade.addDataset("rooms", validDataSet, InsightDatasetKind.Sections)
					.then(() => {
						expect.fail();
					})
					.catch((err) => {
						return expect(err).to.be.instanceof(InsightError);
					});
			});
		});

		// it("should reject with invalid kind 'Room", function () {
		// 	const result = facade.addDataset("ubc", validDataSet, InsightDatasetKind.Rooms);
		// 	return expect(result).to.eventually.be.rejectedWith(InsightError);
		// });

		it("should reject with a unzip dataset", function () {
			const result = facade.addDataset("ubc", notZipDataSet, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with a no valid section dataset", function () {
			const result = facade.addDataset("ubc", noValidSectionDataSet, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with root folder not courses", function () {
			const result = facade.addDataset("ubc", notCoursesDataSet, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject as it's not JSON formatted file", function () {
			const result = facade.addDataset("ubc", notJSONDataSet, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject as an empty folder", function () {
			const result = facade.addDataset("ubc", emptyFolder, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject as no section is inside course file", function () {
			const result = facade.addDataset("ubc", emptyCourseSection, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
	});

	describe("removeDataSet", function () {
		let validDataSet: string;
		let validRooms: string;

		let facade: InsightFacade;

		before(async function () {
			validDataSet = await getContentFromArchives("ValidCourses.zip");
			validRooms = await getContentFromArchives("ValidRooms.zip");
		});

		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
			await facade.addDataset("ubc", validDataSet, InsightDatasetKind.Sections);
			await facade.addDataset("ubc2", validRooms, InsightDatasetKind.Rooms);
		});

		it("should succesfully remove a dataset", function () {
			const result = facade.removeDataset("ubc");
			return expect(result).to.eventually.deep.equal("ubc");
		});

		it("should succesfully remove a room dataset", function () {
			const result = facade.removeDataset("ubc2");
			return expect(result).to.eventually.deep.equal("ubc2");
		});

		it("should reject since the id is invalid(only whitespace)", function () {
			const result = facade.removeDataset(" ");
			return expect(result).to.eventually.rejectedWith(InsightError);
		});

		it("should reject since the id is invalid(contain underscore)", function () {
			const result = facade.removeDataset("_ubc");
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject since the id is invalid(empty)", function () {
			const result = facade.removeDataset("");
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with a NotFoundError)", function () {
			const result = facade.removeDataset("ubc3");
			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
		});
	});

	describe("listDataSets", function () {
		let validDataSet: string;
		let validDataSet2: string;
		let validRooms: string;
		let campus: string;

		let facade: InsightFacade;

		before(async function () {
			validDataSet = await getContentFromArchives("ValidCourses.zip");
			validDataSet2 = await getContentFromArchives("ValidCourses2.zip");
			validRooms = await getContentFromArchives("ValidRooms.zip");
			campus = await getContentFromArchives("campus.zip");
		});

		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("add only one dataset and succesfully list it", function () {
			return facade.addDataset("ubc", validDataSet, InsightDatasetKind.Sections).then(() => {
				return facade.listDatasets().then((result) => {
					return expect(result).to.deep.equals([
						{
							id: "ubc",
							kind: InsightDatasetKind.Sections,
							numRows: 6,
						},
					]);
				});
			});
		});

		it("add only one room dataset and succesfully list it", function () {
			return facade.addDataset("ubc", validRooms, InsightDatasetKind.Rooms).then(() => {
				return facade.listDatasets().then((result) => {
					return expect(result).to.deep.equals([
						{
							id: "ubc",
							kind: InsightDatasetKind.Rooms,
							numRows: 5,
						},
					]);
				});
			});
		});

		it("add two datasets and succesfully list it", function () {
			return facade
				.addDataset("ubc", validDataSet, InsightDatasetKind.Sections)
				.then(() => {
					return facade.addDataset("ubc2", validDataSet2, InsightDatasetKind.Sections).then(() => {
						return facade.listDatasets().then((result) => {
							return expect(result).to.deep.equals([
								{
									id: "ubc",
									kind: InsightDatasetKind.Sections,
									numRows: 6,
								},
								{
									id: "ubc2",
									kind: InsightDatasetKind.Sections,
									numRows: 6,
								},
							]);
						});
					});
				})
				.catch((err) => {
					console.log("Failed to add datasets + err:" + err);
				});
		});

		it("add two datasets and succesfully list it", function () {
			return facade
				.addDataset("ubc", validRooms, InsightDatasetKind.Rooms)
				.then(() => {
					return facade.addDataset("ubc2", campus, InsightDatasetKind.Rooms).then(() => {
						return facade.listDatasets().then((result) => {
							return expect(result).to.deep.equals([
								{
									id: "ubc",
									kind: InsightDatasetKind.Rooms,
									numRows: 5,
								},
								{
									id: "ubc2",
									kind: InsightDatasetKind.Rooms,
									numRows: 364,
								},
							]);
						});
					});
				})
				.catch((err) => {
					console.log("Failed to add datasets + err:" + err);
				});
		});


		it("add two datasets in another sequence and succesfully list it", function () {
			return facade
				.addDataset("ubc2", validDataSet, InsightDatasetKind.Sections)
				.then(() => {
					return facade.addDataset("ubc", validDataSet2, InsightDatasetKind.Sections).then(() => {
						return facade.listDatasets().then((result) => {
							return expect(result).to.deep.equals([
								{
									id: "ubc2",
									kind: InsightDatasetKind.Sections,
									numRows: 6,
								},
								{
									id: "ubc",
									kind: InsightDatasetKind.Sections,
									numRows: 6,
								},
							]);
						});
					});
				})
				.catch((err) => {
					console.log("Failed to add datasets + err:" + err);
				});
		});

		it("add two datasets  and then remove and succesfully list it", function () {
			return facade.addDataset("ubc2", validDataSet, InsightDatasetKind.Sections).then(() => {
				return facade.addDataset("ubc", validDataSet2, InsightDatasetKind.Sections).then(() => {
					return facade.removeDataset("ubc2").then(() => {
						return facade.listDatasets().then((result) => {
							return expect(result).to.deep.equals([
								{
									id: "ubc",
									kind: InsightDatasetKind.Sections,
									numRows: 6,
								},
							]);
						});
					});
				});
			});
		});
	});

	describe("performQuery", function () {
		let fullDataSet: string;

		let facade: InsightFacade;

		before(async function () {
			await clearDisk();
			fullDataSet = await getContentFromArchives("FullCourses.zip");
			facade = new InsightFacade();
			// await facade.addDataset("ubc", fullDataSet, InsightDatasetKind.Sections)
			await facade.addDataset("sections", fullDataSet, InsightDatasetKind.Sections);
			let validRooms = await getContentFromArchives("campus.zip");
			await facade.addDataset("rooms", validRooms, InsightDatasetKind.Rooms);

		});

		describe("valid queries", function () {
			let validQueries: ITestQuery[];
			try {
				validQueries = readFileQueries("valid");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			// validQueries.forEach(function (test: any) {
			//     it(`${test.title}`, function () {
			//         return facade.performQuery(test.input).then((result) => {
			//             return expect(result).to.eventually.deep.equal(test.expected);
			//         });
			//     });
			// })
			validQueries.forEach(function (test: any) {
				it(`${test.title}`, async function () {
					const result = await facade.performQuery(test.input);
					expect(result).to.deep.equal(test.expected);
				});
			});
		});

		describe("invalid queries", function () {
			let invalidQueries: ITestQuery[];
			try {
				invalidQueries = readFileQueries("invalid");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			// invalidQueries.forEach(function (test: any) {
			//     it(`${test.title}`, function () {
			//         return  facade.performQuery(test.input).then((result) =>{
			//             if(test.expected === "InsightError"){
			//                 return expect(result).to.eventually.be.rejectedWith(InsightError);
			//             }else {
			//                 return expect(result).to.eventually.be.rejectedWith(ResultTooLargeError);
			//             }
			//         })
			//     });
			// });

			invalidQueries.forEach(function (test: any) {
				it(`${test.title}`, async function () {
					try {
						const result = await facade.performQuery(test.input);

						if (test.expected === "InsightError") {
							expect.fail("Expected an InsightError.");
						} else {
							expect.fail("Expected a ResultTooLargeError.");
						}
					} catch (error) {
						if (test.expected === "InsightError" || test.with === "InsightError") {
							expect(error).to.be.an.instanceOf(InsightError);
						} else {
							expect(error).to.be.an.instanceOf(ResultTooLargeError);
						}
					}
				});
			});
		});
	});
});
