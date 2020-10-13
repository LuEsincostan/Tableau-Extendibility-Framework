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
			
			//ACtual dataset, Column Names, Wafer Id (can change in it's position, so create a loop instead)			
			sendOneWaferToPython(data,columns,data[0][1]);
			

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
	
	function sendDataTableToPython1() {
		console.log("sendDataTableToPython1");
				
	
		// setup some JSON to use
		var waferList1 = [
		{ "type":"wafer", "id":"C92685.1"},
		{ "type":"wafer2", "id":"C92685.2" },
		{ "type":"no wafer","id": "C92685.3" }
		];
		
			console.log("doWork function called");
			// ajax the JSON to the server
			$.post("receiver", JSON.stringify(waferList1), function(){

			});
			// stop link reloading the page
		 event.preventDefault();
		
		
	}
	
	
	
	function sendOneWaferToPython(data,columns,oneWafer) {
		console.log("sendOneWaferToPython");
		console.log("oneWafer: "+ oneWafer);
		console.log("data within sending function: ");
		console.log(data);
	
	
		// setup some JSON to send to Python
		var waferList = [
			{ "waferId":oneWafer, "columns":columns, "data":data}
		];
		
		console.log("setup some JSON to send to Python");
		// ajax the JSON to the server
		$.post("receiver", JSON.stringify(waferList), function(){

		});
		/**/
		
		
		
		
		//setup some JSON to send to PHP
		var pureWaferData = [
			{"data":data}
		];
		
				
		console.log(pureWaferData);
		
		
				$.post("http://localhost:8888/extensions-api-master/myExtensions/Wafer-Work/waferExample/static/php/writeWaferToDb.php", JSON.stringify(pureWaferData), function(){

		});
		
		
/*
		$.post('static/php/writeWaferToDb.php',{
            name:"customerName",
            cluster:"clusterName",
            userinput:"userInput",
          },			
			function(data)  {
				$('#result').html(data);
		});	
		
		
		$.ajax({
            type : "POST",  //type of method
            url  : "static/php/writeWaferToDb.php",  //your page
            data : { name:"customerName", cluster:"clusterName", userinput:"userInput" },// passing the values
            success: function(res){  
                              console.log("Successfully called POST function to PHP");
						}
			});
	*/	
		
		
		
		
		$.post('http://localhost:8888/extensions-api-master/myExtensions/Wafer-Work/waferExample/static/php/writeWaferToDb.php',{
            name:"customerName",
            cluster:"clusterName",
            userinput:"userInput",
            checkbox:"checkBox",
            measure:"selectedMeasure",
          },
				
	
				
				function(data)  {
					$('#result').html(data);
				});
		 console.log("setup some JSON to send to PHP");
		//refreshSheet();
		//return cell.formattedValue;
		
		
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





  function writeBackMarks (selectedDataTable) {
	  var i = 0;
	  console.log("2. writeBackMarks");
				//Cluster Name from the first Column
				//var clusterName = selectedDataTable[0][0].formattedValue;
				var clusterName = document.getElementById("user_input").value;

				//1te Spalte = customerName
				console.log(selectedDataTable[0][0].formattedValue + ': selectedDataTable[0][1].formattedValue');
				var customerName = selectedDataTable[0][0].formattedValue;
				//var customerName = "Neal Wolfe";


       // var checkBox = document.getElementById("user_input").value;
        var userInput = document.getElementById("data_table_text_0").value;
        var checkBox = document.getElementById("data_table_checkbox_0").checked;

        //Measure needs to be the 3rd column in this setup!!!
        //var selectedMeasure = selectedDataTable[0][2].formattedValue;
        var selectedMeasure = 9999;
				
				
				//alert("customerName:" +customerName);
			//	alert("INFO: The Customer is now part of the Database.");
				
		//alert("tableau.extensions.dashboardContent.dashboard.worksheets.get(sheetMySql);: "+tableau.extensions.dashboardContent.dashboard.worksheets.get("sheetMySql"););
		
		$.post('php/writeWaferToDb.php',{
            name:customerName,
            cluster:clusterName,
            userinput:userInput,
            checkbox:checkBox,
            measure:selectedMeasure,
          },
				
	 
				
				function(data)  {
					$('#result').html(data);
				});
			refreshSheet();
			//return cell.formattedValue;
        }