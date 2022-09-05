# subscriber-demo widget

## example demonstrating inter-widget communication using framework [Message](https://developers.arcgis.com/experience-builder/api-reference/jimu-core/Message)

Objective is to be able to respond to changes in map extent or datasource filter changes, e.g. EXTENT_CHANGE, DATA_SOURCE_FILTER_CHANGE. Listens for other message types and logs to console but does not pass information to widget.

Message producers, e.g. Map and Filter widgets, must be configured to send messages to this widget and there is no configuration available for it directly. It is a functional component which uses the useSelector Redux hook to read widget state changes. The message handler receives the framework message, sets some widget state which causes the widget to re-render with the updated map extent and DataSource queryParams values.
