#!flask/bin/python

import sys

from flask import Flask, render_template, request, redirect, Response
import random, json
import matplotlib.pyplot as plt
import matplotlib
#non-interactive matplotlib mode to prevent errors in flask
matplotlib.use('agg')
import pandas as pd
import geopandas as gpd
import numpy as np
from scipy.interpolate import griddata
import math
import os.path
import psycopg2
from shapely import geometry, wkt
from sqlalchemy import create_engine
from geoalchemy2 import Geometry, WKTElement
from io import StringIO

#####DB info --> ADJUST TO YOUR DB CONNECTION!!!
db_host= 'localhost" 

db_name = 'wafer_ext_demo'
db_user = 'admin'
db_user_pw = 'postgres'

##### methods

def plot_and_export_wafer_maps(json_data, output_location):
	print("Start processing")
	method='cubic'
	#df_in=json.load(json_data)
	df=pd.json_normalize(json_data)
	#define standard columns
	columns_std=['Wafer Id','X','Y']
	#convert json dictionary into pandas df
	columns=list(pd.DataFrame.from_dict(df['columns'][0])['title'])                                                 
	df_pandas=pd.DataFrame(df['data'][0],columns=columns,dtype='float')
	#define columns to plot and distinguish between wafers
	plot_columns=[x for x in columns if x not in columns_std]
	wafers=df_pandas['Wafer Id'].drop_duplicates()
	
	exported_file_names = {}
	for wafer in wafers:
		i=0
		df_wafer = df_pandas.loc[df_pandas['Wafer Id'] == wafer]
		print('Wafer: ' +wafer)
		for feature in plot_columns:
			#create file name
			export_filename = wafer+'_'+feature+'_'+method+'.png'
			#First check if file has alreadby been generated
			print('Wafer-feature-method combination has already been plotted?: '+ str(os.path.exists(os.path.join(output_location, export_filename)==True)))
			if not os.path.exists(os.path.join(output_location, export_filename)):
				print("Start processing")
				#plot wafermap
				plt.figure(figsize=(10,8))
				r = 100 #Waferradius
				rnutz =95 #Nutzchipradius
				rnotch=2 #Notchradius
				# define grid.
				xi = np.linspace(-r,r,200)
				yi = np.linspace(-r,r,200)
				# grid the data.
				zi = griddata((df_wafer['X'], df_wafer['Y']), df_wafer[feature], (xi[None,:], yi[:,None]), method=method)
				# contour the gridded data, plotting dots at the real data points.
				CS = plt.contour(xi,yi,zi,100,linewidths=0.1,colors='k')
				CS = plt.contourf(xi,yi,zi,100,cmap=plt.cm.jet)
				cb = plt.colorbar().set_label(feature, fontsize=15) # draw colorbar
				# plot data points.
				CS = plt.scatter(df_wafer['X'], df_wafer['Y'],marker='o',c='Black',s=4)  # c=(0,0,0) ist schwarz (RGB)
				omega = np.linspace(rnotch/r,2*math.pi-rnotch/r,1000)
				xk=np.sin(omega)*r
				yk=-np.cos(omega)*r
				CS = plt.scatter(xk,yk,marker='o',c='Black',s=0.03)  #Waferradius plotten
				omega = np.linspace(0,2*math.pi,1000)
				xk=np.sin(omega)*rnutz
				yk=-np.cos(omega)*rnutz
				CS = plt.scatter(xk,yk,marker='o',c='Black',s=0.01)  #Nutzchipradius plotten
				omega = np.linspace(0,math.pi,20)
				xk=np.cos(omega)*rnotch
				yk=-r+np.sin(omega)*rnotch
				CS = plt.scatter(xk,yk,marker='o',c='Black',s=0.03)  #Notch plotten
				plt.title(wafer)
				plt.xlim(-r*1.05,r*1.05)
				plt.ylim(-r*1.05,r*1.05)
				plt.xlabel(r'x (mm)', fontsize=15)
				plt.ylabel(r'y (mm)', fontsize=15)
				#export picture
				export_file = os.path.join(output_location, export_filename)
				plt.savefig(export_file, dpi=600)
				#plt.show()
				#create dataframe from griddata
				data_ip=[]
				for x in range(len(xi)):
					for y in range(len(yi)):
						data_ip.append([xi[x],yi[y],zi[x,y]])
				data_ip_exp=pd.DataFrame(data_ip, columns=['x','y',feature]).dropna()
			print("Wafer: "+ wafer+"\tFeature: "+feature+"\tMethod: "+method+'\tadded to location or already exist')
			exported_file_names[wafer+'_'+str(i)] = export_filename
			i+=1
	return(exported_file_names)

def append_gdf_to_table(engine, dataframe, table_name):
	with engine.begin() as connection:
		dataframe.to_sql(table_name, connection, schema=None, if_exists='append', index=False, dtype={'poly_geom': Geometry('POLYGON')})

def create_db_engine(host, db, user, pw):
	#create connecton string
	server_url = "postgresql+psycopg2://"+user+":"+pw+"@"+host+":5432/"+db
	#create engine object to be used globally for all db transactions
	engine = create_engine(server_url, isolation_level="AUTOCOMMIT")
	return engine

def get_next_free_id(engine):
	#query wafer table to find maximum id
	with engine.begin() as connection:
		result = connection.execute("select coalesce(max(id), 0)+1 from wafer").scalar()
		return result

def add_data_to_wafer(engine, id, wafer_id, feature, method):
	#build INSERT statement to add data to table: wafer
	ins = f"""INSERT INTO wafer (id, wafer_id, feature, method) VALUES ({id}, '{wafer_id}', '{feature}', '{method}'); COMMIT"""
	#execute INSERT statement
	with engine.begin() as connection:
		result = connection.execute(ins)
	
def wfm_combination_exists_in_db(engine, wafer_id, feature, method):
	#check if wafer-festure-method combionaton does already exist in DB
	#build query returning the number of wfm combinatons
	query = f"""SELECT COUNT( DISTINCT("id")) from wafer
				WHERE "wafer_id"= '{wafer_id}'AND "feature" = '{feature}'AND "method" = '{method}';"""
	#execute query
	with engine.begin() as connection:
		result = connection.execute(query).fetchone()
		#return if number of wfm combinations is not zero
		return (result[0]!=0)

def df_to_database(engine, df, table_name, if_exists='append', sep='\x01', encoding='utf-8'):
	# Create Table
	df[:0].to_sql(table_name, engine, if_exists=if_exists, index=False, schema=None)

	# Prepare data
	output = StringIO()
	df.to_csv(output, sep=sep, header=False, encoding=encoding, index=False)
	output.seek(0)

	# Insert data
	connection = engine.raw_connection()
	cursor = connection.cursor()
	#schema_tablename = '{}.{}'.format(schema, table_name)
	cursor.copy_from(output, table_name,  sep=sep, null='', columns=('x', 'y', 'level', 'id'))
	connection.commit()
	cursor.close()

def write_grid_data_to_wafer_grid(engine, array, id):
	#import numpy array to a pd dataframe
	df_grid = pd.DataFrame(array)
	#materialize index
	df_grid.reset_index(inplace = True)
	
	#convert df to long form
	df_grid_long = df_grid.melt( id_vars=['index'])

	#rename columns to match schema
	df_grid_long.rename(columns={"index": "x", "variable":"y", "value":"level"}, inplace=True)
	#drop null values
	df_grid_long.dropna(how='any',inplace=True)
	#output the size of the data to be written to DB
	print(str(len(df_grid_long))+' grid values will be published')
	#add id column
	df_grid_long["id"] = id
	
	#write to DB
	df_to_database(engine, df_grid_long, 'wafer_grid')
	return("Success")


def export_wafer_data_to_db(json_data, engine):
	#remove CNT(Feature) 

	print("Start processing")	
	method='cubic'
	#df_in=json.load(json_data)
	df=pd.json_normalize(json_data)
	
	#define standard columns
	columns_std=['Wafer Id','X','Y']
	#define excluded columns
	columns_excl = ['CNT(Feature)']
	#convert json dictionary into pandas df
	columns=list(pd.DataFrame.from_dict(df['columns'][0])['title'])												 
	df_pandas=pd.DataFrame(df['data'][0],columns=columns,dtype='float')
	#define columns to plot and distinguish between wafers
	plot_columns=[x for x in columns if (x not in columns_std and x not in columns_excl)]
	wafers=df_pandas['Wafer Id'].drop_duplicates()
	wfm_combs_added_to_db = {}
	
	for wafer in wafers:
		#initiate feature count
		i=0
		df_wafer = df_pandas.loc[df_pandas['Wafer Id'] == wafer]
		for feature in plot_columns:
			#create wfm combination key
			wfm_comb_key = wafer+'_'+feature+'_'+method
			#check if processing is necessary

			print('Wafer-Feature-Method combination does already exist in DB?: '+str(wfm_combination_exists_in_db(engine, wafer, feature, method)))
			if wfm_combination_exists_in_db(engine, wafer, feature, method)==False:
				#feature should be processed
				print('Processing: '+wafer+'/'+feature)

				#get next free id to be assigned since festure will be added to DB
				next_free_id = get_next_free_id(engine)

				###populate core data to table:wafer
				add_data_to_wafer(engine, next_free_id, wafer, feature, method)

				#start processing data
				levels = []
				polys = []
				wafers = []
				areas = []
				r = .1

				# define grid.
				xi = np.linspace(-r,r,200)
				yi = np.linspace(-r,r,200)

				# grid the data.
				zi = griddata((df_wafer['X'] / 1000, df_wafer['Y'] / 1000), df_wafer[feature], (xi[None,:], yi[:,None]), method=method)	
				#writing grid data to DB
				print('Writing grid data to DB')
				status = write_grid_data_to_wafer_grid(engine, zi, next_free_id)
				print(status)
				#build contours, color scales and polygons
				qcs = plt.contourf(xi,yi,zi,100)
				for col, lev in zip(qcs.collections, qcs.levels):
					for contour_path in col.get_paths(): 
						for ncp,cp in enumerate(contour_path.to_polygons()):
							x = cp[:,0]
							y = cp[:,1]
							new_shape = geometry.Polygon([(i[0], i[1]) for i in zip(x,y)])
							if ncp == 0:
								poly = new_shape
							else:
								poly = poly.difference(new_shape)
						polys.append(poly.wkt)
						levels.append(lev)
						wafers.append(wafer)
						areas.append(poly.area)
				#
				#index polygons
				poly_index = list(range(len(polys)))
				#stack arrays
				data_to_insert = np.stack((poly_index, polys, levels, wafers, areas), axis = 1)
				#build pandas dataframe
				df_to_insert = pd.DataFrame({'poly_index': poly_index, 'polys': polys, 'level': levels, 'wafer':wafers, 'area':areas})
				#format geometry data
				df_to_insert['polys'] = df_to_insert['polys'].apply(wkt.loads)
				#add PK id to wafer table to dataframe
				df_to_insert['id'] = next_free_id
				
				
				#prepare geodataframe
				gdf_to_insert = gpd.GeoDataFrame(df_to_insert, geometry='polys')
				gdf_to_insert['poly_geom'] = gdf_to_insert['polys'].apply(lambda x: WKTElement(x.wkt, srid=4326))
				#drop duplicated column
				gdf_to_insert.drop('polys', 1, inplace=True)				
				#upload geo features to DB
				append_gdf_to_table(engine, gdf_to_insert, 'wafer_geom')
				##end of processing loop
		print("Wafer: "+ wafer+"\tFeature: "+feature+"\tMethod: "+method+'\tadded to DB or already exist')
		wfm_combs_added_to_db[wafer+'_'+str(i)] = wfm_comb_key
		i+= 1
				

	return wfm_combs_added_to_db







app = Flask(__name__)

@app.route('/')
def output():
	# serve index template
	return render_template('index.html', name='Test')

@app.route('/renderpictures', methods = ['POST'])
def worker():
	# read json + reply
	data = request.get_json(force=True)
	#
	#
	application_pictures = os.path.join("static", "wafer-images")

	result = plot_and_export_wafer_maps(data, application_pictures)
	print(result)
	return(result)

@app.route('/dataprocessor', methods = ['POST'])
def processor():
	# read json + reply
	data = request.get_json(force=True)
	#
	#create a db engine
	db_engine = create_db_engine(db_host, db_name, db_user, db_user_pw)
	#process data
	result = export_wafer_data_to_db(data, db_engine)
	print(result)
	return(result)

	# for item in data:
	# 	# loop over every row
	# 	print("\n \n++++++++++++++Data Types+++++++++++ \n \n")
	# 	print(type(item['waferId']))
	# 	print(type(item['columns'][0]))
	# 	print(type(item['data']))

	# 	waferId = str(item['waferId'])
	# 	columns = str(item['columns'])
	# 	data = str(item['data'])

	# 	print("\n \n++++++++++++++NEW SELECTION+++++++++++ \n \n")
	# 	print(type(waferId))
	# 	print(columns)
	# 	print(data)
		
	# 	if(1 == 1):
	# 		result += 'The selected Wafer within Python is: \n' + waferId
			
	# 	else:
	# 		result += 'One has got selected multiple Wafers: \n' + waferId
	# 		#Take array of waferIds and do process them (images + write into db)

	# return result

if __name__ == '__main__':
	# run!
	app.run(debug=True)
