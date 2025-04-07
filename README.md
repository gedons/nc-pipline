 **Backend Repository (`chatterbox-api`)**

### 📄 **README.md** (Backend)
```md
# Chat App Backend 🛠️💬

A scalable backend for a real-time chat application, built with Node.js, Express, and MongoDB. Supports user authentication, messaging, WebRTC-based voice calls, and WebSocket-based real-time updates.

## 🚀 Features
- 🔐 **JWT Authentication** (Register/Login)
- 💬 **Real-time Messaging** (Socket.io)
- 🎙️ **WebRTC Voice Calls**
- 📦 **MongoDB Database** for user & chat storage
- 🚀 **REST API for Chat, Users & Calls**
- 🔔 **Notification System for Incoming Calls & Messages**

## 🛠️ Tech Stack
- **Node.js**
- **Express.js**
- **MongoDB (Mongoose)**
- **Socket.io**
- **WebRTC**
- **JWT Authentication**

## 📦 Installation
1. **Clone the repository**  
    ```sh
    git clone https://github.com/gedons/realtimechat-api.git
    cd chat-app-backend
    ```

2. **Install dependencies**  
    ```sh
    npm install
    ```

3. **Set up environment variables**  
    Create a `.env` file in the root directory and add the following:
    ```env
    PORT=5000
    MONGO_URI=your_mongodb_uri
    JWT_SECRET=your_jwt_secret
    HF_API_KEY=
    REDIS_URL=
    PASSPHRASE=
    CLOUDINARY_API_SECRET=
    CLOUDINARY_API_KEY=
    CLOUDINARY_CLOUD_NAME=
    ```

4. **Start the server**  
    ```sh
    npm start
    ```

## 📄 API Documentation
Detailed API documentation can be found [here](link_to_api_documentation).

## 🤝 Contributing
Contributions are welcome! Please read the [contributing guidelines](link_to_contributing_guidelines) first.

## 📄 License
This project is licensed under the MIT License. See the [LICENSE](link_to_license) file for details.
```
