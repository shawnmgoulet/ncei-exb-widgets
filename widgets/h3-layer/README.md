# h3-layer

## widget which constructs a client-side layer based on H3 tiles

Each tile has an attribute for the H3 index and a count of the points within that tile. Tiles are updated when the DataSource filter is changed
by another widget. Each change triggers a query to the hosted feature layer which includes the filter definition and returns a CSV list of index
id and count. These values update the client-side layer, populate the popup content, and are used in the symbology. Clicking on a tile triggers a
series of requests back to the server to aggregate stats for that particular tile like depth distribution, relative percentages of corals/sponges,
and a breakdown by taxon. This reporting may be delagated to a separate widget instead.

