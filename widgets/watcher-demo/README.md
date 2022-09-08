# watcher-demo widget

## example demonstrating inter-widget communication using shared resources, e.g. MapView, DataSource

Objective is to be able to respond to changes in map extent or datasource filter changes.

watch the [MapView](https://developers.arcgis.com/javascript/latest/api-reference/esri-views-MapView.html) extent property and the [QueriableDataSource](https://developers.arcgis.com/experience-builder/api-reference/jimu-core/QueriableDataSource)'s [getCurrentQueryParams][https://developers.arcgis.com/experience-builder/api-reference/jimu-core/QueriableDataSource#getCurrentQueryParams].

The problem with this approach is errors when calling getCurrentQueryParams in setting up the [watch](https://developers.arcgis.com/javascript/latest/api-reference/esri-core-reactiveUtils.html)

Retrieving the layer from the MapView and watching it's layerDefinition property works but requires setting layer name as separate property
