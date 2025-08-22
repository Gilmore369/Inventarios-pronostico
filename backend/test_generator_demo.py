from test_data_generator import TestDataGenerator

gen = TestDataGenerator()
datasets = gen.generate_test_datasets()

print(f"Generated {len(datasets)} datasets:")
for name, dataset in datasets.items():
    print(f"  {name}: {len(dataset['data'])} points, type: {dataset['type']}")