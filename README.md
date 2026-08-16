# ✨ Full Stack Realtime Chat App

A modern **full-stack real-time chat application** built using React, Node.js, Express.js, MongoDB, and Socket.IO. The application provides secure authentication, instant messaging, online/offline user status, file sharing, profile management, themes, and real-time communication.

---

## 🚀 Features

* 💬 **Real-time messaging** using Socket.IO
* 🟢 **Online/Offline user status**
* 📎 **File sharing** including images, PDFs, and documents
* 🔐 **User authentication** with Login and Signup
* 👤 **User profile management**
* 🎨 **Modern UI with theme support**
* ⚡ **Fast and responsive interface**
* 🗄️ **MongoDB database** for storing users and messages
* ☁️ **Cloudinary integration** for file and image uploads
* 🔄 **Real-time communication** between connected users
* 📱 **Responsive user interface**

---

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* Zustand
* Tailwind CSS
* Axios
* Socket.IO Client

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* Socket.IO
* JWT Authentication
* Cloudinary

---

## 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │       User          │
                    │   Web Browser       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Frontend       │
                    │ React + Vite        │
                    │ Zustand + Tailwind  │
                    └──────────┬──────────┘
                               │
                     HTTP / Socket.IO
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Backend       │
                    │ Node.js + Express    │
                    │ Socket.IO            │
                    └──────┬─────────┬────┘
                           │         │
              ┌────────────┘         └─────────────┐
              ▼                                    ▼
    ┌──────────────────┐                  ┌──────────────────┐
    │     MongoDB      │                  │    Cloudinary    │
    │ Users & Messages │                  │ Files & Images   │
    └──────────────────┘                  └──────────────────┘
```

---

## 📂 Project Structure

```text
fullstack-real-time-chat-app/
│
├── backend/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── package-lock.json
│
├── screen_shots/
│   ├── chatting.jpeg
│   ├── ledger.png
│   ├── login_page.png
│   ├── profile.png
│   └── signup_page.png
│
├── .gitignore
├── LICENSE
├── README.md
├── package.json
└── package-lock.json
```

---

## ⚙️ Installation

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/sagarkukkugol/fullstack-real-time-chat-app.git
```

Navigate into the project:

```bash
cd fullstack-real-time-chat-app
```

---

## 🔧 Backend Setup

Open a terminal and navigate to the backend:

```bash
cd backend
```

Install the required dependencies:

```bash
npm install
```

Create a `.env` file inside the `backend` folder.

Add the following environment variables:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Start the backend development server:

```bash
npm run dev
```

The backend will run on the configured server port, for example:

```text
http://localhost:5000
```

---

## 🎨 Frontend Setup

Open another terminal.

Navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Vite will provide a local development URL, usually:

```text
http://localhost:5173
```

Open the URL in your browser.

---

## 🔐 Environment Variables

For security, environment variables must not be committed to GitHub.

The backend `.env` file contains sensitive configuration such as:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Make sure `.env` is included in `.gitignore`.

---

## 🗄️ Database

The application uses **MongoDB with Mongoose**.

MongoDB stores application data such as:

* User accounts
* User profiles
* Authentication-related information
* Messages
* Conversations
* Online/offline status

Mongoose is used to define schemas and communicate with MongoDB from the Node.js backend.

---

## ⚡ Real-Time Communication

The application uses **Socket.IO** to provide real-time communication.

When a user sends a message:

```text
User A
   │
   ▼
React Frontend
   │
   ▼
Socket.IO
   │
   ▼
Node.js Backend
   │
   ├──► MongoDB
   │
   └──► Socket.IO
          │
          ▼
       User B
```

This allows messages and user-status changes to appear without manually refreshing the page.

---

## ☁️ File Uploads

The application uses **Cloudinary** for storing uploaded files and images.

The basic flow is:

```text
User selects file
       │
       ▼
React Frontend
       │
       ▼
Node.js / Express Backend
       │
       ▼
Cloudinary
       │
       ▼
File URL
       │
       ▼
MongoDB / Message
```

This avoids storing large files directly inside the application server.

---

# 📸 Screenshots

## 🔐 Login Page

![Login Page](screen_shots/login_page.png)

---

## 📝 Signup Page

![Signup Page](screen_shots/signup_page.png)

---

## 💬 Chatting Interface

![Chatting Interface](screen_shots/chatting.jpeg)

---

## 👤 Profile Page

![Profile Page](screen_shots/profile.png)

---

## 🔗 Ledger / Communication Interface

![Ledger](screen_shots/ledger.png)

---

## 🧪 Running the Project

You need **two terminals** during local development.

### Terminal 1 — Backend

```bash
cd backend
npm install
npm run dev
```

### Terminal 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open the frontend URL provided by Vite.

---

## 🔒 Security

The project uses:

* JWT-based authentication
* Environment variables for sensitive credentials
* Password protection/hashing
* Protected backend routes
* `.gitignore` for sensitive files

**Never upload your `.env` file or API credentials to GitHub.**

---

## 🚀 Future Improvements

The following features can be added in future versions:

* 👥 Group conversations
* 📞 Voice calling
* 🎥 Video calling
* 😀 Message reactions
* 🔔 Push notifications
* 📨 Message read receipts
* 🔎 Advanced message search
* 📱 Improved mobile experience
* 🤖 AI-powered communication assistance

---

## 👨‍💻 Author

**Sagar Sanju Kukkugol**

Full Stack Developer | React | Node.js | MongoDB | Socket.IO

---

## 📄 License

This project is licensed under the **MIT License**.

See the `LICENSE` file for more information.
