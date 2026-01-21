from core.DataProvider import DataProviderStrategy  # Zmień z:  from DataProvider
from core.SearchStrategy import SearchStrategy      # Zmień z: from SearchStrategy

class BusTramHandler:
    def __init__(self, data_provider: DataProviderStrategy, search_engine: SearchStrategy):
        self.data_provider = data_provider
        self.search_engine = search_engine
    
    def initialize(self):
        data = self.data_provider.load_stations()        
        self.search_engine.prepare_data(data)

    def find_closest_station(self, lat, lon, label = {"bus", "tram"}):
        return self.search_engine.find_nearest(lat, lon, label)