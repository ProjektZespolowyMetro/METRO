import json
import abc

class DataProviderStrategy(abc.ABC):
    @abc.abstractmethod
    def load_stations(self) -> list:
        pass

class JsonFileProvider(DataProviderStrategy):
    def __init__(self, filename):
        self.filename = filename
        
    def load_stations(self) -> list:
        data = []
        with open(self.filename, 'r') as file:
            data = json.load(file)

        filtered_data = []
        for feature in data['features']:
            filtered_data.append({"name" : feature["properties"]["name"], "type": feature["type"], "coords": {"lat": feature["geometry"]["coordinates"][1], "lon": feature["geometry"]["coordinates"][0]}})

        self.data = filtered_data

        return self.data
