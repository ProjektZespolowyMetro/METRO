import networkx as nx
import osmnx as ox
import distance
import os
from datetime import timedelta

import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
import osmnx as ox

def write_graph_image_to_file(G, file_path):
    fig, ax = ox.plot.plot_graph(
        G,
        show=False,
        save=True,
        filepath="graph.png",
        close=True
    )

def preprare_graph(city, country, network_type='drive', save_graph = True):    
    
    def convert_name(city, country):
        return f"{city}, {country}"    

    filename = f"{city}{country}.graphml"

    if os.path.exists(filename):

        G = ox.load_graphml(filename)
    else:
        place_name = convert_name(city, country)

        G = ox.graph_from_place(place_name, network_type=network_type)
        G = ox.add_edge_speeds(G)
        G = ox.add_edge_travel_times(G)

        if save_graph:
            ox.save_graphml(G, f"{city}{country}.graphml")

    return G

def process_data(G, data):
    result = [['ID', 'Location1', 'Location2', 'Distance_km', 'Travel_Time_hr']]
    idx = 1

    for i in range(1, len(data)):
        for j in range(1, len(data)):
            if i == j:
                continue
            
            origin_coordinates = (float(data[i][2]), float(data[i][3]))
            destination_coordinates = (float(data[j][2]), float(data[j][3]))

            # # In the graph, get the nodes closest to the points
            origin_node = ox.nearest_nodes(G, Y=origin_coordinates[0], X=origin_coordinates[1])
            destination_node = ox.nearest_nodes(G, Y=destination_coordinates[0], X=destination_coordinates[1])

            route = ox.shortest_path(G, origin_node, destination_node, weight='travel_time')

            if route:
                
                route_gdf = ox.routing.route_to_gdf(G, route, weight='travel_time')
                
                travel_time_seconds = route_gdf['travel_time'].sum()
                distance_meters = route_gdf['length'].sum()

                from datetime import timedelta

                record = [idx, data[i][1], data[j][1], distance_meters / 1000, str(timedelta(seconds=travel_time_seconds))]
                
                result.append(record)
            else:
                print("Nie znaleziono trasy.")

            idx += 1
    
    return result

            # # Get the shortest route by distance
            # shortest_route_by_distance = ox.shortest_path(G, origin_node, destination_node, weight='length')

            # # Plot the shortest route by distance
            # fig, ax = ox.plot_graph_route(G, shortest_route_by_distance, route_color='y', route_linewidth=6, node_size=0)

            # # Get the shortest route by travel time
            # shortest_route_by_travel_time = ox.shortest_path(G, origin_node, destination_node, weight='travel_time')

            # # Plot the shortest route by travel time
            # fig, ax = ox.plot_graph_route(G, shortest_route_by_travel_time, route_color='y', route_linewidth=6, node_size=0)

            # # Plot the 2 routes
            # fig, ax = ox.plot_graph_routes(G, routes=[shortest_route_by_distance, shortest_route_by_travel_time], route_colors=['r', 'y'], route_linewidth=6, node_size=0)

            # # Get the travel time, in seconds
            # # Note here that we use "nx" (networkx), not "ox" (osmnx)
            # travel_time_in_seconds = nx.shortest_path_length(G, origin_node, destination_node, weight='travel_time')
            # # print("travel time in seconds", travel_time_in_seconds)

            # #The travel time in "HOURS:MINUTES:SECONDS" format
            # travel_time_in_hours_minutes_seconds = str(timedelta(seconds=travel_time_in_seconds))
            # print("travel time in hours minutes seconds", travel_time_in_hours_minutes_seconds)

            # # Get the distance in meters
            # distance_in_meters = nx.shortest_path_length(G, origin_node, destination_node, weight='length')
            # print("distance in meters", distance_in_meters)
            # # Distance in kilometers
            # distance_in_kilometers = distance_in_meters / 1000
            # print("distance in kilometers", distance_in_kilometers)




def process(file_name='data.csv', separator=','):
    FILENAME = file_name
    SEPARATOR = separator
    CITY = "Kraków"
    COUNTRY = "Poland" 


    G = preprare_graph(CITY, COUNTRY)

    data = distance.read_csv(FILENAME, SEPARATOR)
    processed_data = process_data(G, data)

    distance.write_csv("roads_distance_speed_output.csv", processed_data, SEPARATOR)