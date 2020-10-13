--insert test line in wafer table

INSERT INTO wafer ("id", "wafer_id", "feature", "method") VALUES (2, 'C1234.5', 'AVG(Feature)', 'cubic');
COMMIT

--emoty all tables
DELETE FROM wafer
WHERE 1=1;

DELETE FROM wafer_geom
WHERE 1=1;

DELETE FROM wafer_grid
WHERE 1=1;

--check number of lines written to wafer table
SELECT COUNT( DISTINCT("id")) from wafer
WHERE "wafer_id"= 'C1234.6' AND "feature" = 'AVG(Feature)' AND "method" = 'cubic';

