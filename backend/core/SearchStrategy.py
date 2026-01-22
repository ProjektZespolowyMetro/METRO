import abc
import json
import math

class SearchStrategy(abc.ABC):
    @abc.abstractmethod
    def prepare_data(self, stations_list: list):
        """
        Tutaj algorytm przygotowuje dane pod siebie.
        BruteForce tylko je zapisze.
        KDTree tutaj zbuduje drzewo.
        """
        pass

    @abc.abstractmethod
    def find_nearest(self, lat, lon, label = {"bus", "tram"}):
        """
        Zwraca (najblizszy_przystanek, dystans)
        """
        pass


class BruteForceSearch(SearchStrategy):

    def __init__(self):
        self.stations = []

    def prepare_data(self, stations_list: list):
        self.stations = stations_list

    def find_nearest(self, lat, lon, label = {"bus", "tram"}):
        best_station = None
        min_dist = float('inf')

        for station in self.stations:
            if station["type"] not in label:
                continue

            s_lat = station["coords"]["lat"]
            s_lon = station["coords"]["lon"]
            
            curr_dist = math.sqrt((s_lat - lat)**2 + (s_lon - lon)**2)

            if curr_dist < min_dist:
                min_dist = curr_dist
                best_station = station
        
        return best_station, min_dist