-- Create wafer table
CREATE TABLE public.wafer
(
    id integer NOT NULL,
    wafer_id character varying COLLATE pg_catalog."default",
    feature character varying COLLATE pg_catalog."default",
    method character varying COLLATE pg_catalog."default",
    CONSTRAINT wafer_pkey PRIMARY KEY (id)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;
ALTER TABLE public.wafer
    OWNER to admin;
--  Create table for wafer geometries	
CREATE TABLE public.wafer_geom
(
    poly_index integer,
    level double precision,
    area double precision,
    wafer character varying COLLATE pg_catalog."default",
    poly_geom geometry(Polygon,4326),
    id integer
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;
ALTER TABLE public.wafer_geom
    OWNER to admin;
-- Index: join_id_wafer_geom
-- DROP INDEX public.join_id_wafer_geom;
CREATE INDEX join_id_wafer_geom
    ON public.wafer_geom USING btree
    (id ASC NULLS LAST)
    TABLESPACE pg_default;	
	
	
-- Create table for grid data	
CREATE TABLE public.wafer_grid
(
    id bigint,
    x integer,
    y integer,
    level double precision
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;
ALTER TABLE public.wafer_grid
    OWNER to admin;