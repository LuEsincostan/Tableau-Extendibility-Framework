# -*- coding: utf-8 -*-
"""
Created on Fri Aug  7 08:21:04 2020

@author: KRS1BBH
"""

import matplotlib.pyplot as plt
import json
import pandas as pd
import numpy as np
from scipy.interpolate import griddata
import math

#set method and path
method='cubic'
path='C:/xampp/htdocs/extensions-api-master/myExtensions/Wafer-Work/waferExample/static/wafer-images/'

#import json data
f=open(path+'waferId_F05758.4_2.json')
df_in=json.load(f)
df=pd.json_normalize(df_in)
#define standard columns
columns_std=['Wafer Id','X','Y']
#convert json dictionary into pandas df
columns=list(pd.DataFrame.from_dict(df['columns'][0])['title'])                                                 
df_pandas=pd.DataFrame(df['data'][0],columns=columns,dtype='float')
#define columns to plot and distinguish between wafers
plot_columns=[x for x in columns if x not in columns_std]
wafers=df_pandas['Wafer Id'].drop_duplicates()
for wafer in wafers:
    for feature in plot_columns:
        #plot wafermap
        plt.figure(figsize=(10,8))
        r = 100 #Waferradius
        rnutz =95 #Nutzchipradius
        rnotch=2 #Notchradius
        # define grid.
        xi = np.linspace(-r,r,200)
        yi = np.linspace(-r,r,200)
        # grid the data.
        zi = griddata((df_pandas['X'], df_pandas['Y']), df_pandas[feature], (xi[None,:], yi[:,None]), method=method)
        # contour the gridded data, plotting dots at the real data points.
        CS = plt.contour(xi,yi,zi,100,linewidths=0.1,colors='k')
        CS = plt.contourf(xi,yi,zi,100,cmap=plt.cm.jet)
        cb = plt.colorbar().set_label(feature, fontsize=15) # draw colorbar
        # plot data points.
        CS = plt.scatter(df_pandas['X'], df_pandas['Y'],marker='o',c='Black',s=4)  # c=(0,0,0) ist schwarz (RGB)
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
        plt.savefig(path+wafer+'_'+feature+'_map.png', dpi=600)
        plt.show()
        #create dataframe from griddata
        data_ip=[]
        for x in range(len(xi)):
            for y in range(len(yi)):
                data_ip.append([xi[x],yi[y],zi[x,y]])
        data_ip_exp=pd.DataFrame(data_ip, columns=['x','y',feature]).dropna()
        #export interpolated daata
        data_ip_exp.to_excel(path+wafer+'_'+feature+'_data_int.xlsx')
