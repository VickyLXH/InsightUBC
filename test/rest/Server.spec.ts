import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";

import {expect} from "chai";
import request, {Response} from "supertest";
import {clearDisk, getContentFromArchives} from "../resources/archives/TestUtil";
import fs, {readJSONSync} from "fs-extra";
import {InsightDatasetKind} from "../../src/controller/IInsightFacade";

describe("Facade D3", function () {

	let facade: InsightFacade;
	let server: Server;

	before(async function () {
		facade = new InsightFacade();
		server = new Server(4321);
		// TODO: start server here once and handle errors properly
		await server.start();
	});

	after(async function () {
		// TODO: stop server here once!
		await server.stop();
	});

	beforeEach(async function () {
		// might want to add some process logging here to keep track of what is going on
		await clearDisk();
		facade = new InsightFacade();


	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	// Sample on how to format PUT requests
	/*
	it("PUT test for courses dataset", function () {
		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});
	*/

	// The other endpoints work similarly. You should be able to find all instructions at the supertest documentation

	it("PUT test for courses dataset", function () {
		try {
			return request("http://localhost:4321")
				.put("/dataset/mysections/sections")
				.send(fs.readFileSync("test/resources/archives/ValidCourses.zip"))
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					console.log("success");
					expect(res.status).to.be.equal(200);
					expect(res.body.result).to.have.deep.members(["mysections"]);
				})
				.catch(function (err) {
					// some logging here please!
					console.log(err);
				});
		} catch (err) {
			// and some more logging here!
			console.log(err);
			expect.fail();
		}
	});

	it("PUT test failed for courses dataset", function () {
		try {
			return request("http://localhost:4321")
				.put("/dataset/mysections/sections")
				.send(fs.readFileSync("test/resources/archives/NoValidSection.zip"))
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					expect(res.status).to.be.equal(400);
					console.log("Test failed with invalid dataset");
				})
				.catch(function (err) {
					// some logging here please!
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log(err);
		}
	});

	it("DELETE test for courses dataset", async function () {
		let validDataSet = await getContentFromArchives("ValidCourses.zip");
		try {
			await facade.addDataset("mysections", validDataSet, InsightDatasetKind.Sections);
			return request("http://localhost:4321")
				.delete("/dataset/mysections")
				.then(function (res: Response) {
					// some logging here please!
					expect(res.status).to.be.equal(200);
					expect(res.body.result).to.deep.equal("mysections");
				})
				.catch(function (err) {
					// some logging here please!
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log(err);
		}
	});

	it("DELETE test failed for courses dataset with NotFoundError", async function () {
		try {
			return request("http://localhost:4321")
				.delete("/dataset/mysections")
				.then(function (res: Response) {
					// some logging here please!
					expect(res.status).to.be.equal(404);
					console.log("failed with NotFoundError ");
				})
				.catch(function (err) {
					// some logging here please!
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log(err);
		}
	});

	it("DELETE test failed for courses dataset with InsightError", async function () {
		let validDataSet = await getContentFromArchives("ValidCourses.zip");
		try {
			await facade.addDataset("mysections", validDataSet, InsightDatasetKind.Sections);
			return request("http://localhost:4321")
				.delete("/dataset/_mysections")
				.then(function (res: Response) {
					// some logging here please!
					expect(res.status).to.be.equal(400);
					console.log("failed with InsightError ");
				})
				.catch(function (err) {
					// some logging here please!
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log(err);
		}
	});

	it("GET test for courses dataset", async function () {
		let validDataSet = await getContentFromArchives("ValidCourses.zip");
		try {
			await facade.addDataset("mysections", validDataSet, InsightDatasetKind.Sections);
			return request("http://localhost:4321")
				.get("/datasets")
				.then(function (res: Response) {
					// some logging here please!
					expect(res.status).to.be.equal(200);
					// expect(res.body).to.be.deep.equal([
					// 	{
					// 		id: "ubc",
					// 		kind: InsightDatasetKind.Sections,
					// 		numRows: 6,
					// 	}]);
				})
				.catch(function (err) {
					// some logging here please!
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log(err);
		}
	});

	it("POST test failed for invalid query", async () => {
		try {
			return request("http://localhost:4321")
				.post("/query")
				.send(readJSONSync("test/resources/queries/invalid/all_empty.json"))
				.set("Content-Type", "application/json")
				.then((res: Response) => {
					expect(res.status).to.be.equal(400);
				})
				.catch((err) => {
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			console.log(err);
		}
	});

	it("should test POST for a valid query", async () => {
		let fullCourses = await getContentFromArchives("FullCourses.zip");
		let query = JSON.stringify({
			WHERE: {
				AND: [
					{
						GT: {
							sections_avg: 90
						}
					},
					{
						IS: {
							sections_dept: "*a"
						}
					}
				]
			},
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"sections_avg"
				],
				ORDER: "sections_avg"
			}
		});
		try {
			await facade.addDataset("sections", fullCourses, InsightDatasetKind.Sections);
			return request("http://localhost:4321")
				.post("/query")
				.send(query)
				.set("Content-Type", "application/json")
				.then((res: Response) => {
					console.log(res.body);
					expect(res.status).to.be.equal(200);
					// expect(res.body.result).to.have.length(46);
				})
				.catch((err) => {
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			console.log(err);
		}
	});
});

