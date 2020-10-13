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
		console.log("Instead of filtering the function 'filterOnAnArray()' is currently setting a single parameter so that the query cache gets bypassed");	
		parameterArray[0].changeValueAsync(filterArray[0]);
	});
  
}

