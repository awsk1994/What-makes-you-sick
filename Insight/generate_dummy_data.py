import datetime
import random
import time

import pymongo
from pymongo import MongoClient

first_names = [l.strip() for l in open("first_names.txt", "r").readlines()]
last_names = [l.strip() for l in open("last_names.txt", "r").readlines()]
purposes = [l.strip() for l in open("purposes.txt", "r").readlines()]

def str_time_prop(start, end, format, prop):
    """Get a time at a proportion of a range of two formatted times.

    start and end should be strings specifying times formated in the
    given format (strftime-style), giving an interval [start, end].
    prop specifies how a proportion of the interval to be taken after
    start.  The returned time will be in the specified format.
    """

    stime = time.mktime(time.strptime(start, format))
    etime = time.mktime(time.strptime(end, format))

    ptime = stime + prop * (etime - stime)

    #return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.localtime(ptime))
    #return time.strftime("%Y-%m-%dT%H:%M:%S.000+00:00", time.localtime(ptime))
    return datetime.datetime.fromtimestamp(ptime)
    #"%Y-%m-%dT%H:%M:%S.%f+00:00"
    #04:00:00.000+00:00


def random_date(start, end, prop):
    return str_time_prop(start, end, '%m/%d/%Y %I:%M %p', prop)

client = MongoClient("mongodb+srv://shawnlin:tomlin17@cluster0-ixccp.mongodb.net/test?retryWrites=true&w=majority")
table = client.hacked.er_patient_data

favorite_spots = [(42.354333, -71.132391), (42.348460, -71.084169), (42.400346, -71.116702), (42.332691, -71.091646)]
diseases = ["Overdoses", "E.Coli", "Flu", "Colera"]
# Overdoses, E.coli,
for disease, spot in zip(diseases, favorite_spots):
    for _ in range(30):
        lat_err = random.random(-0.001, 0.001)
        long_err = random.random(-0.005, 0.005)
        longitude = spot[1] + long_err
        latitude = spot[0] + lat_err
        #latitude = random.uniform(42.3, 42.43)
        name_idx = random.randint(0,999)
        #puarpose_idx = random.randint(0, len(purposes)-1)
        name = first_names[name_idx] + " " + last_names[name_idx]
        purpose = disease
        dt = random_date("9/1/2019 1:30 PM", "10/20/2019 2:50 AM", random.random())

        print("long/lat:", longitude, latitude)
        print("name:", name)
        print("purpose:", purpose)
        print("datetime", dt)

        table.insert_one({
            "name": name,
            "time": dt,
            "reason": purpose,
            "latitude": latitude,
            "longitude": longitude,
            "location": "Boston"}
        )
