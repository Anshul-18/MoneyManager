# Money Manager Database Setup

This document provides instructions for setting up persistent storage for the Money Manager application.

## H2 Database Configuration

The application is configured to use H2 database in file mode. The database file will be stored in the `data` directory at the root of your project folder.

## Database File Location

- Database files will be created in: `./data/moneymanagerdb.mv.db`
- If you need to back up your data, you can copy this file.

## Troubleshooting

If you encounter issues with the database:

1. **Missing Database Directory**: Create a `data` directory in your project root if it doesn't exist:
   ```
   mkdir data
   ```

2. **Permission Issues**: Ensure your application has write permissions to the `data` directory.

3. **Database Corruption**: If the database becomes corrupted, delete the files in the `data` directory and restart the application. The schema will be recreated, but you'll need to recreate your data.

## Accessing the H2 Console

1. Start your application
2. Go to: http://localhost:8080/h2-console
3. Use the following settings:
   - JDBC URL: `jdbc:h2:file:./data/moneymanagerdb`
   - Username: `sa`
   - Password: leave empty

## Default Users

The application creates two default users:
1. **Admin**: Username `admin`, Password `admin123`
2. **Sample User**: Username `john_doe`, Password `password123`