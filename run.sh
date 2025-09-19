#!/bin/bash
# Build and run the Money Manager application

echo "Building the Money Manager application..."

# Clean and compile
./mvnw clean compile

# Package the application
./mvnw package -DskipTests

echo "Starting the Money Manager application..."
java -jar target/moneymanager-0.0.1-SNAPSHOT.jar

echo "Money Manager application is running!"