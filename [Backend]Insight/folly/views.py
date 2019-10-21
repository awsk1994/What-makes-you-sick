from django.shortcuts import render
from django.http import HttpResponse

from pymongo import MongoClient

import pandas as pd
import numpy as np
import folium
import json
import random

from datetime import datetime
from datetime import timedelta
import time

import collections
from folium.plugins import HeatMap

def get_colors(N):
    """
    Params :
        N : integer
            Number of colors needed
    Returns :
        colors : list
            List of randomly generated colors
    """
    colors=[]
    for i in range(0,N):
        colors.append('#{:06x}'.format(random.randint(0, 256**3)))
    return colors

def draw_clusters_on_map_2(map_clusters, data, percentage, labels, base_latitude, base_longitude, color):
    """
    Params :
        df : pandas dataframe
            normalized data
        labels : string list
            labels of crimes
        base_latitude : float
                latitude of map center
        base_longitude : float
                longitude of map center
    Returns :
        map : HTML code
            Folium object rendered as html
    """
    # set color scheme for the clusters

    # map_clusters.save(outfile=map_name+".html")
    #return map_clusters


def draw_clusters_on_map(df,labels,base_latitude,base_longitude):
    """
    Params :
        df : pandas dataframe
            normalized data
        labels : string list
            labels of crimes
        base_latitude : float
                latitude of map center
        base_longitude : float
                longitude of map center
    Returns :
        map : HTML code
            Folium object rendered as html
    """
    map_clusters = folium.Map(location=[base_latitude, base_longitude], zoom_start=11)
    count = 0
    # set color scheme for the clusters
    k=len(labels)
    total=len(df['reason'].values)
    rainbow=get_colors(k)
    for cluster in range(0,k):
        percentage = "%.2f%%" % (count[cluster]/total)
        group = folium.FeatureGroup(name='<span style=\\"color: {0};\\">{1}</span>'.format(rainbow[cluster-1],labels[cluster]+" ("+ percentage +")"))

        for lat, lon,label in zip(df['latitude'], df['longitude'], df['reason']):
            if int(label) == cluster:
                label = folium.Popup('Clustering ' + str(labels[cluster]), parse_html=True)
                folium.CircleMarker(
                    (lat, lon),
                    radius=5,
                    popup=label,
                    color=rainbow[cluster-1],
                    fill=True,
                    fill_color=rainbow[cluster-1],
                    fill_opacity=0.7).add_to(group)
        group.add_to(map_clusters)

    folium.map.LayerControl('topright', collapsed=False).add_to(map_clusters)
    # map_clusters.save(outfile=map_name+".html")
    return map_clusters._repr_html_()

def get_random_dataframe(base_latitude, base_longitude, labels, num_examples, columns):
    """
    Params :
        base_latitude : float
                latitude of map center
        base_longitude : float
                longitude of map center
        labels : string list
            labels of crimes
        num_examples : int
            number of examples to be generated
        columns : string list
            column names of data frame
    Returns :
        df : pandas dataframe
            data
    """
    num_labels=len(labels)
    geo_data=np.random.randint(0,1000,size=(num_examples, 2))/10000
    geo_data[:,0]+=base_latitude
    geo_data[:,1]=base_longitude-geo_data[:,1]

    labels_data=np.random.randint(0,num_labels,size=(num_examples, 1))
    data=np.column_stack((geo_data,labels_data))

    df = pd.DataFrame(data, columns=columns)
    df[columns[len(columns)-1]]=df[columns[len(columns)-1]].astype(int)
    return df

def heat_map(df,base_latitude, base_longitude):
    """
    Params :
        df : pandas dataframe
            data
        base_latitude : float
                latitude of map center
        base_longitude : float
                longitude of map center
    Returns :
    map : HTML code
            Folium object rendered as html
    """
    base_map = folium.Map(location=[base_latitude, base_longitude], zoom_start=11)
    HeatMap(data=df[["latitude", "longitude" , "reason"]].groupby(["latitude", "longitude"]).mean().reset_index().values.tolist(),
    radius=8, max_zoom=13).add_to(base_map)
    return base_map._repr_html_()

def get_datafromdb(data,columns, labels):
    """
    Params :
        data : MongoDB object
                patient data
        columns : string list
            column names of data frame
        labels : string list
            list of crime types
    Returns :
        df : pandas dataframe
            data
    """
    mappingdict = {}
    for i,label in enumerate(labels):
        mappingdict.update({label:i})

    df= pd.DataFrame(columns=columns)
    for dat in data:
        if(dat):
            df2=pd.DataFrame(dat,index=[0])
            df2=df2[columns]
            df2['reason']=mappingdict[df2['reason'].values[0]]
            # print(df2)
            df=df.append(df2, ignore_index=True)
    df['reason']=df['reason'].astype(int)
    # drop time from df['time']
    df['time'] =  pd.to_datetime(df['time']) #, format='%d%b%Y:%H:%M:%S.%f')
    return df

def dsv_map(df, base_latitude, base_longitude, time_start, time_end):
    """
    Params :
        df : pandas dataframe
            data
        base_latitude : float
                latitude of map center
        base_longitude : float
                longitude of map center
        time_start : datetime object
                start date of query
        time_end : datetime object
            end date of query
    Returns :
        map : html object
            disease spread vector map
    """
    points=get_dsv_points(df,time_start, time_end)
    return draw_dsv(points,base_latitude,base_longitude)

def draw_dsv(points,base_latitude, base_longitude):
    """
    Params :
        points : float 2x1 list
            data points to be plotted
        base_latitude : float
                latitude of map center
        base_longitude : float
                longitude of map center
    Returns :
        map : html object
            disease spread vector map
    """
    my_map = folium.Map(location=[base_latitude, base_longitude], zoom_start=11)
    # folium.TileLayer('cartodbdark_matter').add_to(my_map)
    folium.Marker(points[0]).add_to(my_map)
    folium.PolyLine(points, color="red", weight=3.5, opacity=1).add_to(my_map)
    return my_map._repr_html_()

def get_days_range(time_start, time_end):
    c = time_end-time_start
    return c.days

def get_points(df,time_start,num_days):
    # compare only date without time
    target_date=time_start+timedelta(days=num_days)

    # print(df["time"])
    # df['year']=df['time'].dt.year#.astype(int)
    # df['month']=df['time'].dt.month#.astype(int)
    # df['day']=df['time'].dt.day
    # print("target_date year type",type(target_date.year))
    # print("int data type",type(1))
    # print("df type",type(df["year"]))
    df = df[df['time'].dt.year == target_date.year]
    df = df[df['time'].dt.month == target_date.month]
    df = df[df['time'].dt.day == target_date.day]

    # and df['time'].dt.month == int(target_date.month) ]
    # and df['day'] == target_date.day )#+timedelta(days=num_days) )# start_date) & (df['time'] <= end_date)

    # df = df[mask]
    # print("df at get points",df)
    # df=df[df['time'] == time_start+timedelta(days=num_days)]
    points=np.column_stack((df['latitude'].values,df['longitude'].values))
    # point = df[["latitude", "longitude"]]
    # print("points from get points",points)
    return points

def get_dsv_points(df,time_start, time_end):
    num_days = get_days_range(time_start, time_end)
    plotting_points=[]
    for i in range(num_days):
        # per day points
        points=get_points(df,time_start,i)
        # find center
        if(len(points)):
            plotting_points.append(np.mean(points,axis=0).tolist())
    return plotting_points

def driver_code(category,base_latitude,base_longitude, data, time_start, time_end):
    """
    Params to get : labels, columns, num_examples, df
    testing the folium code
    """
    assert type(base_latitude) is float and type(base_longitude) is float and type(category) is int
    assert type(time_start) is datetime and type(time_end) is datetime

    labels=np.array(["Overdoses", "E.Coli", "Flu", "Colera"])

    columns=np.array(['latitude','longitude','reason', 'time'])

    # num_examples=100
    # df=get_random_dataframe(base_latitude, base_longitude, labels, num_examples, columns)

    # include the data_frame time values

    df= get_datafromdb(data, columns, labels)
    print(df.values)
    if(category==0):
        return draw_clusters_on_map(data, labels, base_latitude, base_longitude)
    elif(category==1):
        return heat_map(df,base_latitude, base_longitude)
    elif(category==2):
        return dsv_map(df, base_latitude, base_longitude, time_start, time_end)

def index(request):
    # Boston coordinates
    # base_latitude = 42.3397
    # base_longitude = -71.1352

    category = int(request.GET.get("category")) # 0: cluster_map 1: heat_map 2: DSV map
    time_start = request.GET.get("time_st")
    time_end = request.GET.get("time_end")
    time_start = datetime.strptime(time_start, '%Y-%m-%d')
    time_end = datetime.strptime(time_end, '%Y-%m-%d')

    #filters results per time frame

    center_lat = 42.3397 #float(request.GET.get("c_lat"))
    center_long = -71.1352#float(request.GET.get("c_long"))

    client = MongoClient("mongodb+srv://insight:insight@cluster0-ixccp.mongodb.net/test?retryWrites=true&w=majority")
    table = client.hacked.er_patient_data
    random.seed(27)
    # For heatmap
    if category == 0:
        labels = ["Overdoses", "E.Coli", "Flu", "Colera"]
        n = table.find({}).count()
        mc = folium.Map(location=[center_lat, center_long], zoom_start=13)
        colors = get_colors(len(labels))
        for k, label in enumerate(labels):
            data = table.find({"reason": label, "time": {"$gte": time_start, "$lt": time_end}}, {"name": 0, "location": 0})
            percentage = "%.2f%%" % (data.count()/n)
            group = folium.FeatureGroup(name='<span style=\\"color: {0};\\">{1}</span>'.format(colors[k], label +" ("+ percentage +")"))

            for d in data:
                popup = folium.Popup('Clustering ' + label, parse_html=True)
                lat, lon = d["latitude"], d["longitude"]

                folium.CircleMarker(
                    (lat, lon),
                    radius=3,
                    popup=popup,
                    color=colors[k],
                    fill=True,
                    fill_color=colors[k],
                    fill_opacity=0.7).add_to(group)
            group.add_to(mc)
        folium.map.LayerControl('topright', collapsed=False).add_to(mc)

        return HttpResponse(mc._repr_html_())
    elif category == 1:
        #data = table.find({})

        data = table.aggregate([{"$match": {"time": {"$gte": time_start, "$lt": time_end}}}, {"$group": {"_id": {"latitude": "$latitude", "longitude":"$longitude"}, "count": {"$avg": 1}}}])
        #data = table.group(key={"$latitude": 1, "$longitude": 1}, condition={"mean"})
        heat_map_data = [[d["_id"]["latitude"], d["_id"]["longitude"], d["count"]] for d in data]
        #for d in data:
        #    print(d["_id"], d["count"])
        base_map = folium.Map(location=[center_lat, center_long], zoom_start=13)
        HeatMap(data=np.array(heat_map_data), radius=8, max_zoom=15).add_to(base_map)
        return HttpResponse(base_map._repr_html_())
    else:
        # return HttpResponse(driver_code(category, center_lat, center_long, data))
        data = table.find({})
        # print(data[0]['longitude'])
        return HttpResponse(driver_code(category, center_lat, center_long, data, time_start, time_end))

