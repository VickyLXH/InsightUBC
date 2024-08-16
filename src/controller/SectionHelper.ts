import {ISection} from "./ISection";
import JSZip from "jszip";
import {InsightError} from "./IInsightFacade";
import {IRoom} from "./IRoom";


function toSectionData(dataset_id: string, section: any) {
	let newSection: ISection = {} as ISection;
	newSection.uuid = section.id.toString();
	newSection.id = section.Course;
	newSection.title = section.Title;
	newSection.instructor = section.Professor;
	newSection.dept = section.Subject;
	newSection.avg = section.Avg;
	newSection.pass = section.Pass;
	newSection.fail = section.Fail;
	newSection.audit = section.Audit;
	if (section.Section === "overall"){
		newSection.year = 1900;
	}else{
		newSection.year = parseInt(section.Year, 10);
	}
	return newSection;
}

async function dealwithSection(id: string,zip: JSZip,dataList: ISection[] | IRoom[]){
	let numOfRows = 0;
	// check if root folder is called "courses"
	if (zip.folder(/courses/).length !== 1) {
		return Promise.reject(new InsightError("Rejected with invalid zip file"));
	}
	let promises: Array<Promise<string>> = [];
	zip.folder("courses")?.forEach(function (relativePath, file) {
		promises.push(file.async("string"));
	});
	const fileResults = await Promise.all(promises); // convert all to text file
	for (let file of fileResults) {
		try {
			const course = JSON.parse(file);
			// check if exists valid sections among all courses
			for (const section of course.result) {
				if (validateSection(section)) {
					numOfRows++;
					// a dataset is valid if it contains at least one valid section,so we can convert JSON data to javascript data
					let newSection = toSectionData(id, section);
					(dataList as ISection[]).push(newSection);
				}
			}
		} catch (e) {
			console.log("cannot parse the file");
		}
	}
	if (numOfRows === 0) {
		return Promise.reject(new InsightError("Rejected with invalid content"));
	}

}

function validateSection(section: any) {
	let isValid;
	if ((section.Course != null) && (section.Title != null) && (section.Professor != null) && (section.Subject != null)
		&& (section.Year != null) && (section.Avg != null) && (section.Pass != null) && (section.Fail != null )
		&& (section.Audit != null) && (section.id != null )) {
		isValid = true;
	} else {
		isValid = false;
	}
	return isValid;
}

export {dealwithSection};
