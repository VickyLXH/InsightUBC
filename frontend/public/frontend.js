window.addEventListener('DOMContentLoaded', listDatasets);
document.getElementById("add").addEventListener("click",openModal);
document.getElementById('closeModal').addEventListener("click",closeModal);
document.getElementById("submitAddDataset").addEventListener("click",submitAddDataset);
document.getElementById('DisplayModal').addEventListener('click', function(event) {
    var modalContent = this.querySelector('.modal-content');

    if (!modalContent.contains(event.target)) {
        this.style.display = 'none';
    }
});
var addDatasetModal = document.getElementById("myModal");
var viewDatasetModal = document.getElementById("DisplayModal");
function loadErrorPanel(message) {
	var errorPanel = document.getElementById("errorPanel");
	errorPanel.textContent = message;
	errorPanel.style.display = "block";
	setTimeout(() => {
		errorPanel.style.display = "none";
	}, 5000);
}
function loadSuccessPanel(message) {
	var successPanel = document.getElementById("successPanel");
	successPanel.textContent = message;
	successPanel.style.display = "block";
	setTimeout(() => {
		successPanel.style.display = "none";
	}, 5000);
}
function listDatasets() {

    fetch("http://localhost:4321/datasets")
        .then(response => {
            if (response.status !== 200) {
				loadErrorPanel("Fail to Load Datasets!");
				return;
            } else if (response.status === 200) {

            	return response.json();
            }

        })
        .then (datasetJson => {
        	var datasets = datasetJson.result;
        	if (datasets.length !== 0) {
        		loadSuccessPanel("Load Datasets from Server!");
        		const datasetIds = datasets.map(dataset => dataset.id);
				for (const datasetId of datasetIds) {
					DisplayNewDataset(datasetId);
				}
        	} else {
        		loadSuccessPanel("Empty Server! Add Dataset Now!");
        	}
        })
        .catch(error => {
            loadErrorPanel("Fail to Load Datasets: " + error);
        });
}
function openModal() {
	addDatasetModal.style.display = "block";
}
function closeModal() {
	addDatasetModal.style.display = "none";
}
function submitAddDataset() {
    event.preventDefault();
    const id = document.getElementById('textInput').value;
    const kind = document.getElementById('selectBox').value;
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const statusMessage = document.getElementById('statusMessage');
	if (id === "") {
		statusMessage.textContent = "Please enter a Dataset ID!";
		statusMessage.style.color = 'red';
		statusMessage.classList.remove('hidden');
		setTimeout(() => statusMessage.classList.add('hidden'), 5000);
		return;
	}

    if (!file) {
        statusMessage.textContent = "Please choose a zip file!";
        statusMessage.style.color = 'red';
        statusMessage.classList.remove('hidden');
        setTimeout(() => statusMessage.classList.add('hidden'), 5000);
        return;
    }
	if (kind === "") {
		statusMessage.textContent = "Please select a kind!";
		statusMessage.style.color = 'red';
		statusMessage.classList.remove('hidden');
		setTimeout(() => statusMessage.classList.add('hidden'), 5000);
		return;
	}
    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        // const buffer = Buffer.from(arrayBuffer);
        fetch("http://localhost:4321/dataset/" + id + "/" + kind, {
            method: 'PUT',
            body: arrayBuffer,
            headers: {
                "Content-Type": "application/x-zip-compressed"
            }
        })
        .then(response => {
            if (response.status === 200) {
                statusMessage.textContent = "Dataset added successfully!";
                statusMessage.style.color = 'green';
                DisplayNewDataset(id);
                statusMessage.classList.remove('hidden');
                setTimeout(() => statusMessage.classList.add('hidden'), 5000);
            } else {
            	response.json().then(data => {
                            // Extract the error message
                            const errorMessage = data.error || 'Unknown error occurred';
                            statusMessage.textContent = data.error;
                            statusMessage.style.color = 'red';
                            statusMessage.classList.remove('hidden');
                            setTimeout(() => statusMessage.classList.add('hidden'), 5000);
                        }).catch(error => {
                            statusMessage.textContent = `Failed to parse error: ${error.message}`;
                            statusMessage.style.color = 'red';
                            statusMessage.classList.remove('hidden');
                            setTimeout(() => statusMessage.classList.add('hidden'), 5000);
                        });
            }
        })
        .catch(error => {
            statusMessage.textContent = error.message;
            statusMessage.style.color = 'red';
            statusMessage.classList.remove('hidden');
            setTimeout(() => statusMessage.classList.add('hidden'), 5000);
        });
    };
    reader.onerror = function () {
        statusMessage.textContent = "Error reading file!";
        statusMessage.style.color = 'red';
        statusMessage.classList.remove('hidden');
        setTimeout(() => statusMessage.classList.add('hidden'), 5000);
    };
    reader.readAsArrayBuffer(file);
}
function DisplayNewDataset(id) {
	var datasetElement = document.createElement("div");
        datasetElement.className = "lineDataset";
        datasetElement.id = "dataset_" + id;

        var idElement = document.createElement("p");
        idElement.textContent = id.toString();
		datasetElement.appendChild(idElement);


        var buttonsContainer = document.createElement("div");
		var removeButton = document.createElement("button");
		removeButton.textContent = "Remove";
		removeButton.id = "remove_" + id;
		removeButton.className = "removeButton";
		removeButton.addEventListener("click", function(event) {
            removeDataset(event);
        });
		buttonsContainer.appendChild(removeButton);

		var viewButton = document.createElement("button");
		viewButton.id = "view_" + id;
		viewButton.textContent = "View";
		viewButton.className = "viewButton";
		viewButton.addEventListener("click", function(event) {
			viewDataset(event);
		});
		buttonsContainer.appendChild(viewButton);
		datasetElement.appendChild(buttonsContainer);

        document.getElementById("datasetContainer").appendChild(datasetElement);
}

function removeDataset(event){
	var buttonId = event.target.id;
    var datasetId = buttonId.replace("remove_", "");
    var datasetElement = document.getElementById("dataset_" + datasetId);
	if (datasetElement) {

		fetch("http://localhost:4321/dataset/" + datasetId.toString(), {
			method: 'DELETE',
		})
		.then(response => {
			if (response.status !== 200) {
				var s = "Fail to Remove Dataset: " + datasetId;
				loadErrorPanel(s);
				return;
			}else {
				document.getElementById("datasetContainer").removeChild(datasetElement);
				loadSuccessPanel("Remove Dataset Successful! ID: " + datasetId);
				datasetElement.remove();
				return response.json();
			}

		})
		.catch(err => {
			console.error("Error removing dataset: ", err);
		});
	} else {
		console.error("Dataset element not found on the page.");
	}
}

function viewDataset(event) {
	var buttonId = event.target.id;
	var datasetId = buttonId.replace("view_", "");
	viewDatasetModal.style.display = "block";
	var modalContent1 = viewDatasetModal.querySelector("#chartContainer1");
	var modalContent2 = viewDatasetModal.querySelector("#chartContainer2");
	var modalContent3 = viewDatasetModal.querySelector("#chartContainer3");
	modalContent1.innerHTML = "";
	modalContent2.innerHTML = "";
	modalContent3.innerHTML = "";
    createLineChartCourseNumYear(modalContent1,datasetId);
    createLineChartCourseAvgYear(modalContent2,datasetId);
    createPieChartDepartment(modalContent3,datasetId);

}

function createLineChartCourseNumYear(container,id) {
	var year = id + "_year";
	var title = id + "_id";
	var query = {"WHERE":{},"OPTIONS":{"COLUMNS":[year,"CourseNum"],"ORDER":year},
	"TRANSFORMATIONS":{"GROUP":[year],"APPLY":[{"CourseNum":{"COUNT":title}}]}};
	fetch("http://localhost:4321/query", {
    	method: 'POST',
		body: JSON.stringify(query),
		headers: {
			'Content-Type': 'application/json'
		},
    }).then(response => {
		if (response.status !== 200) {
			loadErrorPanel("Fail to perform Query!");
			throw new Error();
		} else {
			return response.json();
		}
    }).then (responseJson => {
    	var result = responseJson.result;
    	if (result) {
			const margin = { top: 40, right: 30, bottom: 30, left: 50 };
            const width = 460 - margin.left - margin.right;
            const height = 400 - margin.top - margin.bottom;
            const title = d3.select(container)
                .insert("div", ":first-child")
                .attr("class", "chart-title")
                .style("text-align", "center")
                .text("Course Number by Year");

            const svg = d3.select(container).append("svg")
                .attr("class", "chart")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const xScale = d3.scaleLinear()
        		 .domain(d3.extent(result, d => d[year]))
        		 .range([0, width]);
        	const yScale = d3.scaleLinear()
				 .domain([0, d3.max(result, d => d.CourseNum)])
				 .range([height, 0]);
			const line = d3.line()
				   .x(d => xScale(d[year]))
				   .y(d => yScale(d.CourseNum));
			svg.append('g')
                   .attr('transform', `translate(0,${height})`)
                   .call(d3.axisBottom(xScale).ticks(result.length).tickFormat(d3.format("d")));
            svg.append('g')
                   .call(d3.axisLeft(yScale));
            svg.append('path')
                   .datum(result)
                   .attr('class', 'line')
                   .attr('d', line)
                   .attr('fill', 'none')
                   .attr('stroke', 'steelblue')
                   .attr('stroke-width', 2);
            svg.append("text")
                .attr("text-anchor", "start")
                .attr("x", -50)
                .attr("y", -10)
                .attr("font-size", "75%")
                .text("Course Quantity");

            svg.append("text")
                .attr("text-anchor", "end")
                .attr("x", width+ 5)
                .attr("y", height + 30)
                .attr("font-size", "75%")
                .text("Year");

    	} else {
    		loadErrorPanel("Query Performed but Result Undefined!");
    	}
    }).catch (error => {
    	loadErrorPanel("Error caught: " + error.message);
    })
}
function createLineChartCourseAvgYear(container,id) {
	var year = id + "_year";
	var avg = id + "_avg";
	var query = {"WHERE":{},"OPTIONS":{"COLUMNS":[year,"CourseAVG"],"ORDER":year},
                	"TRANSFORMATIONS":{"GROUP":[year],"APPLY":[{"CourseAVG":{"AVG":avg}}]}};
	fetch("http://localhost:4321/query", {
    	method: 'POST',
		body: JSON.stringify(query),
		headers: {
			'Content-Type': 'application/json'
		},
    }).then(response => {
		if (response.status !== 200) {
			loadErrorPanel("Fail to perform Query!");
			throw new Error();
		} else {
			return response.json();
		}
    }).then (responseJson => {
    	var result = responseJson.result;
    	if (result) {
			const margin = { top: 40, right: 30, bottom: 30, left: 50 };
            const width = 460 - margin.left - margin.right;
            const height = 400 - margin.top - margin.bottom;
            const title = d3.select(container)
                .insert("div", ":first-child")
                .attr("class", "chart-title")
                .style("text-align", "center")
                .text("Overall Average by Year");

            const svg = d3.select(container).append("svg")
                .attr("class", "chart")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const xScale = d3.scaleLinear()
        		 .domain(d3.extent(result, d => d[year]))
        		 .range([0, width]);
        	const yScale = d3.scaleLinear()
				 .domain([d3.min(result, d => d.CourseAVG), d3.max(result, d => d.CourseAVG)])
				 .range([height, 0]);
			const line = d3.line()
				   .x(d => xScale(d[year]))
				   .y(d => yScale(d.CourseAVG));
			svg.append('g')
                   .attr('transform', `translate(0,${height})`)
                   .call(d3.axisBottom(xScale).ticks(result.length).tickFormat(d3.format("d")));
            svg.append('g')
                   .call(d3.axisLeft(yScale));
            svg.append('path')
                   .datum(result)
                   .attr('class', 'line')
                   .attr('d', line)
                   .attr('fill', 'none')
                   .attr('stroke', 'steelblue')
                   .attr('stroke-width', 2);
            svg.append("text")
                .attr("text-anchor", "start")
                .attr("x", -50)
                .attr("y", -10)
                .attr("font-size", "75%")
                .text("Overall Average");

            svg.append("text")
                .attr("text-anchor", "end")
                .attr("x", width+ 5)
                .attr("y", height + 30)
                .attr("font-size", "75%")
                .text("Year");

    	} else {
    		loadErrorPanel("Query Performed but Result Undefined!");
    	}
    }).catch (error => {
    	loadErrorPanel("Error caught: " + error.message);
    })
}

function createPieChartDepartment(container,id) {
	var dept = id + "_dept";
	var title = id + "_id";
	var query = {"WHERE":{},"OPTIONS":{"COLUMNS":[dept,"CourseNum"],"ORDER":{"dir":"DOWN","keys":
	["CourseNum"]}},"TRANSFORMATIONS":{"GROUP":[dept],"APPLY":[{"CourseNum":{"COUNT":title}}]}};
	fetch("http://localhost:4321/query", {
    	method: 'POST',
		body: JSON.stringify(query),
		headers: {
			'Content-Type': 'application/json'
		},
    }).then(response => {
		if (response.status !== 200) {
			loadErrorPanel("Fail to perform Query!");
			throw new Error();
		} else {
			return response.json();
		}
    }).then (responseJson => {
    	var result = responseJson.result;
    	if (result) {
    		const result = responseJson.result;

            const margin = { top: 40, right: 30, bottom: 60, left: 50 };
            const width = 460 - margin.left - margin.right;
            const height = 400 - margin.top - margin.bottom;

            d3.select(container)
                .insert("div", ":first-child")
                .attr("class", "chart-title")
                .style("text-align", "center")
                .text("Course Quantity by Department");

            const svg = d3.select(container).append("svg")
                .attr("class", "chart")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            let modifiedResult;
            let others = { [dept]: 'others', CourseNum: 0 };

            if (result.length > 10) {
                for (let i = 10; i < result.length; i++) {
                    others.CourseNum += result[i].CourseNum;
                }
                modifiedResult = result.slice(0, 10).concat(others);
            } else {
                modifiedResult = result;
            }

            const xScale = d3.scaleBand()
                .domain(modifiedResult.map(d => d[dept]))
                .range([0, width])
                .padding(0.1);

            const yScale = d3.scaleLinear()
                .domain([0, d3.max(modifiedResult, d => d.CourseNum)])
                .range([height, 0]);

            svg.selectAll(".bar")
                .data(modifiedResult)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", d => xScale(d[dept]))
                .attr("y", d => yScale(d.CourseNum))
                .attr("width", xScale.bandwidth())
                .attr("height", d => height - yScale(d.CourseNum))
                .attr("fill", "steelblue");


            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(xScale))
                .selectAll("text")
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".15em")
                .attr("transform", "rotate(-65)");

            svg.append("g")
                .call(d3.axisLeft(yScale));
            svg.append("text")
				.attr("text-anchor", "start")
				.attr("x", -50)
				.attr("y", -10)
				.attr("font-size", "75%")
				.text("Course Quantity");

			svg.append("text")
				.attr("text-anchor", "end")
				.attr("x", width+ 30)
				.attr("y", height + 10)
				.attr("font-size", "75%")
				.text("Dept");

    	} else {
    		loadErrorPanel("Query Performed but Result Undefined!");
    	}
    }).catch (error => {
    	loadErrorPanel("Error caught: " + error.message);
    })
}
