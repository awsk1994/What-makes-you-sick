import pandas as pd
import numpy as np
import folium

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
        colors.append('#{:06x}'.format(np.random.randint(0, 256**3)))
    return colors

def draw_clusters_on_map(df,labels,base_latitude,base_longitude,map_name):
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
        map_name : string
                name of map to be generated
    """    
    map_clusters = folium.Map(location=[base_latitude, base_longitude], zoom_start=11)
    
    # set color scheme for the clusters
    k=len(labels)
    rainbow=get_colors(k)
    for cluster in range(0,k): 
        group = folium.FeatureGroup(name='<span style=\\"color: {0};\\">{1}</span>'.format(rainbow[cluster-1],cluster))
        for lat, lon,label in zip(df['latitude'], df['longitude'], df['crime_label']):
            if int(label) == cluster: 
                label = folium.Popup('Cluster ' + str(cluster), parse_html=True)
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
    map_clusters.save(outfile=map_name+".html")
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

def test():
    base_latitude = 42.3397
    base_longitude = -71.1352

    labels=np.array(['Drugs','Domestic Violence','Car accidents','Guns'])

    columns=np.array(['latitude','longitude','crime_label'])
    num_examples=100
    #update funtion
    df=get_random_dataframe(base_latitude, base_longitude, labels, num_examples, columns)
    
    map_name="outputs/folium_map"
    draw_clusters_on_map(df,labels,base_latitude,base_longitude,map_name)

if __name__ == "__main__":
    test()