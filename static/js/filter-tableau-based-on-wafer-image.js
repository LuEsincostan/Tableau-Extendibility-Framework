var dashboard;
var selectedWorksheet;
var fieldName;


tableau.extensions.initializeAsync().then(() => {
  console.log("Initialize Wafer Extension");

  //filterOnOneValue();
  //filterOnOneValue(selectedWorksheet, fieldName);
});



function filterOnAnArray(filterArray) {
  console.log("filterArray from filter-tableau-based-on-wafer-image.js: ");
  console.log(filterArray);

  let dashboard = tableau.extensions.dashboardContent.dashboard;
  let selectedWorksheet = dashboard.worksheets.find(w => w.name === 'Wafer');
  let fieldName = 'Wafer Id'; //'Wafer Id';  WaferIdParam
  

  //selectedWorksheet.applyFilterAsync(fieldName,filterArray,"replace",false);
  


	dashboard.getParametersAsync().then(function (parameterArray) {
		console.log("Instead of filtering the function 'filterOnAnArray()' is currently setting a single parameter so that the query cache gets bypassed for sure");	
		console.log("It might be faster to not go with custom SQL and leverage the 'filterOnAnArray()' function within 'static\js\filter-tableau-based-on-wafer-image' instead");
		
		for (let i = 0; i < parameterArray.length; i++) {
			//showing all parameters within the log
			console.log("parameterArray[i]: "+i);
			console.log(parameterArray[i].name);
			
			//filtering on "WaferIdParam" to push this down to the SQL
			if (parameterArray[i].name == "WaferIdParam") {
				parameterArray[i].changeValueAsync(filterArray[0]);
				console.log("Changed WaferIdParam to : "+filterArray[0]);
			}
		}		
	});
  
}

