# 🛠 IMS Backend (Inventory / Admin Management System)       

Backend API for the Inventory Management System (IMS).  
This project provides RESTful APIs for authentication, inventory management, file uploads, and payment integration.

---

## 🚀 Features

- ⚡ Node.js & Express server
- 🔒 JWT Authentication
- 🗃️ MongoDB with Mongoose
- 📤 File Upload (Multer + Cloudinary)
- 💳 Stripe Payment Integration (Config Ready)
- 🌐 CORS Enabled
- 📦 CSV & XLSX File Parsing Support
- 🔁 Nodemon for development

---

## 🧰 Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT (jsonwebtoken)
- dotenv
- Multer
- Cloudinary
- Stripe
- CORS

---

## 📂 Project Structure

```
ims-backend-main/
│
├── public/                  # Public assets
├── src/                     # Main source code
├── cloudinaryConfig.js      # Cloudinary configuration
├── multerConfig.js          # Multer configuration
├── inventories.json         # Sample inventory data
├── vercel.json              # Deployment config
├── package.json
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/umairkodv/ims-backend-main.git
cd ims-backend-main
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Create Environment Variables

Create a `.env` file in the root directory and add:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

STRIPE_SECRET_KEY=your_stripe_secret_key
```

### 4️⃣ Run the Server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Server will run on:

```
http://localhost:5000
```

---

## 🔗 API Endpoints (Example)

### 🔐 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user & return JWT |

### 📦 Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/items | Get all items |
| POST | /api/items | Create new item |
| PUT | /api/items/:id | Update item |
| DELETE | /api/items/:id | Delete item |

---

## 🧪 Testing

You can test the API using:

- Postman
- Insomnia
- Thunder Client (VS Code)

For protected routes, include:

```
Authorization: Bearer <your_token>
```

---

## 🚀 Deployment

This backend can be deployed on:

- Vercel
- Render
- Railway
- Heroku

Make sure environment variables are configured on your deployment platform.

---

## 🤝 Contributing

1. Fork the repository  
2. Create a feature branch  
3. Commit your changes  
4. Push to your branch  
5. Open a Pull Request  

---

## 📜 License

This project is open-source. You may add an MIT License if required.

---

## 👨‍💻 Author

Developed by Umair Zubair 
GitHub: https://github.com/umairkodv
