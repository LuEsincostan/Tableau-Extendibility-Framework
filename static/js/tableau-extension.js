'use strict';



// Wrap everything in an anonymous function to avoid polluting the global namespace
(function() {
    // Use the jQuery document ready signal to know when everything has been initialized
    $(document).ready(function() {
        // Tell Tableau we'd like to initialize our extension
        tableau.extensions.initializeAsync().then(function() {
            // Fetch the saved sheet name from settings. This will be undefined if there isn't one configured yet
            const savedSheetName = tableau.extensions.settings.get('sheet');
            if (savedSheetName) {
                // We have a saved sheet name, show its selected marks
                loadSelectedMarks(savedSheetName);
            } else {
                // If there isn't a sheet saved in settings, show the dialog
                showChooseSheetDialog();
            }

            initializeButtons();
        });
    });

    /**
     * Shows the choose sheet UI. Once a sheet is selected, the data table for the sheet is shown
     */
    function showChooseSheetDialog() {
        // Clear out the existing list of sheets
        $('#choose_sheet_buttons').empty();

        // Set the dashboard's name in the title
        const dashboardName = tableau.extensions.dashboardContent.dashboard.name;
        $('#choose_sheet_title').text(dashboardName);

        // The first step in choosing a sheet will be asking Tableau what sheets are available
        const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;

        // Next, we loop through all of these worksheets and add buttons for each one
        worksheets.forEach(function(worksheet) {
            // Declare our new button which contains the sheet name
            const button = createButton(worksheet.name);

            // Create an event handler for when this button is clicked
            button.click(function() {
                // Get the worksheet name and save it to settings.
                filteredColumns = [];
                const worksheetName = worksheet.name;
                tableau.extensions.settings.set('sheet', worksheetName);
                tableau.extensions.settings.saveAsync().then(function() {
                    // Once the save has completed, close the dialog and show the data table for this worksheet
                    $('#choose_sheet_dialog').modal('toggle');
                    loadSelectedMarks(worksheetName);
                });
            });

            // Add our button to the list of worksheets to choose from
            $('#choose_sheet_buttons').append(button);
        });

        // Show the dialog
        $('#choose_sheet_dialog').modal('toggle');
    }

    function createButton(buttonTitle) {
        const button =
            $(`<button type='button' class='btn btn-default btn-block'>
      ${buttonTitle}
    </button>`);

        return button;
    }

    // This variable will save off the function we can call to unregister listening to marks-selected events
    let unregisterEventHandlerFunction;

    function loadSelectedMarks(worksheetName) {
        // Remove any existing event listeners
        if (unregisterEventHandlerFunction) {
            unregisterEventHandlerFunction();
        }

        // Get the worksheet object we want to get the selected marks for
        const worksheet = getSelectedSheet(worksheetName);

        // Set our title to an appropriate value
        $('#selected_marks_title').text(worksheet.name);

        // Call to get the selected marks for our sheet
        worksheet.getSelectedMarksAsync().then(function(marks) {
            // Get the first DataTable for our selected marks (usually there is just one)
            const worksheetData = marks.data[0];
			
			console.log("Column Objects");
			console.log(worksheetData.columns);

            // Map our data into the format which the data table component expects it
            const data = worksheetData.data.map(function(row, index) {
                const rowData = row.map(function(cell) {
                    return cell.formattedValue;
                });

                return rowData;
            });
			
			

            const columns = worksheetData.columns.map(function(column) {
                return {
                    title: column.fieldName
                };
            });
			
			console.log("Data without header: ");
			console.log(data);
			//writeBackMarks(selectedDataTable);
			
			//Actual dataset, Column Names, Wafer Id (can change in it's position, so create a loop instead)			
			sendSelectedWafersToPython(data,columns,data[0][1]);
			//console.log("data");
			//console.log(data);
			

            // Populate the data table with the rows and columns we just pulled out
            populateDataTable(data, columns);
			
        });

        // Add an event listener for the selection changed event on this sheet.
        unregisterEventHandlerFunction = worksheet.addEventListener(tableau.TableauEventType.MarkSelectionChanged, function(selectionEvent) {
            // When the selection changes, reload the data
            loadSelectedMarks(worksheetName);
			
			//One Wafer
			
			//console.log("Wafer Selected: "+ oneWafer);
			
			//sendDataTableToPython1();
			//sendDataTableToPython3(worksheetData);
        });
    }
	

	
	function sendSelectedWafersToPython(data,columns,oneWafer) {
		console.log("#########################################################################");
		console.log("###################### sendSelectedWafersToPython #######################");
		console.log("#########################################################################");
		console.log("data");
		console.log(data);
		console.log(" ");
		console.log("oneWafer");
		console.log(oneWafer);
		console.log(" ");
		console.log("columns");
		console.log(columns);
		console.log(typeof columns);
		
		
		//geting a unique array of wafer ids selected
		function getUniqueWaferIds(dim2array) {
			var uniques = [];
			var itemsFound = {};
			for(var i = 0, l = dim2array.length; i < l; i++) {
				var stringified = JSON.stringify(dim2array[i][2]);
				if(itemsFound[stringified]) { continue; }
				uniques.push(dim2array[i][2]);
				itemsFound[stringified] = true;
			}
			return uniques;
		}
		
		//var relevantData = [[],[]];
		var columnHeader;
		var uniqueWaferIdArray = getUniqueWaferIds(data);
		//var iterateThroughAllColumns(data);
		
		

		//statically 2 features | loop through amount of columns for dynamic feature set
		var amountOfFeatures = 0;
			
		
		//define standard columns
		const columns_std = ["Wafer Id","X","Y"];
		//define excluded columns DEFAULT: ["CNT(Feature)"];
		const columns_excluded = ["CNT(Feature)"];
		var array_of_column_numbers_excluded = [];
				
		for (var c = 0; c < columns.length; c++) {
				
			columnHeader = columns[c]["title"];
			console.log("Column "+c+": " + columnHeader);
			
			
			if (columns_excluded.includes(columnHeader)) {
				array_of_column_numbers_excluded.push(c);
				console.log("array_of_column_numbers_excluded: "+array_of_column_numbers_excluded);
			
			} else if //if column header is not part of standard columns and excluded ones
				   //count the amount of features (and therefore images which will get created)			
			       (!columns_std.includes(columnHeader) && !columns_excluded.includes(columnHeader)  ) {
				
						amountOfFeatures++;
						//alert("amountOfFeatures: "+amountOfFeatures);
					}
				
		}		
		
			
		var existingDiv;
		//var newDiv;	
		for (var i = 0; i < uniqueWaferIdArray.length; i++) {
			for (var f = 0; f < amountOfFeatures; f++) {
						
				var waferImageUnderscoreFeature = uniqueWaferIdArray[i]+"_"+f;		

				if (!document.getElementById(waferImageUnderscoreFeature)) {
					
					//new div for wafer loading image
					var newDiv = document.createElement("div");

					//set id of this div to first value within uniqueWaferIdArray
					newDiv.setAttribute("id",waferImageUnderscoreFeature);
					newDiv.setAttribute("class","item item--medium");
					newDiv.setAttribute("onclick","filterOnAnArray(['"+uniqueWaferIdArray[i]+"']);");				
					document.getElementsByClassName("grid")[0].appendChild(newDiv);

					//Create Label + Loading Image before each Wafer got plotted
					var divLabel = document.createElement("div");
					divLabel.setAttribute("class","item__details");
					divLabel.setAttribute("id","item__details"+waferImageUnderscoreFeature);
					document.getElementById(waferImageUnderscoreFeature).appendChild(divLabel);
					htmlTextNode = document.createTextNode(""+uniqueWaferIdArray[i]);
					divLabel.appendChild(htmlTextNode);	

					//Writing to Database GIF; remove once data is written into database (after Python response)
					var writeToDbGif = document.createElement("div");
					writeToDbGif.setAttribute("class","writing-to-db-gif");
					writeToDbGif.setAttribute("id","writing-to-db-gif-"+waferImageUnderscoreFeature);
					document.getElementById("item__details"+waferImageUnderscoreFeature).appendChild(writeToDbGif);
					
					//document.getElementById("item__details"+waferImageUnderscoreFeature).style.marginTop="0px";
					//document.getElementById("item__details"+waferImageUnderscoreFeature).style.marginRight="0px";	
					htmlTextNode = document.createTextNode(""); //originally: Loading...
					//htmlTextNode.setAttribute("id","writing-to-db-status-text-"+waferImageUnderscoreFeature);
					writeToDbGif.appendChild(htmlTextNode);	

				}	
				document.getElementById(waferImageUnderscoreFeature).style.backgroundImage = "url('/static/img/loading.gif')";				
								
					//if (f==0) {
						//scroll into WaferId the user selected first
						console.log("scroll into WaferId the user selected first");
						var firstWafer = document.getElementById(waferImageUnderscoreFeature);
						firstWafer.scrollIntoView();	
					//}
			}
			
		}
		console.log("ALL LOADING IMAGES GENERATED!!!!");	  
				
	
		//getting rid of all columns which are part of the "columns_excluded" array
		//for the "data" array as well as the "columns" array
		var idx = array_of_column_numbers_excluded;
		for (var n = 0; n < idx.length; n++) {
			console.log("Getting rid of CNT(1) from columns header array");
			console.log(columns);
			console.log("idx[n]"+idx[n]);
			columns.splice(idx[n],1);
					
			console.log("Getting rid of CNT(1) Feature");
			console.log(data);					
			for (var i = 0; i < data.length; i++) {
				data[i].splice(idx, 1);				
			}			
		}
		
			  
		
		
		// setup some JSON to send to Python
		var waferList = [
			{ "waferId":oneWafer, "columns":columns, "data":data}
		];

		
		var pythonResponse;
		var waferIdWithUnderscore;
		var waferId;
		var waferPng;		
		var waferPathPng;
		var waferStylePathPng;		
		var htmlTextNode;
		
		console.log("AJAX START 1: Sending JSON to Python to render Wafer images ");
		$.ajax({
			type: "POST",
			url: "renderpictures",
			data: JSON.stringify(waferList),
			dataType: 'json',
			cache: false,
			success: function (result) {
				//alert("success:"+result);				
				pythonResponse = result;
				console.log("Successfully sent data to Python. Result:");
				console.log(Object.keys(pythonResponse))	

				var i=0;
				for (const [key, value] of Object.entries(pythonResponse)) {
				  //console.log(`${key}: ${value}`);
				  console.log(`${value}`);
				  //waferid example: C92001.2_0 -> split at "_"
				  waferIdWithUnderscore  = `${key}`;
				  waferId = waferIdWithUnderscore.split("_", 0);
				  waferPng = `${value}`;
				  waferPathPng = "/static/wafer-images/"+waferPng;
				  waferStylePathPng = "url('"+waferPathPng+"')"

				  //Putting correct wafer images into each tile
				  console.log("START: Putting correct wafer images into each tile");
				  document.getElementById(waferIdWithUnderscore).style.backgroundImage = waferStylePathPng;
				  console.log("waferStylePathPng "+waferStylePathPng);
				  
				  //Remove "Writing to database gif" (BLOCKER: MOVE this section to other AJAX Python call, once it exists!!!)
				  console.log("Remove 'Writing to database GIF'");
				  document.getElementById("writing-to-db-gif-"+waferIdWithUnderscore).style.backgroundImage = 'none';
				  
				  //User Feedback if Successful or FAILED as an Alert
				  document.getElementById("writing-to-db-gif-"+waferIdWithUnderscore).style.marginTop="0px";
				  document.getElementById("writing-to-db-gif-"+waferIdWithUnderscore).style.marginRight="15px";				      
				  document.getElementById("writing-to-db-gif-"+waferIdWithUnderscore).innerHTML="Successfull";
				  
				  //show 3 seconds only via CSS fade				  
				  document.getElementById("writing-to-db-gif-"+waferIdWithUnderscore).classList.add("class","fadeStatusOut");;
				  
				  console.log("i: "+i);
				  i++;
				}	
			},
			error:function (error) {
				console.log("ERROR receiving JSON response from Python. So creating an image within Python probably failed or the user did not wait for the first request to be processed completely. Please check if Extension has got access to the Webserver. Maybe a missing VPN connection to Tableau's intranet prevent you in successfully connecting to DB. Please debug Extension prior to reaching out to the authors.");				
				console.log(error);
			}
		});
		// stop link reloading the page
		event.preventDefault();
	

	  //Call sendDataToDatabase() function	
		console.log("AJAX START 2: sendDataToDatabase()");
		$.ajax({
			type: "POST",
			url: "dataprocessor",
			data: JSON.stringify(waferList),
			dataType: 'json',
			cache: false,
			success: function (result) {
				//alert("success:"+result);				
				pythonResponse = result;
				console.log("Successfully sent data to Python -> DB Endpoint '/dataprocessor'! Result:");
				console.log(Object.keys(pythonResponse))	

				var i=0;
				for (const [key, value] of Object.entries(pythonResponse)) {
				  //console.log(`${key}: ${value}`);
				  console.log(`${value}`);
				  //waferid example: 8001 -> split at "_"
				  waferIdWithUnderscore  = `${key}`;
				  waferId = waferIdWithUnderscore.split("_", 0);
				  waferPng = `${value}`;
				  waferPathPng = "/static/wafer-images/"+waferPng;
				  waferStylePathPng = "url('"+waferPathPng+"')"

				  
				  console.log("Remove 'Writing to database GIF for: '"+waferPathPng);
				  document.getElementById("writing-to-db-gif-"+waferIdWithUnderscore).style.backgroundImage = 'none';
				  
				  //User Feedback if Successful or FAILED ()
				  document.getElementById("writing-to-db-gif-"+waferIdWithUnderscore).style.marginTop="0px";
				  document.getElementById("writing-to-db-gif-"+waferIdWithUnderscore).style.marginRight="15px";				      
				  document.getElementById("writing-to-db-gif-"+waferIdWithUnderscore).innerHTML="Successfull";
				  //show 2 seconds only via CSS				  				  
				  console.log("i: "+i);
				  i++;
				}
				console.log("Send data to database completed, but the COMMIT statement of the database might take a little bit longer!");
			},
			error:function (error) {
				console.log("ERROR receiving JSON response from Python. So writing data into database did probably fail. Please check if Extension has got access to database. Maybe a missing VPN connection to Tableau's intranet prevent you in successfully connecting to DB. Please debug Extension prior to reaching out to the authors.");				
				console.log(error);
			}
		});
		// stop link reloading the page
		event.preventDefault();
	}
	

    function populateDataTable(data, columns) {
        // Do some UI setup here: change the visible section and reinitialize the table
        $('#data_table_wrapper').empty();

        if (data.length > 0) {
            $('#no_data_message').css('display', 'none');
            $('#data_table_wrapper').append(`<table id='data_table' class='table table-striped table-bordered'></table>`);

            // Do some math to compute the height we want the data table to be
            var top = $('#data_table_wrapper')[0].getBoundingClientRect().top;
            var height = $(document).height() - top - 130;

            const headerCallback = function(thead, data) {
                const headers = $(thead).find('th');
                for (let i = 0; i < headers.length; i++) {
                    const header = $(headers[i]);
                    if (header.children().length === 0) {
                        const fieldName = header.text();
                        const button = $(`<a href='#'>${fieldName}</a>`);
                        button.click(function() {
                            filterByColumn(i, fieldName);
                        });

                        header.html(button);
                    }
                }
            };

            // Initialize our data table with what we just gathered
            $('#data_table').DataTable({
                data: data,
                columns: columns,
                autoWidth: false,
                deferRender: true,
                scroller: true,
                scrollY: height,
                scrollX: true,
                headerCallback: headerCallback,
                dom: "<'row'<'col-sm-6'i><'col-sm-6'f>><'row'<'col-sm-12'tr>>" // Do some custom styling
            });
        } else {
            // If we didn't get any rows back, there must be no marks selected
            $('#no_data_message').css('display', 'inline');
        }
    }
	


    function initializeButtons() {
        $('#show_choose_sheet_button').click(showChooseSheetDialog);
        $('#reset_filters_button').click(resetFilters);
		$('#hide_data_table_button').click(hideDataTable);
    }

    // Save the columns we've applied filters to so we can reset them
    let filteredColumns = [];

    function filterByColumn(columnIndex, fieldName) {
        // Grab our column of data from the data table and filter out to just unique values
        const dataTable = $('#data_table').DataTable({
            retrieve: true
        });
        const column = dataTable.column(columnIndex);
        const columnDomain = column.data().toArray().filter(function(value, index, self) {
            return self.indexOf(value) === index;
        });

        const worksheet = getSelectedSheet(tableau.extensions.settings.get('sheet'));
        worksheet.applyFilterAsync(fieldName, columnDomain, tableau.FilterUpdateType.Replace);
        filteredColumns.push(fieldName);
        return false;
    }
	
	function hideDataTable() {
		  var x = document.getElementById("data_table_wrapper");
		  if (x.style.visibility === "hidden") {
			x.style.visibility = "visible";
			x.style.height = "285px";
			document.getElementById("visibility_icon").innerHTML = "visibility_off";
			console.log("hideDataTable(visible)");
		  } else {
			x.style.visibility = "hidden";
			x.style.height = "0px";
			document.getElementById("visibility_icon").innerHTML = "visibility";
			console.log("hideDataTable(hidden)");
		  }		
	}
	

    function resetFilters() {
        const worksheet = getSelectedSheet(tableau.extensions.settings.get('sheet'));
        filteredColumns.forEach(function(columnName) {
            worksheet.clearFilterAsync(columnName);
        });

        filteredColumns = [];
    }

    function getSelectedSheet(worksheetName) {
        if (!worksheetName) {
            worksheetName = tableau.extensions.settings.get('sheet');
        }

        // Go through all the worksheets in the dashboard and find the one we want
        return tableau.extensions.dashboardContent.dashboard.worksheets.find(function(sheet) {
            return sheet.name === worksheetName;
        });
    }
})();