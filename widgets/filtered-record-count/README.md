# filtered-record-count widget

Objective is to display the total record count of the configured DataSource and the count considering the current map extent and any filter criteria (i.e. layerDefinition query).

Requires an Map and DataSource be configured. Widget attempts to catch server-side errors and timeouts in which case an generic server error message replaces the count display.
