# LNU Event Tracker & Facilities Reservation System

## Requirements
- PHP >= 8.2 (Required by Laravel 11/12)
- MySQL Database
- Node.js & NPM

## Setup Instructions

1.  **Environment Setup**
    - Copy `.env.example` to `.env` (already done).
    - Configure your database credentials in `.env`:
      ```
      DB_CONNECTION=mysql
      DB_HOST=127.0.0.1
      DB_PORT=3306
      DB_DATABASE=venuevisor
      DB_USERNAME=root
      DB_PASSWORD=
      ```

2.  **Install Dependencies**
    ```bash
    composer install
    npm install
    ```

3.  **Database Migration & Seeding**
    - Create the database `venuevisor` in MySQL.
    - Run migrations and seeders:
    ```bash
    php artisan migrate --seed
    ```
    - This will create an Admin user: `admin@lnu.edu.ph` / `password`

4.  **Run the Application**
    - Start the backend server:
    ```bash
    php artisan serve
    ```
    - Start the frontend build process:
    ```bash
    npm run dev
    ```
    - Access the app at `http://localhost:8000`.

## Troubleshooting
- **PHP Version**: This project requires PHP 8.2 or higher. If you are using Laragon with an older PHP version (e.g., 8.1), you must upgrade PHP or the application will not run.
- **API Routes**: If API routes return 404, ensure `routes/api.php` is registered in `bootstrap/app.php` (this has been configured).
