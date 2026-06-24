# Backend Setup Guide

This guide will help you set up the backend server for the grievance portal application.

## 1. Prerequisites

- [Node.js](https://nodejs.org/) installed on your machine.
- [Postman](https://www.postman.com/downloads/) installed on your machine.

## 2. MongoDB Atlas Setup

1.  **Create a MongoDB Atlas Account:**
    -   Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up for a free account.

2.  **Create a New Project:**
    -   After signing in, create a new project. Give it a name (e.g., `GrievancePortal`).

3.  **Build a Database:**
    -   Click on "Build a Database".
    -   Choose the "Shared" plan (the free one) and click "Create".
    -   Choose a cloud provider and region (you can leave the defaults).
    -   You can also change the cluster name if you want. Then click "Create Cluster".

4.  **Configure Database Access:**
    -   While the cluster is being created, you need to configure database access.
    -   In the "Security" tab on the left, go to "Database Access".
    -   Click "Add New Database User".
    -   Enter a username and password. **Remember these credentials.**
    -   Under "Database User Privileges", select "Read and write to any database".
    -   Click "Add User".

5.  **Configure Network Access:**
    -   In the "Security" tab, go to "Network Access".
    -   Click "Add IP Address".
    -   For local development, you can allow access from anywhere by clicking "Allow Access From Anywhere". For production, you should restrict this to your server's IP address.
    -   Click "Confirm".

6.  **Get the Connection String:**
    -   Go back to "Database" in the left menu.
    -   Click the "Connect" button on your cluster.
    -   Choose "Connect your application".
    -   Make sure "Node.js" is selected as the driver.
    -   Copy the connection string. It will look something like this:
        ```
        mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
        ```
    -   Replace `<username>` and `<password>` with the credentials you created in step 4. You can also change `myFirstDatabase` to a more descriptive name, like `grievance-portal`.

## 3. Backend Configuration

1.  **Update the `.env` file:**
    -   Open the `backend/.env` file.
    -   Paste your MongoDB connection string as the value for `MONGO_URI`.
    -   Change `JWT_SECRET` to a long, random string. This is used to sign authentication tokens.

    ```.env
    MONGO_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/grievance-portal?retryWrites=true&w=majority
    JWT_SECRET=a_very_long_and_secret_string
    PORT=5000
    ```

2.  **Install Dependencies and Run the Server:**
    -   Open a terminal in the `backend` directory.
    -   Run `npm install` to install the dependencies.
    -   Run `npm start` to start the server. You should see "MongoDB Connected..." and "Server started on port 5000" in the console.

## 4. Using Postman to Test the API

You can use Postman to test the API endpoints.

-   **Register a new user:**
    -   **Method:** POST
    -   **URL:** `http://localhost:5000/api/users/register`
    -   **Body:** (select `raw` and `JSON`)
        ```json
        {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@example.com",
            "password": "password123"
        }
        ```

-   **Login a user:**
    -   **Method:** POST
    -   **URL:** `http://localhost:5000/api/users/login`
    -   **Body:** (select `raw` and `JSON`)
        ```json
        {
            "email": "john.doe@example.com",
            "password": "password123"
        }
        ```
    -   This will return a `token`. Copy this token for the next requests.

-   **Get all grievances:**
    -   **Method:** GET
    -   **URL:** `http://localhost:5000/api/grievances`

-   **Create a new grievance:**
    -   **Method:** POST
    -   **URL:** `http://localhost:5000/api/grievances`
    -   **Headers:**
        -   `x-auth-token`: `your_jwt_token` (paste the token you got from the login response)
    -   **Body:** (select `raw` and `JSON`)
        ```json
        {
            "title": "Pothole on Main Street",
            "description": "There is a large pothole on Main Street that is causing damage to vehicles.",
            "category": "Roads & Infrastructure",
            "aiPriority": "Medium",
            "submitterUserId": "the_user_id_from_the_login_response"
        }
        ```
