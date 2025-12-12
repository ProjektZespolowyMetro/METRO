import csv
from geopy import distance


def read_csv(file_name, separator=','):
    data = []
    with open(file_name, mode='r', newline='', encoding='utf-8') as file:
        reader = csv.reader(file, delimiter=separator)
        for row in reader:
            data.append(row)

    return data

def calculate_distance(coord1, coord2):
    return float(distance.distance(coord1, coord2).km)

def process_data(data):
    result = [['ID', 'Location1', 'Location2', 'Distance_km']]
    
    idx = 1
    for i in range(1, len(data)):
        for j in range(1, len(data)):
            if i != j:

                coord1 = (float(data[i][2]), float(data[i][3]))
                coord2 = (float(data[j][2]), float(data[j][3]))

                dist = calculate_distance(coord1, coord2)                
                record = [idx, data[i][1], data[j][1], dist]

                result.append(record)
                idx += 1
            
    return result

def write_csv(file_name, data, separator='.'):
    with open(file_name, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file, delimiter=separator)
        writer.writerows(data)


def process(file_name='data.csv', separator=','):
    
    FILE_NAME =  file_name
    SEPARATOR = separator
    data = read_csv(FILE_NAME, SEPARATOR)


    print(data[1])
    processed_data = process_data(data)
    write_csv('distance.csv', processed_data, SEPARATOR)