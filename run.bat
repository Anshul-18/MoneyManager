@echo off
echo Building the Money Manager application...

REM Clean and compile
call mvnw clean compile

REM Package the application
call mvnw package -DskipTests

echo Starting the Money Manager application...
java -jar target/moneymanager-0.0.1-SNAPSHOT.jar

echo Money Manager application is running!