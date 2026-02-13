import jwt from 'jsonwebtoken';
import { Auth } from '../models/auth.model.js';

// JWT Secret Key
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "your_ACCESS_TOKEN_SECRET_key";

// Register User
export const register = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        let user = await Auth.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }
        user = await Auth.create({ name, email, password });

        const token = jwt.sign({ id: user._id }, ACCESS_TOKEN_SECRET, { expiresIn: '7d' });

        res.status(201).json({ token });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await Auth.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const token = jwt.sign({ id: user._id }, ACCESS_TOKEN_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};