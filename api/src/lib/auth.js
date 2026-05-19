import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";

export const auth = betterAuth({
    database: mongodbAdapter(mongoose.connection.db), 
    emailAndPassword: {  
        enabled: true 
    },
    trustedOrigins: [
        "http://localhost:5173" // Trust your React Vite frontend
    ],
});